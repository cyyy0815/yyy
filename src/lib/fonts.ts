import type { CSSProperties } from "react";

/**
 * 字体搭配只改变标题与正文两处字体，不改字号 / 行高，
 * 因此每套模板的版式与分页仍然成立。
 */
export const RESUME_FONT_IDS = [
  "auto",
  "sans",
  "serif",
  "editorial",
  "mono",
] as const;

export type ResumeFontId = (typeof RESUME_FONT_IDS)[number];

export const DEFAULT_RESUME_FONT: ResumeFontId = "auto";

const MONO =
  'ui-monospace, "SFMono-Regular", "Cascadia Mono", "Roboto Mono", Menlo, Consolas, "Noto Sans Mono CJK SC", monospace';

export type FontPreset = {
  id: ResumeFontId;
  label: string;
  note: string;
  /** null 表示沿用模板自身的默认字体 */
  heading: string | null;
  body: string | null;
  /** 选择器按钮上用于预览的字体栈 */
  preview: string;
};

export const FONT_PRESETS: readonly FontPreset[] = [
  {
    id: "auto",
    label: "默认",
    note: "每套模板的默认字体",
    heading: null,
    body: null,
    preview: "inherit",
  },
  {
    id: "sans",
    label: "无衬线",
    note: "系统无衬线，现代简洁",
    heading: "var(--font-sans)",
    body: "var(--font-sans)",
    preview: "var(--font-sans)",
  },
  {
    id: "serif",
    label: "衬线",
    note: "宋体 / Georgia，稳重典雅",
    heading: "var(--font-serif)",
    body: "var(--font-serif)",
    preview: "var(--font-serif)",
  },
  {
    id: "editorial",
    label: "报刊",
    note: "衬线标题 + 无衬线正文",
    heading: "var(--font-serif)",
    body: "var(--font-sans)",
    preview: "var(--font-serif)",
  },
  {
    id: "mono",
    label: "等宽",
    note: "等宽标题 + 无衬线正文，技术风格",
    heading: MONO,
    body: "var(--font-sans)",
    preview: MONO,
  },
];

export function isResumeFontId(value: unknown): value is ResumeFontId {
  return (
    typeof value === "string" &&
    (RESUME_FONT_IDS as readonly string[]).includes(value)
  );
}

export function normalizeResumeFont(value: unknown): ResumeFontId {
  return isResumeFontId(value) ? value : DEFAULT_RESUME_FONT;
}

/**
 * 把字体搭配注入为 CSS 变量：
 * 模板根节点用 `--resume-font-body` 渲染正文，标题规则读取 `--resume-font-heading`。
 * auto 不注入任何变量，模板保持自己的默认字体。
 */
export function resumeFontStyle(font: ResumeFontId): CSSProperties {
  const preset = FONT_PRESETS.find((item) => item.id === font);
  if (!preset?.heading || !preset.body) return {};
  return {
    "--resume-font-heading": preset.heading,
    "--resume-font-body": preset.body,
  } as CSSProperties;
}
