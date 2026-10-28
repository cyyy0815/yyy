import { describe, expect, it } from "vitest";
import {
  defaultSectionLayout,
  fitSuggestions,
  hasVisibleSection,
  isSectionVisible,
  moveSectionInLayout,
  normalizeSectionLayout,
  orderSections,
  resolveSectionLayout,
  sectionHasContent,
  sectionSummary,
  toggleSectionHidden,
} from "../layout";
import {
  createEmptyResume,
  DEFAULT_SECTION_ORDER,
  type Resume,
} from "../types";

function buildResume(): Resume {
  const resume = createEmptyResume();
  resume.basic.summary = "5 年前端经验";
  resume.intent.targetRole = "前端工程师";
  resume.intent.targetCity = "上海";
  resume.educations = [
    {
      id: "edu-1",
      school: "某大学",
      major: "计算机",
      degree: "本科",
      start: "2018",
      end: "2022",
      gpa: "",
      ranking: "",
      courses: "",
      honors: "",
    },
  ];
  resume.experiences = [
    {
      id: "exp-1",
      company: "某公司",
      role: "前端工程师",
      start: "2022",
      end: "至今",
      description: "负责 React 项目",
    },
  ];
  resume.projects = [
    {
      id: "proj-1",
      name: "开源项目",
      role: "作者",
      start: "2023",
      end: "2024",
      description: "使用 TypeScript",
      link: "",
    },
  ];
  resume.customSections = [
    {
      id: "custom-1",
      title: "证书",
      visible: true,
      items: [
        {
          id: "item-1",
          title: "CET-6",
          subtitle: "",
          date: "2021",
          description: "",
          link: "",
        },
      ],
    },
  ];
  resume.skills = ["React", "TypeScript"];
  return resume;
}

describe("normalizeSectionLayout", () => {
  it("旧数据没有 layout 时使用默认顺序并显示全部板块", () => {
    expect(normalizeSectionLayout(undefined)).toEqual({
      order: DEFAULT_SECTION_ORDER,
      hidden: [],
    });
    expect(defaultSectionLayout()).toEqual({
      order: DEFAULT_SECTION_ORDER,
      hidden: [],
    });
  });

  it("丢弃未知与重复板块，并补齐缺失项", () => {
    const layout = normalizeSectionLayout({
      order: ["skills", "skills", "unknown", "summary"],
      hidden: ["intent", "nope", "intent"],
    });
    expect(layout.order.slice(0, 2)).toEqual(["skills", "summary"]);
    expect(layout.order).toHaveLength(DEFAULT_SECTION_ORDER.length);
    expect(new Set(layout.order)).toEqual(new Set(DEFAULT_SECTION_ORDER));
    expect(layout.hidden).toEqual(["intent"]);
  });

  it("隐藏项按默认顺序稳定输出", () => {
    expect(
      normalizeSectionLayout({ hidden: ["intent", "skills"] }).hidden,
    ).toEqual(["skills", "intent"]);
  });

  it("接受旧简历对象并通过 resolve 补齐默认布局", () => {
    const resume = { ...createEmptyResume(), layout: undefined };
    expect(resolveSectionLayout(resume as unknown as Resume)).toEqual({
      order: DEFAULT_SECTION_ORDER,
      hidden: [],
    });
  });
});

describe("板块排序与显隐", () => {
  it("orderSections 只重排给定的板块", () => {
    const resume = buildResume();
    resume.layout = normalizeSectionLayout({
      order: ["projects", "summary", "experience", "custom"],
    });
    expect(
      orderSections(resume, ["summary", "experience", "projects", "custom"]),
    ).toEqual(["projects", "summary", "experience", "custom"]);
    expect(orderSections(resume, ["education", "skills"])).toEqual([
      "education",
      "skills",
    ]);
  });

  it("内容判断不受隐藏影响，显隐判断同时看内容", () => {
    const resume = buildResume();
    resume.layout = normalizeSectionLayout({ hidden: ["experience"] });
    expect(sectionHasContent(resume, "experience")).toBe(true);
    expect(isSectionVisible(resume, "experience")).toBe(false);
    expect(hasVisibleSection(resume, ["experience", "projects"])).toBe(true);
    expect(isSectionVisible(resume, "intent")).toBe(true);
  });

  it("空内容的板块即使未隐藏也不算可见", () => {
    const resume = createEmptyResume();
    resume.intent.jobType = "全职";
    expect(isSectionVisible(resume, "summary")).toBe(false);
    expect(isSectionVisible(resume, "intent")).toBe(false);
    expect(hasVisibleSection(resume, DEFAULT_SECTION_ORDER)).toBe(false);
  });

  it("自定义板块需要开启且有内容才算可见", () => {
    const resume = buildResume();
    resume.customSections[0].visible = false;
    expect(sectionHasContent(resume, "custom")).toBe(false);
    resume.customSections[0].visible = true;
    resume.customSections[0].items = [];
    expect(sectionHasContent(resume, "custom")).toBe(false);
  });

  it("toggleSectionHidden 可隐藏并恢复，且不重复", () => {
    const layout = defaultSectionLayout();
    const hidden = toggleSectionHidden(layout, "skills");
    expect(hidden.hidden).toEqual(["skills"]);
    const restored = toggleSectionHidden(hidden, "skills");
    expect(restored.hidden).toEqual([]);
    expect(
      toggleSectionHidden(toggleSectionHidden(layout, "intent"), "intent"),
    ).toEqual(layout);
  });

  it("moveSectionInLayout 到边界时保持不变", () => {
    const layout = defaultSectionLayout();
    expect(moveSectionInLayout(layout, "summary", -1)).toBe(layout);
    expect(moveSectionInLayout(layout, "intent", 1)).toBe(layout);
    const moved = moveSectionInLayout(layout, "summary", 1);
    expect(moved.order.slice(0, 2)).toEqual(["experience", "summary"]);
  });
});

describe("一页适配", () => {
  it("建议隐藏求职意向与有内容的自定义板块", () => {
    expect(fitSuggestions(buildResume())).toEqual(["intent", "custom"]);
  });

  it("已隐藏或没有内容的板块不再建议", () => {
    const resume = buildResume();
    resume.layout = normalizeSectionLayout({ hidden: ["intent"] });
    resume.customSections[0].items = [];
    expect(fitSuggestions(resume)).toEqual([]);
    expect(fitSuggestions(createEmptyResume())).toEqual([]);
  });

  it("板块摘要给出可读数量", () => {
    const resume = buildResume();
    expect(sectionSummary(resume, "summary")).toBe("7 字");
    expect(sectionSummary(resume, "experience")).toBe("1 段");
    expect(sectionSummary(resume, "projects")).toBe("1 个");
    expect(sectionSummary(resume, "custom")).toBe("1 个板块");
    expect(sectionSummary(resume, "education")).toBe("1 条");
    expect(sectionSummary(resume, "skills")).toBe("2 项");
    expect(sectionSummary(resume, "intent")).toBe("前端工程师 · 上海");
  });
});
