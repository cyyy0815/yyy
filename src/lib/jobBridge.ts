/**
 * 浏览器扩展 → Web 应用的单向桥。
 *
 * 扩展在应用页面注入 content script，用 `window.postMessage` 投递抓到的岗位；
 * 应用只接受同窗口、带正确 source 的消息，并把内容当成纯文本渲染（不走 innerHTML）。
 * 桥只负责排队与通知，弹窗与导入仍由待投清单决定。
 */
import { MAX_LEAD_JD_CHARS, type ParsedJobLead } from "./jobLeads";

export const JOB_BRIDGE_SOURCE = "resume-workshop-extension";
const MAX_COMPANY_CHARS = 100;
const MAX_ROLE_CHARS = 100;

function asText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** 校验并收敛扩展传来的岗位；不合法时返回 null。 */
export function parseBridgeLead(payload: unknown): ParsedJobLead | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const source = payload as Record<string, unknown>;
  const jd = asText(source.jd, MAX_LEAD_JD_CHARS);
  if (!jd) return null;
  return {
    company: asText(source.company, MAX_COMPANY_CHARS),
    role: asText(source.role, MAX_ROLE_CHARS),
    jd,
  };
}

const listeners = new Set<() => void>();
let pending: ParsedJobLead[] = [];
let installed = false;

/** 取走尚未处理的岗位（挂载时调用一次，避免错过页面切换前的消息）。 */
export function takePendingLeads(): ParsedJobLead[] {
  const drained = pending;
  pending = [];
  return drained;
}

/** 有新岗位时通知订阅者；订阅者自己调用 takePendingLeads 取内容。 */
export function subscribeJobBridge(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 安装 window.message 监听（幂等）；返回卸载函数。 */
export function installJobBridge(): () => void {
  if (typeof window === "undefined" || installed) return () => {};
  installed = true;

  const onMessage = (event: MessageEvent) => {
    // 只接受同窗口消息：扩展注入的 content script 与页面共享 window。
    if (event.source !== window) return;
    const data = event.data as
      | { source?: unknown; type?: unknown; payload?: unknown }
      | null;
    if (!data || data.source !== JOB_BRIDGE_SOURCE || data.type !== "lead") return;
    const lead = parseBridgeLead(data.payload);
    if (!lead) return;
    pending.push(lead);
    for (const listener of listeners) listener();
  };

  window.addEventListener("message", onMessage);
  return () => {
    window.removeEventListener("message", onMessage);
    installed = false;
  };
}
