import type { Resume } from "@/lib/types";

/** Agent 能调用的工具。前三步是本地计算，后两步才需要模型。 */
export type AgentToolId =
  | "analyze_jd"
  | "diagnose_gaps"
  | "rewrite_summary"
  | "cover_letter";

export type AgentStepStatus =
  | "pending"
  | "running"
  | "done"
  | "skipped"
  | "failed";

export type AgentStep = {
  id: AgentToolId;
  title: string;
  /** 为什么这一步值得做——用当前数据算出来的，不是套话。 */
  rationale: string;
  requiresAi: boolean;
};

/** 单个工具的结构化结果。detail 面向用户，可多行。 */
export type AgentStepResult = {
  summary: string;
  detail?: string;
};

/** 执行轨迹：评审最关心的「工具调用记录」。 */
export type AgentTraceEntry = {
  id: AgentToolId;
  title: string;
  status: AgentStepStatus;
  summary: string;
  durationMs: number;
};

export type AgentContext = {
  resume: Resume;
  jd: string;
};
