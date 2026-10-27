import type { CSSProperties } from "react";

export const DEFAULT_ACCENT = "#1d4ed8";

/** 预设主题色都保证在白色简历纸上有足够对比度。 */
export const ACCENT_PRESETS = [
  { name: "靛蓝", value: "#1d4ed8" },
  { name: "天青", value: "#0369a1" },
  { name: "墨绿", value: "#0f766e" },
  { name: "森绿", value: "#3f6212" },
  { name: "琥珀", value: "#b45309" },
  { name: "绯红", value: "#be123c" },
  { name: "紫罗兰", value: "#6d28d9" },
  { name: "石墨", value: "#334155" },
] as const;

const HEX = /^#[0-9a-fA-F]{6}$/;

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function toHex(rgb: Rgb): string {
  return `#${rgb
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ];
}

function linear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb: Rgb): number {
  return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
}

/** 与白色背景的对比度，1 最差，21 最好。 */
function contrastWithWhite(rgb: Rgb): number {
  return 1.05 / (luminance(rgb) + 0.05);
}

export function normalizeAccent(value: unknown): string {
  return typeof value === "string" && HEX.test(value)
    ? value.toLowerCase()
    : DEFAULT_ACCENT;
}

/** 正文小标题用的颜色：过浅的自定义色会逐步压暗到可读。 */
export function accentInk(accent: string): string {
  let rgb = parseHex(normalizeAccent(accent));
  for (let i = 0; i < 12 && contrastWithWhite(rgb) < 4.5; i += 1) {
    rgb = mix(rgb, [0, 0, 0], 0.12);
  }
  return toHex(rgb);
}

/** 侧栏底色：压得更深，保证白色文字有足够对比。 */
export function accentDeep(accent: string): string {
  let rgb = parseHex(accentInk(accent));
  for (let i = 0; i < 12 && contrastWithWhite(rgb) < 8; i += 1) {
    rgb = mix(rgb, [0, 0, 0], 0.18);
  }
  return toHex(rgb);
}

/** 把主题色及其派生色注入为 CSS 变量，供模板与全局样式使用。 */
export function accentStyle(accent: string): CSSProperties {
  const safe = normalizeAccent(accent);
  return {
    "--resume-accent": safe,
    "--resume-ink": accentInk(safe),
    "--resume-deep": accentDeep(safe),
  } as CSSProperties;
}
