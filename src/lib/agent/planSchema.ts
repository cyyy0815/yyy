import type { AgentToolId, PlannedStep, PlanPayload } from "./types";

const TOOL_IDS: AgentToolId[] = [
  "analyze_jd",
  "diagnose_gaps",
  "rewrite_summary",
  "cover_letter",
];

const MAX_STEPS = 5;
const MAX_RATIONALE = 120;
const MAX_NOTE = 200;

export function isAgentToolId(value: unknown): value is AgentToolId {
  return typeof value === "string" && TOOL_IDS.includes(value as AgentToolId);
}

/** 去掉模型偶发包裹的 ```json 围栏与前后解释文字。 */
function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

/**
 * 校验模型返回的计划。
 *
 * 这里是「不可信输入」的边界：工具名必须来自白名单、步骤数有上限、
 * 重复步骤会被去重、理由超长截断。任何一条不满足就返回 null，
 * 调用方据此回退到本地计划，而不是把垃圾计划渲染给用户。
 */
export function parsePlanPayload(text: string): PlanPayload | null {
  let raw: unknown;
  try {
    raw = JSON.parse(extractJson(text));
  } catch {
    return null;
  }

  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as { steps?: unknown; note?: unknown };
  if (!Array.isArray(record.steps)) return null;

  const steps: PlannedStep[] = [];
  const seen = new Set<AgentToolId>();

  for (const item of record.steps) {
    if (typeof item !== "object" || item === null) continue;
    const entry = item as { tool?: unknown; rationale?: unknown };
    if (!isAgentToolId(entry.tool)) continue;
    if (seen.has(entry.tool)) continue;
    seen.add(entry.tool);
    const rationale =
      typeof entry.rationale === "string"
        ? entry.rationale.trim().slice(0, MAX_RATIONALE)
        : "";
    steps.push({ tool: entry.tool, rationale });
    if (steps.length >= MAX_STEPS) break;
  }

  const note =
    typeof record.note === "string" ? record.note.trim().slice(0, MAX_NOTE) : "";

  // 空计划是合法的：模型判断没有还需要做的事。
  return { steps, note };
}
