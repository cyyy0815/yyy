import { describe, expect, it } from "vitest";
import {
  localizeDegree,
  localizeExperience,
  localizeJobType,
  localizeSkillLevel,
  localizedResume,
  normalizeResumeLanguage,
  pickText,
  resumeLabels,
} from "../language";
import { createEmptyResume, type Resume } from "../types";

function buildResume(): Resume {
  const resume = createEmptyResume();
  resume.basic = {
    ...resume.basic,
    name: "林一",
    headline: "前端工程师",
    summary: "4 年前端经验。",
  };
  resume.intent = {
    ...resume.intent,
    targetRole: "前端工程师",
    targetCity: "上海",
    jobType: "全职",
    experience: "3-5年",
  };
  resume.experiences = [
    {
      id: "exp-1",
      company: "星野科技",
      role: "高级前端工程师",
      start: "2023.03",
      end: "至今",
      description: "负责 B 端平台架构升级",
    },
  ];
  resume.projects = [
    {
      id: "proj-1",
      name: "可视化后台",
      role: "技术负责人",
      start: "2023.05",
      end: "2024.06",
      description: "使用 React 与 ECharts",
      link: "",
    },
  ];
  resume.educations = [
    {
      id: "edu-1",
      school: "华东理工大学",
      major: "计算机科学与技术",
      degree: "本科",
      start: "2017.09",
      end: "2021.06",
      gpa: "3.8/4.0",
      ranking: "前 10%",
      courses: "数据结构、操作系统",
      honors: "一等奖学金",
    },
  ];
  resume.skills = ["React", "小程序"];
  resume.skillGroups = ["前端开发"];
  resume.skillMeta = {
    React: { level: "精通", group: "前端开发" },
    小程序: { level: "熟练", group: "前端开发" },
  };
  resume.customSections = [
    {
      id: "custom-1",
      title: "证书",
      visible: true,
      items: [
        {
          id: "item-1",
          title: "英语六级",
          subtitle: "教育部",
          date: "2020",
          description: "CET-6",
          link: "",
        },
      ],
    },
  ];
  return resume;
}

function withEnglish(resume: Resume): Resume {
  return {
    ...resume,
    language: "en",
    translation: {
      basic: {
        name: "Lin Yi",
        headline: "Frontend Engineer",
        summary: "Frontend engineer with 4 years of experience.",
        city: "Shanghai",
      },
      intent: {
        targetRole: "Frontend Engineer",
        targetCity: "Shanghai",
        jobType: "Full-time",
        experience: "3–5 years",
      },
      experiences: {
        "exp-1": {
          company: "Xingye Technology",
          role: "Senior Frontend Engineer",
          description: "Led the B2B platform architecture upgrade",
        },
      },
      projects: {
        "proj-1": {
          name: "Visual Console",
          role: "Tech Lead",
          description: "Built with React and ECharts",
        },
      },
      educations: {
        "edu-1": {
          school: "East China University of Science and Technology",
          major: "Computer Science",
          degree: "Bachelor",
          ranking: "Top 10%",
          courses: "Data Structures, Operating Systems",
          honors: "First-class Scholarship",
        },
      },
      customSections: {
        "custom-1": {
          title: "Certificates",
          items: {
            "item-1": {
              title: "CET-6",
              subtitle: "Ministry of Education",
              description: "College English Test Band 6",
            },
          },
        },
      },
      skills: { 小程序: "Mini Programs" },
      skillGroups: { 前端开发: "Frontend" },
    },
  };
}

