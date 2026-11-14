import { connection } from "next/server";
import type { NextRequest } from "next/server";
import { getAiConfig } from "@/lib/ai/config";
import {
  clientIp,
  isSameOriginRequest,
  jsonError,
  takeRateLimit,
} from "@/lib/ai/http";

/**
 * 只读环境变量，不调用上游、不产生费用。
 *
 * `?probe=1` 会额外打一次最小请求（max_tokens=1），用来在部署后确认
 * 「Key 能不能真的调通」——只返回上游状态码，不回显 baseUrl 或上游错误原文，
 * 且与生成接口一样走同源校验和限流，避免被当成免费探活入口刷额度。
 */
export async function GET(request: NextRequest) {
  await connection();

  if (!isSameOriginRequest(request)) {
    return jsonError(403, "forbidden", "请求来源不受信任");
  }

  const config = getAiConfig();
  const configured = Boolean(config.apiKey);
  const probe = request.nextUrl.searchParams.get("probe");

  if (!configured || probe !== "1") {
    return Response.json(
      { configured, model: config.model },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!takeRateLimit(clientIp(request))) {
    return jsonError(429, "rate_limited", "请求过于频繁，请稍后再试");
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

    // 只回状态码：上游错误正文可能含内部地址或账号信息，不往外抛。
    return Response.json(
      {
        configured,
        model: config.model,
        probe: { ok: response.ok, status: response.status },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        configured,
        model: config.model,
        probe: { ok: false, status: 0 },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timer);
  }
}
