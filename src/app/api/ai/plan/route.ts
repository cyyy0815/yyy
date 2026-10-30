import { NextResponse, type NextRequest } from "next/server";
import { getAiConfig } from "@/lib/ai/config";
import { isTimeout } from "@/lib/ai/deepseek";
import {
  clientIp,
  isSameOriginRequest,
  jsonError,
  readJsonBody,
  takeRateLimit,
} from "@/lib/ai/http";
import { buildPlanPayload, buildPlanRequest } from "@/lib/ai/planPrompt";
import { parsePlanPayload } from "@/lib/agent/planSchema";
import type { PlanRequest } from "@/lib/agent/types";

/**
 * 规划接口：让模型决定「接下来做哪几步」，而不是前端写死流程。
 *
 * 与 /api/ai/generate 用同一套守卫（同源、限额、限流），但返回一次性 JSON：
 * 计划很短，不值得走 SSE；模型输出必须过 parsePlanPayload 白名单校验，
 * 校验不过就返回错误，由前端回退到本地计划。
 */
const MAX_JD = 4000;
const MAX_BODY = 16 * 1024;
const TIMEOUT_MS = 20_000;

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseRequest(raw: unknown): PlanRequest | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;

  const skills = Array.isArray(record.skills)
    ? record.skills.filter((item): item is string => typeof item === "string").slice(0, 20)
    : [];
  const observations = Array.isArray(record.observations)
    ? record.observations
        .filter((item): item is string => typeof item === "string")
        .slice(0, 8)
    : [];

  const jd = readString(record.jd);
  if (!jd.trim() || jd.length > MAX_JD) return null;

  return {
    role: readString(record.role),
    years: readString(record.years),
    skills,
    summary: readString(record.summary),
    profile: readString(record.profile),
    jd,
    observations,
    instruction: readString(record.instruction),
  };
}

async function callUpstream(
  config: ReturnType<typeof getAiConfig>,
  payload: unknown,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw new Error(`upstream ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(request: NextRequest) {
  const config = getAiConfig();
  if (!config.apiKey) {
    return jsonError(503, "missing_api_key", "未配置 DEEPSEEK_API_KEY");
  }
  if (!isSameOriginRequest(request)) {
    return jsonError(403, "forbidden", "请求来源不受信任");
  }

  const body = await readJsonBody(request, MAX_BODY);
  if (!body.ok) {
    return body.error === "too_large"
      ? jsonError(413, "payload_too_large", "请求内容过大")
      : jsonError(400, "invalid_request", "无法读取请求内容");
  }

  let parsed: PlanRequest | null = null;
  try {
    parsed = parseRequest(JSON.parse(body.text));
  } catch {
    return jsonError(400, "invalid_request", "请求格式错误");
  }
  if (!parsed) {
    return jsonError(400, "invalid_request", "参数不完整");
  }

  if (!takeRateLimit(clientIp(request))) {
    return jsonError(429, "rate_limited", "请求过于频繁，请稍后再试");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  request.signal.addEventListener("abort", () => controller.abort(), {
    once: true,
  });

  try {
    const input = buildPlanRequest(parsed);
    const content = await callUpstream(
      config,
      buildPlanPayload(config, input),
      controller.signal,
    );
    const plan = parsePlanPayload(content);
    if (!plan) {
      return jsonError(502, "upstream_error", "规划结果格式不正确");
    }
    return NextResponse.json(
      { steps: plan.steps, note: plan.note },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    if (isTimeout(controller.signal)) {
      return jsonError(504, "timeout", "规划超时，请重试");
    }
    return jsonError(502, "upstream_error", "规划失败，请稍后再试");
  } finally {
    clearTimeout(timer);
  }
}
