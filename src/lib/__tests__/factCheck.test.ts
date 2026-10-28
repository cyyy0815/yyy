import { describe, expect, it } from "vitest";
import {
  checkFullResumeFacts,
  checkGeneratedText,
  type FactWarning,
} from "../ai/factCheck";
import { createEmptyResume, type Resume } from "../types";

function numberValues(warnings: FactWarning[]): string[] {
  return warnings
    .filter((warning) => warning.kind === "number")
    .map((warning) => warning.value);
}

function nameValues(warnings: FactWarning[]): string[] {
  return warnings
    .filter((warning) => warning.kind === "name")
    .map((warning) => warning.value);
}

function skillValues(warnings: FactWarning[]): string[] {
  return warnings
    .filter((warning) => warning.kind === "skill")
    .map((warning) => warning.value);
}

function buildFullResume(): Resume {
  const resume = createEmptyResume();
  resume.basic.summary = "3 年产品经验，从 0 到 1 落地工单系统。";
  resume.educations = [
    {
      id: "edu-1",
      school: "华东师范大学",
      major: "信息管理",
      degree: "本科",
      start: "2017.09",
      end: "2021.06",
      gpa: "",
      ranking: "",
      courses: "",
      honors: "",
    },
  ];
  resume.experiences = [
    {
      id: "exp-1",
      company: "星河科技",
      role: "产品经理",
      start: "2021.07",
      end: "至今",
      description: "推动跨团队协作，交付周期缩短 30%。",
    },
  ];
  resume.projects = [
    {
      id: "proj-1",
      name: "工单系统重构",
      role: "产品负责人",
      start: "2022.03",
      end: "2023.06",
      description: "覆盖 12 条业务线。",
      link: "",
    },
  ];
  resume.skills = ["需求分析", "SQL"];
  return resume;
}

describe("checkGeneratedText", () => {
  it("只标出素材里找不到的数字", () => {
    const warnings = checkGeneratedText(
      "首屏性能提升 40%，覆盖 12 条业务线。",
      "首屏性能提升 40%",
    );

    expect(numberValues(warnings)).toEqual(["12"]);
  });

  it("技能按大小写与别名比对，缺失的技能才提示", () => {
    const warnings = checkGeneratedText(
      "使用 React 与 Kubernetes 搭建平台。",
      "有 react 项目经验",
    );

    expect(skillValues(warnings)).toEqual(["Kubernetes"]);
  });

  it("容忍日期格式差异，并忽略「从 0 到 1」", () => {
    const warnings = checkGeneratedText(
      "从 0 到 1 落地，2022.06 上线，提升 30%。",
      "2022 年上线，提升 30%",
    );

    expect(warnings).toEqual([]);
  });

  it("空生成内容不提示，空素材会提示全部数字与技能", () => {
    expect(checkGeneratedText("", "React 40%")).toEqual([]);

    const warnings = checkGeneratedText("React 提升 40%", "");
    expect(numberValues(warnings)).toEqual(["40%"]);
    expect(skillValues(warnings)).toEqual(["React"]);
  });
});

describe("checkFullResumeFacts", () => {
  const brief =
    "2021 年本科毕业，信息管理专业；在星河科技做产品经理 3 年，负责工单系统重构；会用 SQL。";

  it("同时核对摘要/经历/项目中的数字与结构化名称", () => {
    const warnings = checkFullResumeFacts(buildFullResume(), brief);

    expect(nameValues(warnings)).toContain("华东师范大学");
    expect(nameValues(warnings)).not.toContain("星河科技");
    expect(nameValues(warnings)).not.toContain("信息管理");
    expect(nameValues(warnings)).not.toContain("工单系统重构");

    expect(numberValues(warnings)).toEqual(
      expect.arrayContaining(["30%", "12", "2017.09", "2022.03", "2023.06"]),
    );
    expect(numberValues(warnings)).not.toContain("3");
    expect(numberValues(warnings)).not.toContain("2021.06");

    expect(skillValues(warnings)).toContain("需求分析");
    expect(skillValues(warnings)).not.toContain("SQL");
  });

  it("公司名允许省略法定后缀", () => {
    const resume = buildFullResume();
    resume.experiences[0].company = "星河科技有限公司";

    const warnings = checkFullResumeFacts(resume, brief);
    expect(nameValues(warnings)).not.toContain("星河科技有限公司");
  });

  it("空简历与空自述不产生提示", () => {
    expect(checkFullResumeFacts(createEmptyResume(), "")).toEqual([]);
  });
});