describe("简历语言", () => {
  it("合法值原样保留，非法值回退中文", () => {
    expect(normalizeResumeLanguage("en")).toBe("en");
    expect(normalizeResumeLanguage("bilingual")).toBe("bilingual");
    expect(normalizeResumeLanguage("zh")).toBe("zh");
    expect(normalizeResumeLanguage("fr")).toBe("zh");
    expect(normalizeResumeLanguage(undefined)).toBe("zh");
    expect(normalizeResumeLanguage(42)).toBe("zh");
  });

  it("中文 / 英文 / 双语使用不同板块标题", () => {
    expect(resumeLabels("zh").summary).toBe("个人简介");
    expect(resumeLabels("en").summary).toBe("SUMMARY");
    expect(resumeLabels("bilingual").summary).toBe("个人简介 / SUMMARY");
    expect(resumeLabels("en").educationAcademic).toBe("EDUCATION");
    expect(resumeLabels("bilingual").colon).toBe("：");
  });

  it("英文为空时回退中文，双语按分隔符并列", () => {
    expect(pickText("zh", "中文", "English")).toBe("中文");
    expect(pickText("en", "中文", "English")).toBe("English");
    expect(pickText("en", "中文", "")).toBe("中文");
    expect(pickText("bilingual", "中文", "English")).toBe("中文 / English");
    expect(pickText("bilingual", "", "English")).toBe("English");
    expect(pickText("bilingual", "中文", "English", "\n")).toBe(
      "中文\nEnglish",
    );
  });

  it("英文视图优先使用英文覆盖内容", () => {
    const view = localizedResume(withEnglish(buildResume()));
    expect(view.basic.name).toBe("Lin Yi");
    expect(view.basic.headline).toBe("Frontend Engineer");
    expect(view.experiences[0].company).toBe("Xingye Technology");
    expect(view.experiences[0].role).toBe("Senior Frontend Engineer");
    expect(view.projects[0].name).toBe("Visual Console");
    expect(view.educations[0].school).toContain("East China");
    expect(view.educations[0].degree).toBe("Bachelor");
    expect(view.educations[0].ranking).toBe("Top 10%");
    expect(view.basic.city).toBe("Shanghai");
    expect(view.skills).toEqual(["React", "Mini Programs"]);
    expect(view.skillGroups).toEqual(["Frontend"]);
    expect(view.skillMeta["Mini Programs"]).toEqual({
      level: "熟练",
      group: "Frontend",
    });
    expect(view.customSections[0].title).toBe("Certificates");
    expect(view.customSections[0].items[0].title).toBe("CET-6");
  });

  it("英文覆盖为空时回退中文原文", () => {
    const resume = buildResume();
    resume.language = "en";
    const view = localizedResume(resume);
    expect(view.basic.name).toBe("林一");
    expect(view.basic.summary).toBe("4 年前端经验。");
    expect(view.experiences[0].company).toBe("星野科技");
    expect(view.educations[0].degree).toBe("Bachelor");
  });

  it("双语并列中英文内容与标题", () => {
    const view = localizedResume({
      ...withEnglish(buildResume()),
      language: "bilingual",
    });
    expect(view.basic.name).toBe("林一 / Lin Yi");
    expect(view.experiences[0].role).toBe("高级前端工程师 / Senior Frontend Engineer");
    expect(view.basic.summary).toBe("4 年前端经验。 / Frontend engineer with 4 years of experience.");
    expect(resumeLabels("bilingual").experience).toBe("工作经历 / EXPERIENCE");
  });

  it("截止日期与常见枚举值按语言转换", () => {
    const view = localizedResume(withEnglish(buildResume()));
    expect(view.experiences[0].end).toBe("Present");
    expect(view.intent.jobType).toBe("Full-time");
    expect(view.intent.experience).toBe("3–5 years");
    expect(localizeJobType("en", "实习")).toBe("Internship");
    expect(localizeDegree("en", "硕士")).toBe("Master");
    expect(localizeExperience("en", "应届")).toBe("New graduate");
    expect(localizeExperience("en", "10年以上")).toBe("10+ years");
    expect(localizeSkillLevel("en", "精通")).toBe("Expert");
    expect(localizeSkillLevel("bilingual", "熟练")).toBe("熟练 / Proficient");
  });

  it("ATS 等场景可关闭占位文字", () => {
    const resume = createEmptyResume();
    resume.language = "en";
    const view = localizedResume(resume, { placeholders: false });
    expect(view.basic.name).toBe("");
    expect(view.basic.headline).toBe("");
    const withPlaceholders = localizedResume(resume);
    expect(withPlaceholders.basic.name).toBe("YOUR NAME");
    expect(withPlaceholders.basic.headline).toBe("YOUR TITLE");
  });

  it("占位文字随语言变化", () => {
    const resume = createEmptyResume();
    resume.language = "bilingual";
    const view = localizedResume(resume);
    expect(view.basic.name).toBe("你的姓名 / YOUR NAME");
    expect(view.basic.headline).toBe("求职头衔 / YOUR TITLE");
  });
});
