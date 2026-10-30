import type { AiConfig } from "./config";
import { TOOL_SPECS } from "@/lib/agent/tools";
import type { PlanRequest } from "@/lib/agent/types";

const MAX_JD = 2000;
const MAX_OBSERVATIONS = 8;
const MAX_OBSERVATION_CHARS = 160;
const MAX_INSTRUCTION = 200;
const MAX_SKILLS = 20;

const TOOL_MENU = Object.entries(TOOL_SPECS)
  .map(
    ([id, spec]) =>
      `- ${id}（${spec.title}${spec.requiresAi ? "，需要模型" : "，本地计算"}）：${spec.description}`,
  )
  .join("\n");

const SYSTEM_PROMPT = `你是「简历工坊」求职准备 Agent 的规划器。你的任务是根据求职者的简历摘要、目标岗位 JD、已完成的观察，决定接下来还要做哪几步。

可用工具：
${TOOL_MENU}

输出要求：只输出一个 JSON 对象，不要解释、不要 Markdown 围栏。
{"steps":[{"tool":"工具名","rationale":"一句话理由"}],"note":"可选备注"}

规则：
1. steps 长度 0-5；
2. tool 必须来自上面的工具列表，禁止编造；
3. 同一个工具最多出现一次；
4. 顺序要合理：先分析岗位、再诊断差距，最后才改写与写信；
5. 如果「已完成」显示需要的都已经做完，就返回空数组；
6. rationale 不超过 40 字，说明为什么这一步值得做；
7. note 不超过 60 字，可以留空。`;

function clamp(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function buildPlanRequest(input: PlanRequest): PlanRequest {
  return {
    role: clamp(input.role.trim(), 60),
    years: clamp(input.years.trim(), 30),
    skills: input.skills.slice(0, MAX_SKILLS).map((skill) => clamp(skill, 30)),
    summary: clamp(input.summary.trim(), 400),
    profile: clamp(input.profile.trim(), 60),
    jd: clamp(input.jd.trim(), MAX_JD),
    observations: input.observations
      .slice(0, MAX_OBSERVATIONS)
      .map((item) => clamp(item.trim(), MAX_OBSERVATION_CHARS)),
    instruction: clamp(input.instruction.trim(), MAX_INSTRUCTION),
  };
}

export function buildPlanPayload(config: AiConfig, input: PlanRequest) {
  const sections = [
    `目标岗位：${input.role || "未填写"}${input.profile ? `（画像：${input.profile}）` : ""}`,
    `经验：${input.years || "未填写"}`,
    `技能：${input.skills.length > 0 ? input.skills.join("、") : "未填写"}`,
    `简介：${input.summary || "（空）"}`,
    "",
    "岗位 JD：",
    input.jd,
    "",
    `已完成：${input.observations.length > 0 ? input.observations.map((item) => `\n- ${item}`).join("") : "（还没有执行任何步骤）"}`,
  ];

  if (input.instruction) {
    sections.push("", `求职者的追加要求：${input.instruction}`);
  }

  return {
    model: config.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: sections.join("\n") },
    ],
    temperature: 0.2,
    max_tokens: 500,
    stream: false,
    response_format: { type: "json_object" },
  };
}
