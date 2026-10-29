import type { NextRequest } from "next/server";
import type { AiErrorCode, AiStreamEvent } from "./types";

export const MAX_BODY_BYTES = 64 * 1024;

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
/** 桶数量上限；超过后先清理过期项，仍然过多时丢弃最早的一批。 */
const RATE_LIMIT_MAX_BUCKETS = 10_000;

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

const encoder = new TextEncoder();

/**
 * 反向代理（Nginx / Vercel / Cloudflare）会把真实客户端追加到 XFF 末尾，
 * 而左侧的值是客户端自己可以伪造的，因此默认只信任最右边那一跳。
 * 多级代理可用 TRUSTED_PROXY_HOPS 调整（CDN + Nginx 两层设为 2）。
 */
function trustedProxyHops(): number {
  const raw = Number(process.env.TRUSTED_PROXY_HOPS);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (hops.length > 0) {
      return hops[Math.max(0, hops.length - trustedProxyHops())];
    }
  }
  return request.headers.get("x-real-ip")?.trim() || "local";
}

/** 限流桶只在内存里，必须自己回收，否则伪造 IP 就能把它撑成内存泄漏。 */
function pruneRateBuckets(now: number): void {
  if (rateBuckets.size < RATE_LIMIT_MAX_BUCKETS) return;

  for (const [key, bucket] of rateBuckets) {
    if (now >= bucket.resetAt) rateBuckets.delete(key);
  }
  if (rateBuckets.size < RATE_LIMIT_MAX_BUCKETS) return;

  // 活跃 IP 太多：丢掉最早插入的一半。宁可短暂放宽，也不让 Map 无界增长。
  const target = Math.floor(RATE_LIMIT_MAX_BUCKETS / 2);
  for (const key of rateBuckets.keys()) {
    if (rateBuckets.size <= target) break;
    rateBuckets.delete(key);
  }
}

export function takeRateLimit(ip: string): boolean {
  const now = Date.now();
  pruneRateBuckets(now);

  const bucket = rateBuckets.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (bucket.count >= RATE_LIMIT_MAX) return false;

  bucket.count += 1;
  return true;
}

/**
 * 只接受同源页面发起的请求。
 *
 * 第三方站点可以用 `fetch(url, { mode: "no-cors", headers: { "Content-Type": "text/plain" } })`
 * 发一个合法 JSON body（服务端不看 Content-Type 也会解析），借用户的 IP 与已配置的 Key
 * 消耗额度。`Sec-Fetch-Site` 命中时直接判掉；没有 `Origin` 的脚本调用（curl / mock）
 * 无法伪造浏览器上下文，仍然交给限流保护。
 */
export function isSameOriginRequest(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (site && site !== "same-origin" && site !== "none") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const host = request.headers.get("host")?.trim();
  if (host && originHost === host) return true;

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  return Boolean(forwardedHost && originHost === forwardedHost);
}

export type BodyReadResult =
  | { ok: true; text: string }
  | { ok: false; error: "too_large" | "unreadable" };

async function cancelBody(request: NextRequest): Promise<void> {
  try {
    await request.body?.cancel();
  } catch {
    // 已经读空或被上游取消：忽略。
  }
}

/**
 * 边读边计数地读取请求体。
 *
 * 不能先用 `request.text()` 读完整段再检查长度：分块传输（没有 Content-Length）
 * 时内存会按请求体大小增长。这里超限立即 `cancel()` 并返回，同时保留
 * Content-Length 的快速拒绝路径。
 */
export async function readJsonBody(
  request: NextRequest,
  maxBytes = MAX_BODY_BYTES,
): Promise<BodyReadResult> {
  const declared = Number(request.headers.get("content-length") ?? NaN);
  if (Number.isFinite(declared) && declared > maxBytes) {
    await cancelBody(request);
    return { ok: false, error: "too_large" };
  }

  const body = request.body;
  if (!body) {
    try {
      const text = await request.text();
      return encoder.encode(text).length > maxBytes
        ? { ok: false, error: "too_large" }
        : { ok: true, text };
    } catch {
      return { ok: false, error: "unreadable" };
    }
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, error: "too_large" };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, text };
  } catch {
    return { ok: false, error: "unreadable" };
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // 取消后锁已被释放。
    }
  }
}

export function jsonByteLength(text: string): number {
  return encoder.encode(text).length;
}

export function jsonError(
  status: number,
  code: AiErrorCode,
  message: string,
) {
  return Response.json(
    { code, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function sse(event: AiStreamEvent["event"], data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
