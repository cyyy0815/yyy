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

export type Resume = {
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
  theme: ResumeTheme;
};

export const TEMPLATE_IDS = [
  "modern",
  "classic",
  "compact",
  "sidebar",
  "timeline",
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
    theme: { accent: DEFAULT_ACCENT },
  };
}
