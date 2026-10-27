const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-flash";

export type AiConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

/** 只在服务端调用；Key 不进入客户端 bundle。 */
export function getAiConfig(): AiConfig {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY?.trim() ?? "",
    model: process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL,
    baseUrl: (process.env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(
      /\/+$/,
      "",
    ),
  };
}
