export const AI_SECTIONS = ["summary", "experience", "project", "cover"] as const;
export type AiSection = (typeof AI_SECTIONS)[number];

export const AI_MODES = ["draft", "polish"] as const;
export type AiMode = (typeof AI_MODES)[number];

export const AI_TONES = ["professional", "concise", "result"] as const;
export type AiTone = (typeof AI_TONES)[number];

/** AI 输出语言，与简历语言共用取值；缺省按中文处理。 */
export const AI_LANGUAGES = ["zh", "en", "bilingual"] as const;
export type AiLanguage = (typeof AI_LANGUAGES)[number];

/**
 * 双语输出时中英文之间的分隔标记。
 * 提示词要求它独占一行，客户端据此把结果拆回中文与英文两个字段。
 */
export const AI_BILINGUAL_MARKER = "===EN===";

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
  /** 输出语言；缺省中文，保持旧客户端兼容。 */
  language?: AiLanguage;
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
  language?: AiLanguage;
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
  | "forbidden"
  | "rate_limited"
  | "upstream_error"
  | "missing_api_key"
  | "timeout";

export type AiStreamEvent =
  | { event: "delta"; data: { text: string } }
  | { event: "done"; data: { usage?: AiUsage } }
  | { event: "error"; data: { code: AiErrorCode; message: string } };
