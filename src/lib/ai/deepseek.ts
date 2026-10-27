import type { AiUsage } from "./types";
import type { AiConfig } from "./config";

const TIMEOUT_MS = 60_000;

export type UpstreamEvent =
  | { type: "text"; text: string }
  | { type: "usage"; usage: AiUsage };

type UpstreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null;
      /** 思考型模型的推理内容：忽略，不展示、不写入简历。 */
      reasoning_content?: string | null;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  } | null;
};

export class UpstreamError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

export function createUpstreamSignal(clientSignal: AbortSignal) {
  return AbortSignal.any([clientSignal, AbortSignal.timeout(TIMEOUT_MS)]);
}

export function isTimeout(signal: AbortSignal): boolean {
  return (
    signal.aborted &&
    (signal.reason as { name?: string } | undefined)?.name === "TimeoutError"
  );
}

/**
 * 打开上游 SSE。仅在首个 token 之前对 429 / 5xx 重试一次，避免重复计费。
 */
export async function openUpstream(
  config: AiConfig,
  payload: unknown,
  signal: AbortSignal,
): Promise<Response> {
  const url = `${config.baseUrl}/chat/completions`;
  let lastError: UpstreamError | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (response.ok) return response;

    const detail = await readErrorDetail(response);
    lastError = new UpstreamError(response.status, detail);

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === 1) throw lastError;

    await delay(600, signal);
  }

  throw lastError ?? new UpstreamError(502, "upstream_error");
}

/** 上游 SSE -> 文本 / usage 事件；忽略 reasoning_content 与空 choices。 */
export async function* parseSseStream(
  body: ReadableStream<Uint8Array> | null,
  signal: AbortSignal,
): AsyncGenerator<UpstreamEvent> {
  if (!body) throw new UpstreamError(502, "empty_upstream_body");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const delimiter = /\r?\n\r?\n/;
  let buffer = "";

  try {
    while (true) {
      if (signal.aborted) throw signal.reason;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let match = delimiter.exec(buffer);
      while (match) {
        const block = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);

        for (const event of parseEventBlock(block)) {
          if (event === "done") return;
          yield event;
        }

        match = delimiter.exec(buffer);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseEventBlock(block: string): Array<UpstreamEvent | "done"> {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
    .trim();

  if (!data) return [];
  if (data === "[DONE]") return ["done"];

  let chunk: UpstreamChunk;
  try {
    chunk = JSON.parse(data) as UpstreamChunk;
  } catch {
    return [];
  }

  const events: Array<UpstreamEvent | "done"> = [];
  const content = chunk.choices?.[0]?.delta?.content;
  if (typeof content === "string" && content.length > 0) {
    events.push({ type: "text", text: content });
  }

  if (chunk.usage) {
    events.push({
      type: "usage",
      usage: {
        prompt_tokens: chunk.usage.prompt_tokens ?? 0,
        completion_tokens: chunk.usage.completion_tokens ?? 0,
      },
    });
  }

  return events;
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    const parsed = JSON.parse(text) as { error?: { message?: string } };
    return (parsed.error?.message ?? text).slice(0, 200);
  } catch {
    return "";
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(signal.reason);
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
}
