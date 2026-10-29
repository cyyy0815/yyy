import { describe, expect, it } from "vitest";
import {
  cleanAiOutput,
  hasAiOutputText,
  splitBilingualOutput,
} from "../ai/aiLanguage";
import { AI_BILINGUAL_MARKER } from "../ai/types";

describe("splitBilingualOutput", () => {
  it("按独占一行的分隔标记拆出中英文", () => {
    const result = splitBilingualOutput(
      `中文第一行\n中文第二行\n${AI_BILINGUAL_MARKER}\nEnglish line 1\nEnglish line 2`,
    );
    expect(result.separated).toBe(true);
    expect(result.zh).toBe("中文第一行\n中文第二行");
    expect(result.en).toBe("English line 1\nEnglish line 2");
  });

  it("容忍标记两侧的空白、星号与反引号", () => {
    const result = splitBilingualOutput(
      `中文简介。\n  **${AI_BILINGUAL_MARKER}**  \nEnglish summary.`,
    );
    expect(result.separated).toBe(true);
    expect(result.zh.trim()).toBe("中文简介。");
    expect(result.en.trim()).toBe("English summary.");
  });

  it("没有标记时全部保留在中文侧", () => {
    const result = splitBilingualOutput("只有一段中文");
    expect(result).toEqual({
      zh: "只有一段中文",
      en: "",
      separated: false,
    });
  });
});

describe("cleanAiOutput", () => {
  it("中文模式只清理中文，英文为空", () => {
    expect(cleanAiOutput("1. 主导重构\n- 性能提升 40%", "experience", "zh")).toEqual({
      zh: "主导重构\n性能提升 40%",
      en: "",
      complete: true,
    });
  });

  it("英文模式清理英文并用空格合并简介行", () => {
    expect(
      cleanAiOutput("Frontend engineer.\nBuilt design systems.", "summary", "en"),
    ).toEqual({
      zh: "",
      en: "Frontend engineer. Built design systems.",
      complete: true,
    });
  });

  it("双语模式分别清理两侧内容", () => {
    expect(
      cleanAiOutput(
        `- 主导重构\n${AI_BILINGUAL_MARKER}\n- Led the refactor`,
        "experience",
        "bilingual",
      ),
    ).toEqual({
      zh: "主导重构",
      en: "Led the refactor",
      complete: true,
    });
  });

  it("双语模式缺少英文或分隔行时标记为不完整", () => {
    const missingEnglish = cleanAiOutput("中文简介", "summary", "bilingual");
    expect(missingEnglish.zh).toBe("中文简介");
    expect(missingEnglish.en).toBe("");
    expect(missingEnglish.complete).toBe(false);

    const emptyEnglish = cleanAiOutput(
      `中文简介\n${AI_BILINGUAL_MARKER}\n`,
      "summary",
      "bilingual",
    );
    expect(emptyEnglish.complete).toBe(false);
  });
});

describe("hasAiOutputText", () => {
  const bilingual = { zh: "中文", en: "English" };

  it("按语言判断是否有可写入内容", () => {
    expect(hasAiOutputText(null, "zh")).toBe(false);
    expect(hasAiOutputText({ zh: "", en: "English" }, "zh")).toBe(false);
    expect(hasAiOutputText({ zh: "", en: "English" }, "en")).toBe(true);
    expect(hasAiOutputText({ zh: "中文", en: "" }, "en")).toBe(false);
    expect(hasAiOutputText({ zh: "中文", en: "" }, "bilingual")).toBe(true);
    expect(hasAiOutputText(bilingual, "bilingual")).toBe(true);
  });
});
