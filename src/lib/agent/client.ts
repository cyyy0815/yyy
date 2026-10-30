import { parsePlanPayload } from "./planSchema";
import type { PlanPayload, PlanRequest } from "./types";

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 400;

/**
 * 请求模型规划一次。
 *
 * 失败一律返回 null（网络错误、非 2xx、格式不合法），调用方据此回退到本地计划——
 * 规划是「增强」而不是依赖，断网或没 Key 时流程仍然可走。
 *
 * 模型偶尔会输出不合规的 JSON（比如多一句解释），这里重试一次；
 * 已中断（组件卸载）则立刻放弃，不把「用户关掉了」当成失败。
 */
export async function requestPlan(
  input: PlanRequest,
  signal: AbortSignal,
): Promise<PlanPayload | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal,
      });
      if (response.ok) {
        const data = (await response.json()) as unknown;
        // 服务端已校验过一次，这里再过一遍白名单，防止中间层改写响应
        const parsed = parsePlanPayload(JSON.stringify(data));
        if (parsed) return parsed;
      }
    } catch {
      if (signal.aborted) return null;
    }

    if (signal.aborted) return null;
    if (attempt < MAX_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  return null;
}
