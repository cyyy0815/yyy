import type {
  AiFullResumeRequest,
  AiGenerateRequest,
  AiUsage,
} from "./types";

type Handlers = {
  onDelta: (text: string) => void;
  onDone: (usage?: AiUsage) => void;
  onError: (code: string, message: string) => void;
};

type StreamPayload = {
  text?: string;
  usage?: AiUsage;
  code?: string;
  message?: string;
};

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "AbortError"
  );
}

/** 读取一个 AI SSE 接口；abort 由调用方通过 signal 控制。 */
async function streamAi(
  path: string,
  input: AiGenerateRequest | AiFullResumeRequest,
  signal: AbortSignal,
  handlers: Handlers,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
  } catch (error) {
    if (!isAbortError(error)) {
      handlers.onError("network_error", "网络异常，请稍后重试");
    }
    return;
  }

  if (!response.ok) {
    let code = "request_failed";
    let message = "生成失败，请稍后重试";
    try {
      const data = (await response.json()) as { code?: string; message?: string };
      if (data.code) code = data.code;
      if (data.message) message = data.message;
    } catch {
      // 保留默认提示。
    }
    handlers.onError(code, message);
    return;
  }

  if (!response.body) {
    handlers.onError("stream_error", "当前浏览器不支持流式响应");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const delimiter = /\r?\n\r?\n/;
  let buffer = "";
  let settled = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let match = delimiter.exec(buffer);
      while (match) {
        const block = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);

        const parsed = parseEventBlock(block);
        if (parsed?.event === "delta") {
          if (parsed.data.text) handlers.onDelta(parsed.data.text);
        } else if (parsed?.event === "done") {
          settled = true;
          handlers.onDone(parsed.data.usage);
          return;
        } else if (parsed?.event === "error") {
          settled = true;
          handlers.onError(
            parsed.data.code ?? "upstream_error",
            parsed.data.message ?? "生成失败，请重试",
          );
          return;
        }

        match = delimiter.exec(buffer);
      }
    }
  } catch (error) {
    if (!isAbortError(error)) {
      handlers.onError("stream_error", "生成中断，请重试");
    }
    return;
  } finally {
    reader.releaseLock();
  }

  if (!settled) {
    handlers.onError("stream_error", "连接中断，请重试");
  }
}

export function streamGenerate(
  input: AiGenerateRequest,
  signal: AbortSignal,
  handlers: Handlers,
): Promise<void> {
  return streamAi("/api/ai/generate", input, signal, handlers);
}

export function streamFullResume(
  input: AiFullResumeRequest,
  signal: AbortSignal,
  handlers: Handlers,
): Promise<void> {
  return streamAi("/api/ai/full", input, signal, handlers);
}

function parseEventBlock(
  block: string,
): { event: string; data: StreamPayload } | null {
  let event = "message";
  const dataLines: string[] = [];

  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) return null;

  const raw = dataLines.join("\n").trim();
  if (!raw) return null;

  try {
    return { event, data: JSON.parse(raw) as StreamPayload };
  } catch {
    return null;
  }
}
