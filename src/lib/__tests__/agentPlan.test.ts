import { describe, expect, it } from "vitest";
import { buildPlan } from "../agent/plan";
import { runAnalyzeJd, runDiagnoseGaps } from "../agent/tools";
import { createSampleResume } from "../defaultResume";

const FRONTEND_JD = `岗位职责：
1. 负责中后台系统的前端开发，使用 React / TypeScript 构建组件库；
2. 推动工程化建设（Webpack / Vite），优化首屏性能与浏览器兼容性；
3. 与后端协作完成接口联调。
任职要求：
1. 3 年以上前端经验，熟悉 HTML / CSS；
2. 有 Vue 使用经验优先。`;

describe("buildPlan", () => {
  const resume = createSampleResume();

  it("给出四步计划，顺序固定", () => {
    const steps = buildPlan({ resume, jd: FRONTEND_JD, aiReady: true });
    expect(steps.map((step) => step.id)).toEqual([
      "analyze_jd",
      "diagnose_gaps",
      "rewrite_summary",
      "cover_letter",
    ]);
    expect(steps.filter((step) => step.requiresAi).map((step) => step.id)).toEqual([
      "rewrite_summary",
      "cover_letter",
    ]);
  });

  it("理由用当前数据说话，不是套话", () => {
    const steps = buildPlan({ resume, jd: FRONTEND_JD, aiReady: true });
    const analyze = steps[0];
    const gaps = steps[1];
    // JD 里有词库技能，理由应当带上关键词数量
    expect(analyze.rationale).toMatch(/\d+ 个技能关键词/);
    // 画像命中数
    expect(gaps.rationale).toMatch(/\d+\/\d+ 项核心要求/);
  });

  it("没有简介时改成起草", () => {
    const blank = { ...resume, basic: { ...resume.basic, summary: "" } };
    const steps = buildPlan({ resume: blank, jd: FRONTEND_JD, aiReady: true });
    expect(steps[2].title).toBe("起草个人简介");
  });

  it("没有 AI 时在依赖步骤上标注", () => {
    const steps = buildPlan({ resume, jd: FRONTEND_JD, aiReady: false });
    expect(steps[2].rationale).toContain("需要先配置 AI Key");
    expect(steps[3].rationale).toContain("需要先配置 AI Key");
    expect(steps[0].rationale).not.toContain("AI Key");
  });

  it("JD 太短时提示先确认能识别多少", () => {
    const steps = buildPlan({ resume, jd: "招前端", aiReady: true });
    expect(steps[0].rationale).toContain("JD 太短");
  });
});

describe("runAnalyzeJd", () => {
  const resume = createSampleResume();

  it("回报匹配分与覆盖情况", () => {
    const result = runAnalyzeJd({ resume, jd: FRONTEND_JD });
    expect(result.summary).toMatch(/匹配分 \d+/);
    expect(result.detail).toContain("已覆盖");
    // 样例简历是前端，JD 里的 React 应当命中
    expect(result.detail).toContain("React");
  });

  it("JD 没有词库技能时如实说明", () => {
    const result = runAnalyzeJd({ resume, jd: "负责办公室日常行政事务。" });
    expect(result.summary).toContain("没有识别到词库技能");
  });
});

describe("runDiagnoseGaps", () => {
  it("给出画像、核心要求缺口与分值构成", () => {
    const result = runDiagnoseGaps({
      resume: createSampleResume(),
      jd: FRONTEND_JD,
    });
    expect(result.detail).toContain("画像：");
    expect(result.detail).toMatch(/核心要求 \d+\/\d+ 项/);
    expect(result.detail).toContain("分值构成");
  });

  it("缺核心要求时摘要点明数量", () => {
    const weak = {
      ...createSampleResume(),
      skills: [],
      experiences: [],
      projects: [],
    };
    const result = runDiagnoseGaps({ resume: weak, jd: FRONTEND_JD });
    expect(result.summary).toMatch(/缺 \d+ 项核心要求|核心要求已全部覆盖/);
  });
});
