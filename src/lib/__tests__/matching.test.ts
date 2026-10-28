import { describe, expect, it } from "vitest";
import { analyzeResume, resumeHasSkill, skillMatches, textHasSkill } from "../matching";
import { analyzeJd } from "../jdMatch";
import { JOB_PROFILES } from "../jobProfiles";
import { createEmptyResume, type Education, type Experience } from "../types";

function education(degree: string): Education {
  return {
    id: `edu-${degree}`,
    school: "某大学",
    major: "计算机",
    degree,
    start: "2018.09",
    end: "2022.06",
    gpa: "",
    ranking: "",
    courses: "",
    honors: "",
  };
}

function experience(role: string, description: string): Experience {
  return {
    id: `exp-${role}`,
    company: "某公司",
    role,
    start: "2022.07",
    end: "至今",
    description,
  };
}

describe("skillMatches / textHasSkill", () => {
  it("英文技能精确匹配，避免 Java 命中 JavaScript", () => {
    expect(skillMatches("JavaScript", "Java")).toBe(false);
    expect(skillMatches("Java", "JavaScript")).toBe(false);
    expect(skillMatches("Node.js", "node")).toBe(true);
    expect(skillMatches("Vue.js", "Vue")).toBe(true);
    expect(skillMatches("TypeScript", "TypeScript")).toBe(true);
  });

  it("中文技能允许包含关系", () => {
    expect(skillMatches("前端性能优化", "性能优化")).toBe(true);
    expect(skillMatches("性能优化", "前端性能优化")).toBe(true);
    expect(skillMatches("性能优化", "数据分析")).toBe(false);
  });

  it("正文扫描同样区分 Java 与 JavaScript", () => {
    expect(textHasSkill("熟悉 JavaScript 与 TypeScript", "Java")).toBe(false);
    expect(textHasSkill("熟悉 JavaScript 与 TypeScript", "JavaScript")).toBe(
      true,
    );
    expect(textHasSkill("使用 Java 开发后端", "Java")).toBe(true);
    expect(textHasSkill("使用 Next.js 构建", "Next.js")).toBe(true);
    expect(textHasSkill("React 前端", "react")).toBe(true);
    expect(textHasSkill("负责前端性能优化", "性能优化")).toBe(true);
  });

  it("简历技能标签或经历正文任一处命中都算具备", () => {
    const resume = createEmptyResume();
    resume.skills = ["React"];
    resume.experiences = [experience("前端", "使用 Java 开发内部工具")];
    expect(resumeHasSkill(resume, "React")).toBe(true);
    expect(resumeHasSkill(resume, "Java")).toBe(true);
    expect(resumeHasSkill(resume, "JavaScript")).toBe(false);
  });
});

