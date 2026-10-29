import type { NextRequest } from "next/server";
import { getAiConfig } from "@/lib/ai/config";
import {
  createUpstreamSignal,
  isTimeout,
  openUpstream,
  parseSseStream,
  UpstreamError,
} from "@/lib/ai/deepseek";
import {
  buildFullResumePayload,
  FULL_RESUME_BRIEF_MAX,
} from "@/lib/ai/fullResume";
import {
  clientIp,
  jsonByteLength,
  jsonError,
  MAX_BODY_BYTES,
  sse,
  takeRateLimit,
} from "@/lib/ai/http";
import {
  AI_LANGUAGES,
  AI_TONES,
  type AiErrorCode,
  type AiFullResumeRequest,
  type AiUsage,
} from "@/lib/ai/types";

export const maxDuration = 60;

const LIMITS = {
  jd: 4000,
  role: 80,
  years: 20,
} as const;

class RequestError extends Error {
  status: number;
  code: AiErrorCode;

  constructor(status: number, code: AiErrorCode, message: string) {
    super(message);
    this.name = "RequestError";
    this.status = status;
    this.code = code;
  }
}

export async function POST(request: NextRequest) {
  const config = getAiConfig();
  if (!config.apiKey) {
    return jsonError(503, "missing_api_key", "未配置 DEEPSEEK_API_KEY");
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonError(413, "payload_too_large", "请求内容过大");
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return jsonError(400, "invalid_request", "无法读取请求内容");
  }

  if (jsonByteLength(raw) > MAX_BODY_BYTES) {
    return jsonError(413, "payload_too_large", "请求内容过大");
  }

  let input: AiFullResumeRequest;
  try {
    input = parseFullResumeRequest(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError(400, "invalid_request", "请求格式错误");
    }
    if (error instanceof RequestError) {
      return jsonError(error.status, error.code, error.message);
    }
    throw error;
  }

  if (!takeRateLimit(clientIp(request))) {
    return jsonError(429, "rate_limited", "请求过于频繁，请稍后再试");
  }

  const signal = createUpstreamSignal(request.signal);
  const startedAt = Date.now();

  let upstream: Response;
  try {
    upstream = await openUpstream(
      config,
      buildFullResumePayload(config.model, input),
      signal,
    );
  } catch (error) {
    if (isTimeout(signal)) {
      return jsonError(504, "timeout", "AI 服务响应超时，请重试");
    }
    if (error instanceof UpstreamError) {
      if (error.status === 429) {
        return jsonError(429, "rate_limited", "AI 服务繁忙，请稍后再试");
      }
      return jsonError(502, "upstream_error", "AI 服务暂时不可用，请稍后再试");
    }
    return jsonError(502, "upstream_error", "无法连接 AI 服务，请稍后再试");
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let usage: AiUsage | undefined;
      let failed = false;

      try {
        for await (const event of parseSseStream(upstream.body, signal)) {
          if (event.type === "text") {
            controller.enqueue(sse("delta", { text: event.text }));
          } else {
            usage = event.usage;
          }
        }
        controller.enqueue(sse("done", usage ? { usage } : {}));
      } catch {
        failed = true;
        const timedOut = isTimeout(signal);
        try {
          controller.enqueue(
            sse("error", {
              code: timedOut ? "timeout" : "upstream_error",
              message: timedOut ? "生成超时，请重试" : "生成中断，请重试",
            }),
          );
        } catch {
          // 客户端已断开，忽略。
        }
      } finally {
        try {
          controller.close();
        } catch {
          // 已关闭。
        }
        console.log(
          "[ai] full",
          JSON.stringify({
            status: failed ? 502 : 200,
            ms: Date.now() - startedAt,
            prompt_tokens: usage?.prompt_tokens ?? 0,
            completion_tokens: usage?.completion_tokens ?? 0,
          }),
        );
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function parseFullResumeRequest(body: unknown): AiFullResumeRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new RequestError(400, "invalid_request", "请求格式错误");
  }

  const input = body as Record<string, unknown>;

  const brief = readString(input.brief).trim();
  if (!brief) {
    throw new RequestError(400, "invalid_request", "请先填写个人经历自述");
  }
  if (brief.length > FULL_RESUME_BRIEF_MAX) {
    throw new RequestError(
      400,
      "invalid_request",
      `个人经历自述最多 ${FULL_RESUME_BRIEF_MAX} 字`,
    );
  }

  const jd = readString(input.jd).trim();
  if (jd.length > LIMITS.jd) {
    throw new RequestError(400, "invalid_request", "参考 JD 最多 4000 字");
  }

  const role = readString(input.role).trim();
  if (role.length > LIMITS.role) {
    throw new RequestError(400, "invalid_request", "目标岗位最多 80 字");
  }

  const years = readString(input.years).trim();
  if (years.length > LIMITS.years) {
    throw new RequestError(400, "invalid_request", "工作年限最多 20 字");
  }

  const tone = input.tone ?? "professional";
  if (
    typeof tone !== "string" ||
    !(AI_TONES as readonly string[]).includes(tone)
  ) {
    throw new RequestError(400, "invalid_request", "tone 无效");
  }

  const language = input.language ?? "zh";
  if (
    typeof language !== "string" ||
    !(AI_LANGUAGES as readonly string[]).includes(language)
  ) {
    throw new RequestError(400, "invalid_request", "language 无效");
  }

  return {
    brief,
    role,
    years,
    jd: jd || undefined,
    tone: tone as AiFullResumeRequest["tone"],
    language: language as AiFullResumeRequest["language"],
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
