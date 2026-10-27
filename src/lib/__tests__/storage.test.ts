import { describe, expect, it } from "vitest";
import {
  MAX_IMPORT_BYTES,
  normalizeResume,
  parseResumeJSON,
} from "../storage";
import { createEmptyResume } from "../types";

describe("normalizeResume", () => {
  it("非对象输入返回空白简历与默认主题", () => {
    for (const input of [null, undefined, "x", 42, []]) {
      const resume = normalizeResume(input);
      expect(resume.basic.name).toBe("");
      expect(resume.intent.jobType).toBe("全职");
      expect(resume.theme.accent).toBe("#1d4ed8");
      expect(resume.skills).toEqual([]);
    }
  });

  it("收敛字段、丢弃非法条目并补齐 id", () => {
    const resume = normalizeResume({
      basic: {
        name: "林一",
        email: 123,
        photo: "data:image/jpeg;base64,AAAA",
        extra: "ignored",
      },
      intent: { targetRole: "前端工程师" },
      educations: [
        { id: "edu-1", school: "某大学", degree: "本科" },
        { school: 42 },
        "bad",
      ],
      experiences: [
        {
          company: "某公司",
          role: "前端",
          description: "做了很多事",
          pageBreakBefore: true,
        },
        { company: "另一家", pageBreakBefore: "yes" },
      ],
      projects: [{ name: "项目", link: "example.com" }],
      customSections: [
        {
          title: "证书",
          visible: false,
          items: [{ title: "CET-6", subtitle: 1 }, null],
        },
        null,
      ],
      skills: [" React ", "", 42, "TypeScript"],
      theme: { accent: "#BE123C" },
    });

    expect(resume.basic.name).toBe("林一");
    expect(resume.basic.email).toBe("");
    expect(resume.basic.photo).toBe("data:image/jpeg;base64,AAAA");
    expect(resume.intent.targetRole).toBe("前端工程师");
    expect(resume.intent.jobType).toBe("全职");

    expect(resume.educations).toHaveLength(2);
    expect(resume.educations[0]).toMatchObject({
      id: "edu-1",
      school: "某大学",
      degree: "本科",
    });
    expect(resume.educations[1].id).toBeTruthy();
    expect(resume.educations[1].school).toBe("");

    expect(resume.experiences).toHaveLength(2);
    expect(resume.experiences[0].id).toBeTruthy();
    expect(resume.experiences[0].pageBreakBefore).toBe(true);
    expect(resume.experiences[1].pageBreakBefore).toBeUndefined();

    expect(resume.projects).toHaveLength(1);
    expect(resume.projects[0].id).toBeTruthy();
    expect(resume.projects[0].link).toBe("example.com");

    expect(resume.customSections).toHaveLength(1);
    expect(resume.customSections[0]).toMatchObject({
      title: "证书",
      visible: false,
    });
    expect(resume.customSections[0].items).toHaveLength(1);
    expect(resume.customSections[0].items[0].subtitle).toBe("");

    expect(resume.skills).toEqual(["React", "TypeScript"]);
    expect(resume.theme.accent).toBe("#be123c");
  });

  it("拒绝非图片 Data URL 与超长照片", () => {
    const valid = createEmptyResume();
    valid.basic.photo = "data:image/jpeg;base64,AAAA";
    expect(normalizeResume(valid).basic.photo).toBe(valid.basic.photo);

    for (const photo of [
      "https://example.com/a.jpg",
      "data:text/html;base64,AAAA",
      `data:image/jpeg;base64,${"A".repeat(600_001)}`,
    ]) {
      expect(
        normalizeResume({ ...valid, basic: { ...valid.basic, photo } }).basic
          .photo,
      ).toBe("");
    }
  });

  it("缺失 visible 时默认显示，显式 false 才隐藏", () => {
    const resume = normalizeResume({
      customSections: [
        { title: "默认显示", items: [] },
        { title: "显式隐藏", visible: false, items: [] },
      ],
    });
    expect(resume.customSections.map((section) => section.visible)).toEqual([
      true,
      false,
    ]);
  });
});

describe("parseResumeJSON", () => {
  it("接受最小合法结构与合法模板", () => {
    const result = parseResumeJSON(
      JSON.stringify({ basic: { name: "林一" }, template: "classic" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resume.basic.name).toBe("林一");
    expect(result.template).toBe("classic");
  });

  it("忽略未知模板", () => {
    const result = parseResumeJSON(
      JSON.stringify({ basic: { name: "林一" }, template: "unknown" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template).toBeUndefined();
  });

  it.each([
    ["无法解析", "{oops"],
    ["不是对象", "null"],
    ["是数组", "[]"],
    ["缺少 basic", "{}"],
    ["basic 不是对象", '{"basic":"x"}'],
    ["basic 缺少已知字段", '{"basic":{"unknown":1}}'],
    ["教育不是数组", '{"basic":{"name":"x"},"educations":{}}'],
    ["经历包含非对象", '{"basic":{"name":"x"},"experiences":[1]}'],
    ["技能不是数组", '{"basic":{"name":"x"},"skills":"React"}'],
    ["技能包含非文本", '{"basic":{"name":"x"},"skills":["React",1]}'],
    ["主题不是对象", '{"basic":{"name":"x"},"theme":"red"}'],
  ])("拒绝 %s", (_label, text) => {
    expect(parseResumeJSON(text).ok).toBe(false);
  });

  it("拒绝超过 5MB 的文本", () => {
    const result = parseResumeJSON(" ".repeat(MAX_IMPORT_BYTES + 1));
    expect(result).toEqual({
      ok: false,
      error: "文件过大（超过 5 MB），请检查是否选错了文件",
    });
  });
});