describe("analyzeResume", () => {
  it("识别前端岗位并计算核心/加分技能", () => {
    const resume = createEmptyResume();
    resume.basic.name = "林一";
    resume.basic.headline = "5 年前端开发";
    resume.intent.targetRole = "前端工程师";
    resume.intent.targetCity = "上海";
    resume.skills = [
      "JavaScript",
      "TypeScript",
      "React",
      "Vue",
      "HTML",
      "CSS",
      "工程化",
      "浏览器",
      "Webpack",
      "性能优化",
    ];
    resume.experiences = [
      experience(
        "前端工程师",
        "负责中后台工程化建设与浏览器兼容，使用 Webpack 优化首屏性能，性能提升 40%。",
      ),
    ];
    resume.educations = [education("本科")];

    const result = analyzeResume(resume);

    expect(result.profile?.id).toBe("frontend");
    expect(result.matchedCore).toHaveLength(8);
    expect(result.missingCore).toEqual([]);
    expect(result.matchedBonus).toEqual(
      expect.arrayContaining(["Webpack", "性能优化"]),
    );
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.keywords).toContain("前端开发工程师");
    expect(result.label).not.toBe("信息不足");
  });

  it("岗位画像未命中时回退到经历角色与关键词", () => {
    const resume = createEmptyResume();
    resume.basic.name = "林一";
    resume.experiences = [experience("数据分析师", "")];

    const result = analyzeResume(resume);

    expect(result.profile).toBeNull();
    expect(result.inferredRole).toBe("数据分析师");
    expect(result.keywords).toContain("数据分析师");
    expect(result.label).toBe("岗位画像未收录");
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("缺少核心技能时给出补技能建议", () => {
    const resume = createEmptyResume();
    resume.intent.targetRole = "前端工程师";
    resume.skills = ["React"];

    const result = analyzeResume(resume);

    expect(result.profile?.id).toBe("frontend");
    expect(result.missingCore).toContain("JavaScript");
    expect(result.missingCore).toContain("CSS");
    expect(result.suggestions.join(" ")).toContain("还没有体现");
  });

  it.each([
    "go-backend",
    "data-engineering",
    "security",
    "presales",
    "procurement",
    "legal",
    "admin",
    "embedded",
  ])("按目标岗位识别新增画像 %s", (id) => {
    const profile = JOB_PROFILES.find((item) => item.id === id);
    expect(profile).toBeDefined();
    if (!profile) return;

    const resume = createEmptyResume();
    resume.intent.targetRole = profile.title;
    resume.skills = [...profile.core];

    const result = analyzeResume(resume);

    expect(result.profile?.id).toBe(id);
    expect(result.missingCore).toEqual([]);
  });
});

describe("analyzeJd", () => {
  const jd =
    "岗位要求：3年以上前端开发经验，本科及以上学历；熟悉 React、TypeScript、Webpack，了解 Node.js 与性能优化。";

  it("识别关键词、覆盖率与年限/学历差距", () => {
    const resume = createEmptyResume();
    resume.skills = ["React", "TypeScript", "Webpack", "Node.js"];
    resume.intent.experience = "1-3年";
    resume.educations = [education("大专")];

    const result = analyzeJd(jd, resume);

    expect(result.keywordCount).toBe(6);
    expect(result.matched).toEqual(
      expect.arrayContaining(["React", "TypeScript", "Webpack", "Node.js"]),
    );
    expect(result.missing).toEqual(
      expect.arrayContaining(["前端", "性能优化"]),
    );
    expect(result.score).toBe(67);
    expect(result.label).toBe("部分匹配");
    expect(result.minYears).toBe(3);
    expect(result.requiredDegree).toBe("本科");
    expect(result.suggestions.join(" ")).toContain("3 年以上");
    expect(result.suggestions.join(" ")).toContain("本科");
  });

  it("年限与学历满足时不重复提示", () => {
    const resume = createEmptyResume();
    resume.skills = [
      "前端",
      "React",
      "TypeScript",
      "Webpack",
      "Node.js",
      "性能优化",
    ];
    resume.intent.experience = "3-5年";
    resume.educations = [education("本科")];

    const result = analyzeJd(jd, resume);

    expect(result.score).toBe(100);
    expect(result.suggestions.join(" ")).not.toContain("3 年以上");
    expect(result.suggestions.join(" ")).not.toContain("本科及以上");
  });

  it("支持范围年限与「5年以上」写法", () => {
    const range = analyzeJd("要求 3-5 年经验", createEmptyResume());
    expect(range.minYears).toBe(3);

    const above = analyzeJd("需要 5 年以上工作经验", createEmptyResume());
    expect(above.minYears).toBe(5);

    const single = analyzeJd("3年经验", createEmptyResume());
    expect(single.minYears).toBe(3);
  });

  it("没有识别到关键词时给出提示", () => {
    const result = analyzeJd("我们希望你靠谱、有责任心", createEmptyResume());
    expect(result.keywordCount).toBe(0);
    expect(result.score).toBe(0);
    expect(result.label).toBe("匹配度低");
    expect(result.suggestions[0]).toContain("没有识别到");
  });
});
