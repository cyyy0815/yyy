import { connection } from "next/server";
import { getAiConfig } from "@/lib/ai/config";

/** 只读环境变量，不调用上游、不产生费用。 */
export async function GET() {
  await connection();

  const { apiKey, model } = getAiConfig();

  return Response.json(
    { configured: Boolean(apiKey), model },
    { headers: { "Cache-Control": "no-store" } },
  );
}
