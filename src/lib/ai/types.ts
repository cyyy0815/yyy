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
