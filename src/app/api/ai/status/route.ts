import { connection } from "next/server";
import type { NextRequest } from "next/server";
import { getAiConfig } from "@/lib/ai/config";

/**
 * 只读环境变量，不调用上游、不产生费用。
 *
 * `?probe=1` 会额外打一次最小请求（max_tokens=1），用来在部署后确认
 * 「Key 能不能真的调通」——只返回上游状态码与错误摘要，不含 Key 本身。
 */
export async function GET(request: NextRequest) {
  await connection();

  const config = getAiConfig();
  const configured = Boolean(config.apiKey);
  const probe = request.nextUrl.searchParams.get("probe");

  if (!configured || probe !== "1") {
    return Response.json(
      { configured, model: config.model },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        stream: false,
      }),
      signal: controller.signal,
    });

    const text = await response.text();
    return Response.json(
      {
        configured,
        model: config.model,
        baseUrl: config.baseUrl,
        probe: {
          ok: response.ok,
          status: response.status,
          detail: text.slice(0, 300),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        configured,
        model: config.model,
        baseUrl: config.baseUrl,
        probe: {
          ok: false,
          status: 0,
          detail:
            controller.signal.aborted
              ? "请求上游超时（10s）"
              : error instanceof Error
                ? error.message
                : String(error),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timer);
  }
}
