import { describe, expect, it } from "vitest";
import { parsePlanPayload } from "../agent/planSchema";
import { buildPlanRequest } from "../ai/planPrompt";

describe("parsePlanPayload", () => {
  it("解析合法计划", () => {
    const payload = parsePlanPayload(
      JSON.stringify({
        steps: [
          { tool: "analyze_jd", rationale: "先确认岗位关键词" },
          { tool: "rewrite_summary", rationale: "再改写简介" },
        ],
        note: "两步足够",
      }),
    );
    expect(payload?.steps.map((step) => step.tool)).toEqual([
      "analyze_jd",
      "rewrite_summary",
    ]);
    expect(payload?.note).toBe("两步足够");
  });

  it("能剥掉 ```json 围栏与前后解释", () => {
    const payload = parsePlanPayload(
      '好的，计划如下：\n```json\n{"steps":[{"tool":"cover_letter","rationale":"写信"}]}\n```\n以上。',
    );
    expect(payload?.steps).toHaveLength(1);
    expect(payload?.steps[0].tool).toBe("cover_letter");
  });

  it("丢弃未知工具并去重", () => {
    const payload = parsePlanPayload(
      JSON.stringify({
        steps: [
          { tool: "rm_rf", rationale: "危险" },
          { tool: "analyze_jd", rationale: "a" },
          { tool: "analyze_jd", rationale: "重复" },
        ],
      }),
    );
    expect(payload?.steps.map((step) => step.tool)).toEqual(["analyze_jd"]);
  });

  it("步骤数量超过上限时截断", () => {
    const payload = parsePlanPayload(
      JSON.stringify({
        steps: Array.from({ length: 9 }, (_, index) => ({
          tool: index % 2 === 0 ? "analyze_jd" : "cover_letter",
          rationale: `第 ${index} 步`,
        })),
      }),
    );
    expect(payload?.steps.length).toBeLessThanOrEqual(5);
  });

  it("非法输入返回 null，由调用方回退", () => {
    expect(parsePlanPayload("不是 JSON")).toBeNull();
    expect(parsePlanPayload('{"note":"没有 steps"}')).toBeNull();
    expect(parsePlanPayload("null")).toBeNull();
    expect(parsePlanPayload("[]")).toBeNull();
  });

  it("空计划是合法的（模型认为无需更多步骤）", () => {
    const payload = parsePlanPayload('{"steps":[],"note":"已经足够"}');
    expect(payload?.steps).toEqual([]);
    expect(payload?.note).toBe("已经足够");
  });

  it("理由与备注超长会被截断", () => {
    const payload = parsePlanPayload(
      JSON.stringify({
        steps: [{ tool: "analyze_jd", rationale: "长".repeat(300) }],
        note: "备".repeat(300),
      }),
    );
    expect(payload?.steps[0].rationale.length).toBeLessThanOrEqual(120);
    expect(payload?.note.length).toBeLessThanOrEqual(200);
  });
});

describe("buildPlanRequest", () => {
  it("裁剪超长字段，避免把整份 JD 发出去", () => {
    const input = buildPlanRequest({
      role: "前端",
      years: "3 年",
      skills: Array.from({ length: 40 }, (_, index) => `技能${index}`),
      summary: "简".repeat(2000),
      profile: "前端工程师",
      jd: "岗".repeat(5000),
      observations: Array.from({ length: 20 }, (_, index) => `观察${index}`),
      instruction: "重".repeat(500),
    });

    expect(input.jd.length).toBeLessThanOrEqual(2001);
    expect(input.skills).toHaveLength(20);
    expect(input.summary.length).toBeLessThanOrEqual(401);
    expect(input.observations).toHaveLength(8);
    expect(input.instruction.length).toBeLessThanOrEqual(201);
  });

  it("空 JD 不被裁剪逻辑改坏", () => {
    const input = buildPlanRequest({
      role: "",
      years: "",
      skills: [],
      summary: "",
      profile: "",
      jd: "",
      observations: [],
      instruction: "",
    });
    expect(input.jd).toBe("");
    expect(input.observations).toEqual([]);
  });
});
