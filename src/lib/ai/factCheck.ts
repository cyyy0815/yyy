import { extractJdKeywords } from "../jdMatch";
import { textHasSkill } from "../matching";
import type { Resume } from "../types";
import type { AiLanguage } from "./types";

export type FactWarningKind = "number" | "skill" | "name";

export type FactWarning = {
  kind: FactWarningKind;
  /** 生成内容中的原始片段，用于展示与去重。 */
  value: string;
  /** 面向用户的说明，只指出问题，不自动改动内容。 */
  message: string;
};

const FULL_WIDTH_DIGITS = /[０-９]/g;

/** 先匹配 年.月 形式的日期，再匹配普通数字，避免把日期拆成两个数字。 */
const NUMBER_PATTERN =
  /(?:19|20)\d{2}[.\-/](?:0?[1-9]|1[0-2])(?!\d)|\d+(?:[.,]\d+)?[%％]?/g;

const DATE_LIKE = /^((?:19|20)\d{2})[.\-/](\d{1,2})$/;
const NORMALIZED_DATE = /^((?:19|20)\d{2})\.(\d{1,2})$/;

const NAME_SUFFIXES = [
  "股份有限公司",
  "有限责任公司",
  "有限公司",
  "集团",
  "公司",
  "大学",
  "学院",
  "学校",
];

type NumberToken = {
  raw: string;
  normalized: string;
};

type NameClaim = {
  field: string;
  value: string;
  /** 公司/学校允许省略「有限公司」「大学」等后缀。 */
  stripSuffix?: boolean;
};

function toHalfWidth(text: string): string {
  return text.replace(FULL_WIDTH_DIGITS, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
}

/** 百分号与千分位不影响数值；日期统一成「年.月」，避免 2022.06 与 2022.6 误报。 */
function normalizeNumber(token: string): string {
  const plain = token.replace(/[%％]/g, "").replace(/,/g, "");
  const date = plain.match(DATE_LIKE);
  return date ? `${date[1]}.${Number(date[2])}` : plain;
}

function collectNumbers(text: string): NumberToken[] {
  // 「从 0 到 1」是常见表述，不是可核对的量化成果。
  const cleaned = toHalfWidth(text).replace(/从?\s*0\s*到\s*1/g, " ");
  const seen = new Set<string>();
  const tokens: NumberToken[] = [];

  for (const raw of cleaned.match(NUMBER_PATTERN) ?? []) {
    const normalized = normalizeNumber(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    tokens.push({ raw, normalized });
  }

  return tokens;
}

/** 年份一致即可接受日期格式差异（自述写「2021 年」，生成写「2021.06」）。 */
function numberSupported(normalized: string, source: Set<string>): boolean {
  if (source.has(normalized)) return true;
  const date = normalized.match(NORMALIZED_DATE);
  return date ? source.has(date[1]) : false;
}

function compact(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s·・,，、.。:：;；"'“”‘’()（）\-—_/\\]/g, "");
}

function coreName(value: string): string {
  let core = compact(value);
  for (const suffix of NAME_SUFFIXES) {
    const normalizedSuffix = compact(suffix);
    if (core.endsWith(normalizedSuffix) && core.length > normalizedSuffix.length) {
      core = core.slice(0, -normalizedSuffix.length);
      break;
    }
  }
  return core;
}

function mentions(
  source: string,
  name: string,
  stripSuffix: boolean,
): boolean {
  const target = compact(name);
  if (!target) return true;

  const haystack = compact(source);
  if (!haystack) return false;
  if (haystack.includes(target)) return true;
  if (!stripSuffix) return false;

  const core = coreName(name);
  return core.length >= 2 && haystack.includes(core);
}

function numberWarnings(
  generated: string,
  source: string,
  sourceLabel: string,
): FactWarning[] {
  const sourceNumbers = new Set(
    collectNumbers(source).map((token) => token.normalized),
  );

  return collectNumbers(generated)
    .filter((token) => !numberSupported(token.normalized, sourceNumbers))
    .map((token) => ({
      kind: "number" as const,
      value: token.raw,
      message: `数字或时间「${token.raw}」没有在${sourceLabel}中出现`,
    }));
}

function skillWarnings(
  generated: string,
  explicitSkills: string[],
  source: string,
  sourceLabel: string,
): FactWarning[] {
  const seen = new Set<string>();
  const warnings: FactWarning[] = [];

  const check = (skill: string) => {
    const value = skill.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return;
    seen.add(key);
    if (textHasSkill(source, value)) return;
    warnings.push({
      kind: "skill",
      value,
      message: `技能「${value}」没有在${sourceLabel}中出现`,
    });
  };

  for (const skill of explicitSkills) check(skill);
  for (const skill of extractJdKeywords(generated)) check(skill);
  return warnings;
}

function nameWarnings(
  claims: NameClaim[],
  source: string,
  sourceLabel: string,
): FactWarning[] {
  const seen = new Set<string>();
  const warnings: FactWarning[] = [];

  for (const claim of claims) {
    const value = claim.value.trim();
    if (!value || mentions(source, value, claim.stripSuffix ?? false)) continue;

    const key = compact(value);
    if (seen.has(key)) continue;
    seen.add(key);
    warnings.push({
      kind: "name",
      value,
      message: `${claim.field}「${value}」没有在${sourceLabel}中出现`,
    });
  }

  return warnings;
}

/**
 * 核对单段生成内容：数字与常见技能必须能在用户提供的素材里找到。
 * JD 不在 source 里——JD 是岗位要求，不能当作求职者的事实。
 */
export function checkGeneratedText(
  generated: string,
  source: string,
): FactWarning[] {
  const text = generated.trim();
  if (!text) return [];

  return [
    ...numberWarnings(text, source, "素材"),
    ...skillWarnings(text, [], source, "素材"),
  ];
}

/**
 * 核对整份简历：除摘要/经历/项目里的数字与技能外，
 * 还检查学校、专业、公司、项目名是否出现在用户自述中。
 */
export function checkFullResumeFacts(
  resume: Resume,
  brief: string,
  options: { language?: AiLanguage } = {},
): FactWarning[] {
  const claims: NameClaim[] = [
    ...resume.educations.map((item) => ({
      field: "学校",
      value: item.school,
      stripSuffix: true,
    })),
    ...resume.educations.map((item) => ({ field: "专业", value: item.major })),
    ...resume.experiences.map((item) => ({
      field: "公司",
      value: item.company,
      stripSuffix: true,
    })),
    ...resume.projects.map((item) => ({
      field: "项目名称",
      value: item.name,
    })),
  ];

  const dateText = [
    ...resume.educations.flatMap((item) => [item.start, item.end]),
    ...resume.experiences.flatMap((item) => [item.start, item.end]),
    ...resume.projects.flatMap((item) => [item.start, item.end]),
  ]
    .filter(Boolean)
    .join(" ");

  const generatedText = [
    resume.basic.summary,
    ...resume.educations.flatMap((item) => [
      item.gpa,
      item.ranking,
      item.courses,
      item.honors,
    ]),
    ...resume.experiences.map((item) => item.description),
    ...resume.projects.map((item) => item.description),
    dateText,
  ].join("\n");

  return [
    // 英文模式下公司/学校名会被翻译，与中文自述做字面比对必然误报；
    // 数字与技能仍可核对，因此只跳过名称。
    ...(options.language === "en" ? [] : nameWarnings(claims, brief, "自述")),
    ...numberWarnings(generatedText, brief, "自述"),
    ...skillWarnings(generatedText, resume.skills, brief, "自述"),
  ];
}
