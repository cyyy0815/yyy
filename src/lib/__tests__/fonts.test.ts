import { describe, expect, it } from "vitest";
import {
  FONT_PRESETS,
  RESUME_FONT_IDS,
  isResumeFontId,
  normalizeResumeFont,
  resumeFontStyle,
} from "../fonts";

describe("normalizeResumeFont", () => {
  it("保留所有合法字体并回退未知值", () => {
    for (const id of RESUME_FONT_IDS) {
      expect(isResumeFontId(id)).toBe(true);
      expect(normalizeResumeFont(id)).toBe(id);
    }
    for (const value of [null, undefined, "", "Arial", 42, {}, []]) {
      expect(isResumeFontId(value)).toBe(false);
      expect(normalizeResumeFont(value)).toBe("auto");
    }
  });

  it("默认字体是 auto，旧数据不需要迁移", () => {
    expect(normalizeResumeFont(undefined)).toBe("auto");
  });
});

describe("resumeFontStyle", () => {
  it("auto 不注入变量，模板保留自己的默认字体", () => {
    expect(resumeFontStyle("auto")).toEqual({});
  });

  it("衬线同时作用于标题与正文", () => {
    const style = resumeFontStyle("serif") as Record<string, string>;
    expect(style["--resume-font-heading"]).toContain("--font-serif");
    expect(style["--resume-font-body"]).toContain("--font-serif");
  });

  it("报刊混排使用衬线标题与无衬线正文", () => {
    const style = resumeFontStyle("editorial") as Record<string, string>;
    expect(style["--resume-font-heading"]).toContain("--font-serif");
    expect(style["--resume-font-body"]).toContain("--font-sans");
  });

  it("等宽只作用于标题，正文保持无衬线", () => {
    const style = resumeFontStyle("mono") as Record<string, string>;
    expect(style["--resume-font-heading"]).toContain("monospace");
    expect(style["--resume-font-body"]).toContain("--font-sans");
  });
});

describe("FONT_PRESETS", () => {
  it("与字体 ID 一一对应，标签与预览字体齐全", () => {
    expect(FONT_PRESETS.map((preset) => preset.id)).toEqual([
      ...RESUME_FONT_IDS,
    ]);
    expect(new Set(FONT_PRESETS.map((preset) => preset.label)).size).toBe(
      FONT_PRESETS.length,
    );
    expect(FONT_PRESETS.every((preset) => preset.note && preset.preview)).toBe(
      true,
    );
  });
});
