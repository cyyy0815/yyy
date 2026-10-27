import { DEFAULT_ACCENT } from "./theme";

export type Education = {
  id: string;
  school: string;
  major: string;
  degree: string;
  start: string;
  end: string;
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

export type Resume = {
  basic: BasicInfo;
  intent: JobIntent;
  educations: Education[];
  experiences: Experience[];
  projects: Project[];
  skills: string[];
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
    skills: [],
    theme: { accent: DEFAULT_ACCENT },
  };
}
