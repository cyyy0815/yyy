import { describe, expect, it } from "vitest";
import {
  buildFullResumePayload,
  parseFullResumeOutput,
} from "../ai/fullResume";

const VALID = {
  headline: "前端工程师",
  city: "上海",
  summary: "3 年前端开发经验，主导中后台平台重构。",
  intent: {
    targetRole: "前端工程师",
    targetCity: "上海",
    experience: "3-5 年",
  },
  educations: [
    {
      school: "示例大学",
      major: "计算机科学与技术",
      degree: "本科",
      start: "2017-09",
      end: "2021-06",
      gpa: "3.8",
      ranking: "",
      courses: "数据结构、操作系统",
      honors: "",
    },
  ],
  experiences: [
    {
      company: "星河科技",
      role: "前端工程师",
      start: "2021-07",
      end: "至今",
      description: ["主导中后台平台重构", "首屏加载时间降低 40%"],
    },
  ],
  projects: [
    {
      name: "数据看板",
      role: "前端负责人",
      start: "2022-03",
      end: "2023-06",
      description: "负责图表核心开发\n引入虚拟滚动优化长列表",
      link: "https://example.com/fake",
    },
  ],
  skills: ["React", "TypeScript", "react", "Node.js"],
};

describe("parseFullResumeOutput", () => {
  it("解析带代码围栏的 JSON 并生成完整简历", () => {
    const result = parseFullResumeOutput(
      "```json\n" + JSON.stringify(VALID) + "\n```",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.resume.basic.headline).toBe("前端工程师");
    expect(result.resume.basic.summary).toBe(VALID.summary);
    expect(result.resume.intent.targetRole).toBe("前端工程师");
    expect(result.resume.educations).toHaveLength(1);
    expect(result.resume.educations[0].school).toBe("示例大学");
    expect(result.resume.educations[0].start).toBe("2017.09");
    expect(result.resume.experiences[0].company).toBe("星河科技");
    expect(result.resume.experiences[0].description).toBe(
      "主导中后台平台重构\n首屏加载时间降低 40%",
    );
    expect(result.resume.projects[0].name).toBe("数据看板");
    // 链接不采信模型输出
    expect(result.resume.projects[0].link).toBe("");
    // 技能去重（大小写不敏感）
    expect(result.resume.skills).toEqual([
      "React",
      "TypeScript",
      "Node.js",
    ]);
    expect(result.stats).toMatchObject({
      educations: 1,
      experiences: 1,
      projects: 1,
      skills: 3,
    });
    expect(result.stats.missing).toEqual([]);
  });

  it("忽略联系方式等白名单之外的字段", () => {
    const result = parseFullResumeOutput(
      JSON.stringify({
        ...VALID,
        name: "张三",
        email: "a@b.com",
        phone: "13800138000",
        photo: "data:image/png;base64,xxx",
        basic: { wechat: "abc" },
        skills: [],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resume.basic.name).toBe("");
    expect(result.resume.basic.email).toBe("");
    expect(result.resume.basic.phone).toBe("");
    expect(result.resume.basic.photo).toBe("");
  });

  it("缺失字段留空并记录待补充项", () => {
    const result = parseFullResumeOutput(
      JSON.stringify({
        headline: "",
        summary: "",
        intent: {},
        educations: [{ major: "计算机科学与技术" }],
        experiences: [
          {
            company: "",
            role: "产品经理",
            start: "",
            end: "",
            description: "负责需求分析",
          },
        ],
        projects: [],
        skills: [],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resume.experiences[0].company).toBe("");
    expect(result.resume.intent.targetRole).toBe("");
    expect(result.stats.missing).toEqual(
      expect.arrayContaining([
        "个人简介",
        "学校",
        "公司名称",
        "工作起止时间",
        "技能",
      ]),
    );
  });

  it("过滤空白条目", () => {
    const result = parseFullResumeOutput(
      JSON.stringify({
        educations: [{}, { school: "示例大学" }],
        experiences: [{}, { company: "" }],
        projects: [{ description: "" }],
        skills: "React, TypeScript、Node.js",
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resume.educations).toHaveLength(1);
    expect(result.resume.experiences).toHaveLength(0);
    expect(result.resume.projects).toHaveLength(0);
    expect(result.resume.skills).toEqual(["React", "TypeScript", "Node.js"]);
  });

  it("无法解析时返回错误", () => {
    expect(parseFullResumeOutput("抱歉，我无法生成").ok).toBe(false);
    expect(parseFullResumeOutput("{ not json }").ok).toBe(false);
  });
});

describe("buildFullResumePayload", () => {
  it("要求 JSON 输出并包含自述与 JD", () => {
    const payload = buildFullResumePayload("deepseek-flash", {
      brief: "3 年前端经验",
      role: "前端工程师",
      years: "3-5 年",
      jd: "熟悉 React",
      tone: "professional",
    });

    expect(payload.response_format).toEqual({ type: "json_object" });
    expect(payload.stream).toBe(true);
    const user = payload.messages[1].content;
    expect(user).toContain("3 年前端经验");
    expect(user).toContain("熟悉 React");
    const system = payload.messages[0].content;
    expect(system).toContain("不编造");
    expect(system.toLowerCase()).toContain("json");
    expect(system).toContain("结构化中文简历");
  });

  it("英文整份生成使用英文提示词", () => {
    const payload = buildFullResumePayload("deepseek-flash", {
      brief: "3 years of frontend experience",
      role: "Frontend Engineer",
      years: "3–5 years",
      tone: "professional",
      language: "en",
    });

    expect(payload.max_tokens).toBe(4000);
    const system = payload.messages[0].content;
    expect(system).toContain("structured resume in English");
    expect(system).toContain("Write in natural, professional English");
    expect(payload.messages[1].content).toContain("Target role：");
  });

  it("双语整份生成提高预算并要求 english 覆盖对象", () => {
    const payload = buildFullResumePayload("deepseek-flash", {
      brief: "3 年前端经验",
      role: "前端工程师",
      years: "3-5 年",
      tone: "professional",
      language: "bilingual",
    });

    expect(payload.max_tokens).toBe(6000);
    const system = payload.messages[0].content;
    expect(system).toContain("中英双语结构化简历");
    expect(system).toContain('"english"');
    expect(system).toContain("条目数量与顺序必须一致");
  });
});

describe("多语言整份解析", () => {
  const BILINGUAL = {
    ...VALID,
    skills: ["需求分析", "React"],
    english: {
      headline: "Frontend Engineer",
      city: "Shanghai",
      summary: "Frontend engineer with 3 years of experience.",
      intent: {
        targetRole: "Frontend Engineer",
        targetCity: "Shanghai",
        experience: "3–5 years",
      },
      educations: [
        {
          school: "Example University",
          major: "Computer Science",
          degree: "Bachelor",
          ranking: "Top 10%",
          courses: "Data Structures",
          honors: "",
        },
      ],
      experiences: [
        {
          company: "Xinghe Technology",
          role: "Frontend Engineer",
          description: ["Led the platform refactor", "Cut first paint by 40%"],
        },
      ],
      projects: [
        {
          name: "Data Dashboard",
          role: "Frontend Lead",
          description: "Built the core chart modules",
        },
      ],
      skills: { 需求分析: "Requirements Analysis", React: "React" },
    },
  };

  it("双语解析把 english 对象映射到英文覆盖层", () => {
    const result = parseFullResumeOutput(
      JSON.stringify(BILINGUAL),
      "bilingual",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { resume } = result;
    expect(resume.language).toBe("bilingual");
    expect(resume.basic.summary).toContain("主导中后台平台重构");
    expect(resume.translation.basic.headline).toBe("Frontend Engineer");
    expect(resume.translation.basic.summary).toBe(
      "Frontend engineer with 3 years of experience.",
    );
    expect(resume.translation.intent.experience).toBe("3–5 years");
    expect(
      resume.translation.experiences[resume.experiences[0].id]?.company,
    ).toBe("Xinghe Technology");
    expect(
      resume.translation.experiences[resume.experiences[0].id]?.description,
    ).toBe("Led the platform refactor\nCut first paint by 40%");
    expect(
      resume.translation.projects[resume.projects[0].id]?.name,
    ).toBe("Data Dashboard");
    expect(
      resume.translation.educations[resume.educations[0].id]?.school,
    ).toBe("Example University");
    expect(resume.translation.skills).toEqual({
      需求分析: "Requirements Analysis",
      React: "React",
    });
    // 中文主数据保持不变，仍是匹配与 AI 的事实来源。
    expect(resume.basic.headline).toBe("前端工程师");
    expect(resume.skills).toEqual(["需求分析", "React"]);
  });

  it("缺少 english 对象时回退中文，不报错", () => {
    const result = parseFullResumeOutput(JSON.stringify(VALID), "bilingual");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resume.language).toBe("bilingual");
    expect(result.resume.translation.basic.headline).toBe("");
    expect(result.resume.translation.skills).toEqual({});
  });

  it("英文整份解析把英文内容写入主字段并标记语言", () => {
    const result = parseFullResumeOutput(
      JSON.stringify({
        ...VALID,
        summary: "Frontend engineer.\nLed platform refactors.",
      }),
      "en",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resume.language).toBe("en");
    expect(result.resume.basic.summary).toBe(
      "Frontend engineer. Led platform refactors.",
    );
    expect(result.resume.translation.basic.summary).toBe("");
  });
});
