import { describe, expect, it } from "vitest";
import {
  buildChatPayload,
  buildSystemPrompt,
  buildUserPrompt,
  cleanAiText,
} from "../ai/prompt";
import { AI_BILINGUAL_MARKER, type AiGenerateRequest } from "../ai/types";

function coverRequest(patch: Partial<AiGenerateRequest> = {}): AiGenerateRequest {
  return {
    section: "cover",
    mode: "draft",
    role: "前端工程师",
    years: "3-5 年",
    keywords: "4 年前端经验，主导中后台重构",
    tone: "professional",
    ...patch,
  };
}

describe("buildSystemPrompt", () => {
  it("求职信使用专属格式与落款规则", () => {
    const prompt = buildSystemPrompt("cover");
    expect(prompt).toContain("写一封正式的中文求职信");
    expect(prompt).toContain("尊敬的招聘负责人");
    expect(prompt).toContain("300–500 字");
    expect(prompt).toContain("此致");
    expect(prompt).toContain("敬礼");
    expect(prompt).toContain("贵公司");
    expect(prompt).toContain("不要写求职者姓名");
    expect(prompt).not.toContain("参考 JD");
  });

  it("带 JD 时追加参考约束并保持编号连续", () => {
    const prompt = buildSystemPrompt("cover", true);
    expect(prompt).toContain("9. 参考 JD");
    expect(prompt).toContain("不得把 JD 中用户未提供的");
  });
});

describe("多语言提示词", () => {
  it("英文模式使用英文规则与英文求职信格式", () => {
    const prompt = buildSystemPrompt("cover", false, "en");
    expect(prompt).toContain("Write a formal cover letter in English");
    expect(prompt).toContain("Dear Hiring Manager");
    expect(prompt).toContain("Sincerely");
    expect(prompt).toContain("natural, professional English");
    expect(prompt).not.toContain("尊敬的招聘负责人");
  });

  it("双语模式要求分隔行并保留两种格式", () => {
    const prompt = buildSystemPrompt("experience", false, "bilingual");
    expect(prompt).toContain(AI_BILINGUAL_MARKER);
    expect(prompt).toContain("中文版与英文版");
    expect(prompt).toContain("10–25 词");
    expect(prompt).toContain("3–5 条要点");
  });

  it("用户提示词与语气按语言本地化", () => {
    const en = buildUserPrompt(coverRequest({ language: "en" }));
    expect(en).toContain("Target role：");
    expect(en).toContain("Materials：");
    expect(en).toContain("Professional and reliable");

    const bilingual = buildUserPrompt(coverRequest({ language: "bilingual" }));
    expect(bilingual).toContain("目标岗位 / Target role：");
    expect(bilingual).toContain("专业稳重 / Professional and reliable");
  });
});

describe("buildUserPrompt", () => {
  it("求职信使用个人素材且不发送现有内容，并过滤联系方式", () => {
    const prompt = buildUserPrompt(
      coverRequest({
        keywords:
          "4 年前端经验，联系 me@example.com / 13800000000 / https://example.com",
        current: "不应发送的现有内容",
        jd: "熟悉 React，投递请发 jobs@example.com",
      }),
    );
    expect(prompt).toContain("个人素材：");
    expect(prompt).toContain("4 年前端经验");
    expect(prompt).not.toContain("现有内容");
    expect(prompt).not.toContain("不应发送的现有内容");
    expect(prompt).not.toContain("模式：");
    expect(prompt).not.toContain("me@example.com");
    expect(prompt).not.toContain("13800000000");
    expect(prompt).not.toContain("example.com");
    expect(prompt).not.toContain("jobs@example.com");
  });
});

describe("buildChatPayload", () => {
  it("求职信使用 1200 token 预算且保持低推理", () => {
    const payload = buildChatPayload("mock-model", coverRequest());
    expect(payload.max_tokens).toBe(1200);
    expect(payload.stream).toBe(true);
    expect(payload.reasoning_effort).toBe("low");
    expect(payload.messages[0].content).toContain("求职信");
    expect(payload.messages[1].content).toContain("个人素材：");
  });
});

describe("cleanAiText", () => {
  it("求职信保留段落空行并去掉代码围栏与标题符号", () => {
    const text =
      "```text\n# 尊敬的招聘负责人：\n\n第一段内容。\n\n\n第二段内容。\n此致\n敬礼\n```";
    expect(cleanAiText(text, "cover")).toBe(
      "尊敬的招聘负责人：\n\n第一段内容。\n\n第二段内容。\n此致\n敬礼",
    );
  });

  it("经历文本仍按行清理列表符号", () => {
    expect(cleanAiText("1. 第一件事\n- 第二件事\n\n第三件事", "experience")).toBe(
      "第一件事\n第二件事\n第三件事",
    );
  });

  it("英文简介按空格合并行，避免单词粘连", () => {
    expect(
      cleanAiText(
        "Frontend engineer with 4 years of experience.\nLed design system work.",
        "summary",
        "en",
      ),
    ).toBe(
      "Frontend engineer with 4 years of experience. Led design system work.",
    );
  });
});
