import { DEFAULT_RESUME_FONT, type ResumeFontId } from "./fonts";
import {
  createEmptyTranslation,
  DEFAULT_RESUME_LANGUAGE,
  type ResumeLanguage,
} from "./language";
import { RESUME_SCHEMA_VERSION } from "./schema";
import { DEFAULT_ACCENT } from "./theme";

export type CustomItem = {
  id: string;
  /** 证书名、奖项、语言、作品名等 */
  title: string;
  /** 颁发机构、担任角色等补充信息 */
  subtitle: string;
  date: string;
  description: string;
  link: string;
};

export type CustomSection = {
  id: string;
  title: string;
  /** 关闭后仍保留数据，只是不出现在简历上 */
  visible: boolean;
  items: CustomItem[];
};

export type Education = {
  id: string;
  school: string;
  major: string;
  degree: string;
  start: string;
  end: string;
  /** 选填：GPA、排名、主修课程、荣誉 */
  gpa: string;
  ranking: string;
  courses: string;
  honors: string;
};

export type Experience = {
  id: string;
  company: string;
  role: string;
  start: string;
  end: string;
  description: string;
  /** 打印时从新的一页开始 */
  pageBreakBefore?: boolean;
};

export type Project = {
  id: string;
  name: string;
  role: string;
  start: string;
  end: string;
  description: string;
  link: string;
  /** 打印时从新的一页开始 */
  pageBreakBefore?: boolean;
};

export type BasicInfo = {
  name: string;
  headline: string;
  email: string;
  phone: string;
  city: string;
  website: string;
  github: string;
  summary: string;
  /** 压缩后的证件照 Data URL；空字符串表示不显示照片 */
  photo: string;
};

export type JobIntent = {
  targetRole: string;
  targetCity: string;
  salaryMin: string;
  salaryMax: string;
  jobType: string;
  experience: string;
};

export type ResumeTheme = {
  accent: string;
};

export type EnglishBasic = {
  name: string;
  headline: string;
  summary: string;
  /** 联系方式里的城市；留空时保留中文 */
  city: string;
};

export type EnglishExperience = {
  company: string;
  role: string;
  description: string;
};

export type EnglishProject = {
  name: string;
  role: string;
  description: string;
};

export type EnglishEducation = {
  school: string;
  major: string;
  degree: string;
  ranking: string;
  courses: string;
  honors: string;
};

export type EnglishCustomItem = {
  title: string;
  subtitle: string;
  description: string;
};

export type EnglishCustomSection = {
  title: string;
  items: Record<string, EnglishCustomItem>;
};

/**
 * 英文内容按条目 id 存放，避免改数据模型；缺失或空字符串时回退中文。
 * 只覆盖会出现在简历上的字段，联系方式与技能名保持原样。
 */
export type ResumeTranslation = {
  basic: EnglishBasic;
  intent: {
    targetRole: string;
    targetCity: string;
    jobType: string;
    experience: string;
  };
  experiences: Record<string, EnglishExperience>;
  projects: Record<string, EnglishProject>;
  educations: Record<string, EnglishEducation>;
  customSections: Record<string, EnglishCustomSection>;
  /** 技能名 → 英文展示名；不影响匹配与 AI 使用的原始技能名 */
  skills: Record<string, string>;
  /** 技能分组名 → 英文展示名 */
  skillGroups: Record<string, string>;
};

export const SKILL_LEVELS = ["", "了解", "熟练", "精通"] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

export function isSkillLevel(value: unknown): value is SkillLevel {
  return (
    typeof value === "string" &&
    (SKILL_LEVELS as readonly string[]).includes(value)
  );
}

export type SkillMeta = {
  level: SkillLevel;
  /** 分组名称；空字符串表示未分组 */
  group: string;
};

export const RESUME_SECTION_KEYS = [
  "summary",
  "experience",
  "projects",
  "custom",
  "education",
  "skills",
  "intent",
] as const;

export type ResumeSectionKey = (typeof RESUME_SECTION_KEYS)[number];

/** 默认顺序接近经典模板；隐藏只影响预览 / 打印 / 导出，不删除数据。 */
export const DEFAULT_SECTION_ORDER: ResumeSectionKey[] = [
  ...RESUME_SECTION_KEYS,
];

export type ResumeLayout = {
  order: ResumeSectionKey[];
  hidden: ResumeSectionKey[];
};

export type Resume = {
  /** 数据结构版本；旧数据读取时由 normalizeResume 补齐 */
  schemaVersion: number;
  basic: BasicInfo;
  intent: JobIntent;
  educations: Education[];
  experiences: Experience[];
  projects: Project[];
  customSections: CustomSection[];
  /** 扁平技能列表，匹配与 AI 只读取这里 */
  skills: string[];
  /** 技能名 → 熟练度与分组；旧数据为空对象 */
  skillMeta: Record<string, SkillMeta>;
  /** 分组的展示顺序；空数组表示全部未分组 */
  skillGroups: string[];
  /** 内置板块的显示顺序与隐藏状态；旧数据没有时按默认补齐 */
  layout: ResumeLayout;
  theme: ResumeTheme;
  /** 字体搭配；auto 表示沿用模板默认字体，旧数据默认 auto */
  font: ResumeFontId;
  /** 简历语言；双语模板标题并列显示中英文。旧数据默认中文。 */
  language: ResumeLanguage;
  /** 英文内容覆盖层；只影响预览 / 打印 / ATS 导出，不改变中文原文。 */
  translation: ResumeTranslation;
};

export const TEMPLATE_IDS = [
  "modern",
  "classic",
  "compact",
  "sidebar",
  "timeline",
  "minimal",
  "academic",
  "card",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export function isTemplateId(value: unknown): value is TemplateId {
  return (
    typeof value === "string" &&
    (TEMPLATE_IDS as readonly string[]).includes(value)
  );
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyResume(): Resume {
  return {
    schemaVersion: RESUME_SCHEMA_VERSION,
    basic: {
      name: "",
      headline: "",
      email: "",
      phone: "",
      city: "",
      website: "",
      github: "",
      summary: "",
      photo: "",
    },
    intent: {
      targetRole: "",
      targetCity: "",
      salaryMin: "",
      salaryMax: "",
      jobType: "全职",
      experience: "",
    },
    educations: [],
    experiences: [],
    projects: [],
    customSections: [],
    skills: [],
    skillMeta: {},
    skillGroups: [],
    layout: { order: [...DEFAULT_SECTION_ORDER], hidden: [] },
    theme: { accent: DEFAULT_ACCENT },
    font: DEFAULT_RESUME_FONT,
    language: DEFAULT_RESUME_LANGUAGE,
    translation: createEmptyTranslation(),
  };
}
