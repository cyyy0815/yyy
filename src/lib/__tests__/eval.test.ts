import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderReport, runEvaluation } from "../eval/report";

/**
 * 离线评测：指标既是回归基线，也会生成 docs/eval-report.md（`npm run eval`）。
 * 断言用宽松阈值，防止画像库 / 词库调整时悄悄退化。
 */
const result = runEvaluation();

describe("离线评测", () => {
  it("画像识别达到基线", () => {
    expect(result.profileAccuracy.correct).toBeGreaterThanOrEqual(
      Math.ceil(result.profileAccuracy.total * 0.85),
    );
  });

  it("同画像 JD 覆盖率不低于 70", () => {
    expect(result.jdCoverage.average).toBeGreaterThanOrEqual(70);
  });

  it("分组口径优于逐项口径", () => {
    expect(result.grouping.grouped).toBeGreaterThan(result.grouping.naive + 10);
  });

  it("手写 JD 画像命中不少于 3/5", () => {
    expect(result.handwrittenJd.profileHit).toBeGreaterThanOrEqual(3);
  });

  it("手写 JD 都能给出具体缺口", () => {
    expect(result.handwrittenJd.gapHit).toBeGreaterThanOrEqual(4);
  });

  it("注入事实全部检出，干净文本不误报", () => {
    expect(result.factCheck.detected).toBe(result.factCheck.injected);
    expect(result.factCheck.falsePositives).toBe(0);
  });

  it("可生成评测报告", () => {
    const report = renderReport(result);
    expect(report).toContain("# 简历工坊 · 离线评测报告");
    expect(report).toContain("局限");

    if (process.env.EVAL_WRITE === "1") {
      const directory = join(process.cwd(), "docs");
      mkdirSync(directory, { recursive: true });
      writeFileSync(join(directory, "eval-report.md"), report, "utf8");
    }
  });
});
