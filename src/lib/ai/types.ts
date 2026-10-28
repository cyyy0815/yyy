export const AI_SECTIONS = ["summary", "experience", "project"] as const;
export type AiSection = (typeof AI_SECTIONS)[number];

export const AI_MODES = ["draft", "polish"] as const;
export type AiMode = (typeof AI_MODES)[number];

export const AI_TONES = ["professional", "concise", "result"] as const;
export type AiTone = (typeof AI_TONES)[number];

export type AiGenerateRequest = {
  section: AiSection;
  mode: AiMode;
  role: string;
  years: string;
  keywords: string;
  current?: string;
  /** 可选的目标 JD，只用于调整表述重点，不写入简历。 */
  jd?: string;
  tone: AiTone;
};

/**
 * 整份简历生成：用户给一段自述，AI 返回结构化简历 JSON。
 * 不包含姓名、邮箱、电话等联系方式字段，避免把隐私发往上游。
 */
export type AiFullResumeRequest = {
  brief: string;
  role: string;
  years: string;
  jd?: string;
  tone: AiTone;
};

export type AiUsage = {
  prompt_tokens: number;
  completion_tokens: number;
};

export type AiStatus = {
  configured: boolean;
  model: string;
};

export type AiErrorCode =
  | "invalid_request"
  | "payload_too_large"
  | "rate_limited"
  | "upstream_error"
  | "missing_api_key"
  | "timeout";

export type AiStreamEvent =
  | { event: "delta"; data: { text: string } }
  | { event: "done"; data: { usage?: AiUsage } }
  | { event: "error"; data: { code: AiErrorCode; message: string } };
