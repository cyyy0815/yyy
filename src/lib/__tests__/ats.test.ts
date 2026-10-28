import { describe, expect, it } from "vitest";
import {
  analyzeAtsCoverage,
  resumeToMarkdown,
  resumeToPlainText,
} from "../ats";
import { createEmptyResume, type Resume } from "../types";

function buildResume(): Resume {
  const resume = createEmptyResume();
  resume.basic = {
    ...resume.basic,
    name: "林一",
    headline: "前端工程师",
    email: "lin@example.com",
    phone: "13800138000",
    city: "上海",
    website: "https://lin.dev",
    github: "https://github.com/lin",
    summary: "5 年前端经验，负责 React 项目。",
  };
  resume.intent = {
    ...resume.intent,
    targetRole: "前端工程师",
    targetCity: "上海",
    salaryMin: "20",
    salaryMax: "30",
    experience: "3-5年",
  };
  resume.educations = [
    {
      id: "edu-1",
      school: "某大学",
      major: "计算机科学",
      degree: "本科",
      start: "2018",
      end: "2022",
      gpa: "3.8",
      ranking: "前 10%",
      courses: "数据结构、操作系统",
      honors: "一等奖学金",
    },
  ];
  resume.experiences = [
    {
      id: "exp-1",
      company: "某公司",
      role: "前端工程师",
      start: "2022",
      end: "至今",
      description: "负责 React 与 TypeScript 开发\n首屏性能优化 30%",
    },
  ];
  resume.projects = [
    {
      id: "proj-1",
      name: "开源项目",
      role: "作者",
      start: "2023",
      end: "2024",
      description: "使用 Vite 构建",
      link: "https://github.com/example/project",
    },
  ];
  resume.skills = ["React", "TypeScript", "Docker"];
  resume.skillGroups = ["前端"];
  resume.skillMeta = {
    React: { level: "精通", group: "前端" },
    TypeScript: { level: "熟练", group: "前端" },
    Docker: { level: "熟练", group: "" },
  };
  resume.customSections = [
    {
      id: "cert",
      title: "证书",
      visible: true,
      items: [
        {
          id: "cet",
          title: "CET-6",
          subtitle: "教育部",
          date: "2021",
          description: "",
          link: "",
        },
      ],
    },
    {
      id: "hidden",
      title: "隐藏板块",
      visible: false,
      items: [
        {
          id: "hidden-item",
          title: "不该出现",
          subtitle: "",
          date: "",
          description: "",
          link: "",
        },
      ],
    },
  ];
  return resume;
}

describe("resumeToPlainText", () => {
  it("按线性结构导出联系信息、各板块与分组技能", () => {
    const text = resumeToPlainText(buildResume());

    expect(text.startsWith("林一\n前端工程师\n")).toBe(true);
    expect(text).toContain(
      "lin@example.com · 13800138000 · 上海\nhttps://lin.dev · https://github.com/lin",
    );
    expect(text).toContain(
      "求职意向\n目标岗位：前端工程师\n期望城市：上海\n期望薪资：20–30K\n工作类型：全职\n工作年限：3-5年",
    );
    expect(text).toContain("个人简介\n5 年前端经验，负责 React 项目。");
    expect(text).toContain(
      "教育经历\n某大学 | 计算机科学 | 本科 | 2018 – 2022\nGPA：3.8\n排名：前 10%\n主修课程：数据结构、操作系统\n荣誉：一等奖学金",
    );
    expect(text).toContain(
      "工作经历\n某公司 | 前端工程师 | 2022 – 至今\n- 负责 React 与 TypeScript 开发\n- 首屏性能优化 30%",
    );
    expect(text).toContain(
      "项目经历\n开源项目 | 作者 | 2023 – 2024\n链接：https://github.com/example/project\n使用 Vite 构建",
    );
    expect(text).toContain("证书\nCET-6 | 教育部 | 2021");
    expect(text).toContain("技能\n前端：React、TypeScript\n其他：Docker");
    expect(text).not.toContain("隐藏板块");
    expect(text).not.toContain("React（精通）");
    expect(text.endsWith("\n")).toBe(true);
  });

  it("空简历不输出空板块", () => {
    const text = resumeToPlainText(createEmptyResume());
    expect(text).toContain("简历");
    expect(text).not.toContain("工作经历");
    expect(text).not.toContain("undefined");
  });

  it("隐藏的板块不会出现在 ATS 文本中", () => {
    const resume = buildResume();
    resume.layout = {
      ...resume.layout,
      hidden: ["summary", "experience", "skills", "custom"],
    };
    const text = resumeToPlainText(resume);

    expect(text).not.toContain("个人简介");
    expect(text).not.toContain("工作经历");
    expect(text).not.toContain("某公司");
    expect(text).not.toContain("技能");
    expect(text).not.toContain("证书");
    expect(text).toContain("教育经历");
  });
});

describe("resumeToMarkdown", () => {
  it("使用标准标题层级并保留条目详情", () => {
    const markdown = resumeToMarkdown(buildResume());

    expect(markdown.startsWith("# 林一\n前端工程师")).toBe(true);
    expect(markdown).toContain("## 工作经历\n\n### 某公司 | 前端工程师 | 2022 – 至今");
    expect(markdown).toContain("## 项目经历");
    expect(markdown).toContain("## 技能");
  });

  it("没有内容的板块不会生成标题", () => {
    const resume = createEmptyResume();
    resume.basic.name = "林一";
    resume.experiences = [
      {
        id: "exp-1",
        company: "某公司",
        role: "前端工程师",
        start: "2022",
        end: "至今",
        description: "负责前端开发",
      },
    ];
    const markdown = resumeToMarkdown(resume);

    expect(markdown).toContain("## 工作经历");
    expect(markdown).not.toContain("## 教育经历");
    expect(markdown).not.toContain("## 技能");
  });
});

describe("analyzeAtsCoverage", () => {
  it("统计导出文本中的 JD 关键词覆盖与缺口", () => {
    const text = resumeToPlainText(buildResume());
    const coverage = analyzeAtsCoverage(
      text,
      "熟悉 React、TypeScript，了解 Docker 与 Kubernetes",
    );

    expect(coverage.total).toBe(4);
    expect(coverage.score).toBe(75);
    expect(coverage.matched).toEqual(
      expect.arrayContaining(["React", "TypeScript", "Docker"]),
    );
    expect(coverage.missing).toEqual(["Kubernetes"]);
  });

  it("空 JD 或没有识别到关键词时返回零分", () => {
    const text = resumeToPlainText(buildResume());
    expect(analyzeAtsCoverage(text, "")).toEqual({
      total: 0,
      matched: [],
      missing: [],
      score: 0,
    });
    expect(analyzeAtsCoverage(text, "这是一段没有技能词的说明").total).toBe(0);
  });
});
