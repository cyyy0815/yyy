import { describe, expect, it } from "vitest";
import {
  formatSkill,
  groupSkills,
  hasSkillDetails,
  skillGroupKey,
  skillMetaOf,
} from "../skills";
import { RESUME_SCHEMA_VERSION } from "../schema";
import { DEFAULT_SECTION_ORDER, type Resume } from "../types";

function makeResume(patch: Partial<Resume> = {}): Resume {
  return {
    schemaVersion: RESUME_SCHEMA_VERSION,
    basic: {
      name: "",
      headline: "",
      email: "",
      phone: "",
      city: "",
      website: "",
      github: "",
      summary: "",
      photo: "",
    },
    intent: {
      targetRole: "",
      targetCity: "",
      salaryMin: "",
      salaryMax: "",
      jobType: "全职",
      experience: "",
    },
    educations: [],
    experiences: [],
    projects: [],
    customSections: [],
    skills: [],
    skillMeta: {},
    skillGroups: [],
    layout: { order: [...DEFAULT_SECTION_ORDER], hidden: [] },
    theme: { accent: "#1d4ed8" },
    font: "auto",
    language: "zh",
    translation: {
      basic: { name: "", headline: "", summary: "", city: "" },
      intent: { targetRole: "", targetCity: "", jobType: "", experience: "" },
      experiences: {},
      projects: {},
      educations: {},
      customSections: {},
      skills: {},
      skillGroups: {},
    },
    ...patch,
  };
}

describe("groupSkills", () => {
  it("没有分组与熟练度时全部归入未分组", () => {
    const resume = makeResume({ skills: ["React", "TypeScript"] });
    expect(groupSkills(resume)).toEqual([
      {
        title: "",
        skills: [
          { name: "React", level: "" },
          { name: "TypeScript", level: "" },
        ],
      },
    ]);
  });

  it("按 skillGroups 顺序分组，未分组排在最后", () => {
    const resume = makeResume({
      skills: ["React", "Node.js", "Git"],
      skillGroups: ["后端", "前端"],
      skillMeta: {
        React: { level: "精通", group: "前端" },
        "Node.js": { level: "熟练", group: "后端" },
      },
    });
    expect(groupSkills(resume)).toEqual([
      {
        title: "后端",
        skills: [{ name: "Node.js", level: "熟练" }],
      },
      {
        title: "前端",
        skills: [{ name: "React", level: "精通" }],
      },
      { title: "", skills: [{ name: "Git", level: "" }] },
    ]);
  });

  it("元数据里出现、但不在 skillGroups 的分组追加在已排序分组之后", () => {
    const resume = makeResume({
      skills: ["React", "Docker"],
      skillGroups: ["前端"],
      skillMeta: {
        React: { level: "", group: "前端" },
        Docker: { level: "了解", group: "运维" },
      },
    });
    expect(groupSkills(resume).map((group) => group.title)).toEqual([
      "前端",
      "运维",
    ]);
  });

  it("默认跳过空分组，includeEmpty 时保留空分组与空未分组", () => {
    const resume = makeResume({
      skills: ["React"],
      skillGroups: ["前端", "待学习"],
      skillMeta: { React: { level: "熟练", group: "前端" } },
    });
    expect(groupSkills(resume)).toHaveLength(1);
    expect(groupSkills(resume, { includeEmpty: true })).toEqual([
      {
        title: "前端",
        skills: [{ name: "React", level: "熟练" }],
      },
      { title: "待学习", skills: [] },
      { title: "", skills: [] },
    ]);
  });

  it("没有分组且没有技能时默认返回空数组、includeEmpty 返回空未分组", () => {
    const resume = makeResume();
    expect(groupSkills(resume)).toEqual([]);
    expect(groupSkills(resume, { includeEmpty: true })).toEqual([
      { title: "", skills: [] },
    ]);
  });
});

describe("hasSkillDetails", () => {
  it("老数据（无分组、无熟练度）视为纯文本", () => {
    expect(
      hasSkillDetails(makeResume({ skills: ["React"], skillGroups: [] })),
    ).toBe(false);
  });

  it("有分组或有熟练度即为详细模式", () => {
    expect(
      hasSkillDetails(
        makeResume({ skills: ["React"], skillGroups: ["前端"] }),
      ),
    ).toBe(true);
    expect(
      hasSkillDetails(
        makeResume({
          skills: ["React"],
          skillMeta: { React: { level: "熟练", group: "" } },
        }),
      ),
    ).toBe(true);
  });
});

describe("展示辅助函数", () => {
  it("formatSkill 只在有熟练度时追加括号", () => {
    expect(formatSkill({ name: "React", level: "精通" })).toBe("React（精通）");
    expect(formatSkill({ name: "React", level: "" })).toBe("React");
  });

  it("formatSkill 英文使用英文熟练度与括号", () => {
    expect(formatSkill({ name: "React", level: "精通" }, "en")).toBe(
      "React (Expert)",
    );
    expect(formatSkill({ name: "React", level: "熟练" }, "bilingual")).toBe(
      "React（熟练 / Proficient）",
    );
    expect(formatSkill({ name: "React", level: "" }, "en")).toBe("React");
  });

  it("skillGroupKey 给未分组一个稳定 key", () => {
    expect(skillGroupKey({ title: "前端", skills: [] })).toBe("前端");
    expect(skillGroupKey({ title: "", skills: [] })).toBe("__ungrouped");
  });

  it("skillMetaOf 缺失时返回空元数据", () => {
    expect(skillMetaOf(makeResume(), "React")).toEqual({
      level: "",
      group: "",
    });
  });
});
