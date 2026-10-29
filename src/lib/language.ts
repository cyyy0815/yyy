import type {
  Education,
  Resume,
  ResumeTranslation,
  SkillLevel,
  SkillMeta,
} from "./types";

export const RESUME_LANGUAGE_IDS = ["zh", "en", "bilingual"] as const;

export type ResumeLanguage = (typeof RESUME_LANGUAGE_IDS)[number];

export const DEFAULT_RESUME_LANGUAGE: ResumeLanguage = "zh";

export const RESUME_LANGUAGES: {
  id: ResumeLanguage;
  label: string;
  note: string;
}[] = [
  { id: "zh", label: "中文", note: "中文标题与内容" },
  { id: "en", label: "英文", note: "英文标题，优先使用英文内容" },
  { id: "bilingual", label: "双语", note: "中英文标题与内容并列" },
];

export function isResumeLanguage(value: unknown): value is ResumeLanguage {
  return (
    typeof value === "string" &&
    (RESUME_LANGUAGE_IDS as readonly string[]).includes(value)
  );
}

export function normalizeResumeLanguage(value: unknown): ResumeLanguage {
  return isResumeLanguage(value) ? value : DEFAULT_RESUME_LANGUAGE;
}

export function createEmptyTranslation(): ResumeTranslation {
  return {
    basic: { name: "", headline: "", summary: "", city: "" },
    intent: { targetRole: "", targetCity: "", jobType: "", experience: "" },
    experiences: {},
    projects: {},
    educations: {},
    customSections: {},
    skills: {},
    skillGroups: {},
  };
}

export type ResumeLabels = {
  summary: string;
  experience: string;
  projects: string;
  education: string;
  educationAcademic: string;
  skills: string;
  skillsProfessional: string;
  intent: string;
  otherInfo: string;
  emptyPreview: string;
  present: string;
  month: string;
  rank: string;
  courses: string;
  honors: string;
  namePlaceholder: string;
  headlinePlaceholder: string;
  companyPlaceholder: string;
  rolePlaceholder: string;
  projectPlaceholder: string;
  schoolPlaceholder: string;
  pageBreak: string;
  targetRole: string;
  targetCity: string;
  expectedSalary: string;
  jobType: string;
  experienceYears: string;
  resumeFallback: string;
  other: string;
  entry: string;
  link: string;
  colon: string;
  listSeparator: string;
};

const ZH_LABELS: ResumeLabels = {
  summary: "个人简介",
  experience: "工作经历",
  projects: "项目经历",
  education: "教育经历",
  educationAcademic: "教育背景",
  skills: "技能",
  skillsProfessional: "专业技能",
  intent: "求职意向",
  otherInfo: "其他信息",
  emptyPreview: "在左侧填写内容，这里会实时预览",
  present: "至今",
  month: "月",
  rank: "排名",
  courses: "主修课程",
  honors: "荣誉",
  namePlaceholder: "你的姓名",
  headlinePlaceholder: "求职头衔",
  companyPlaceholder: "公司名称",
  rolePlaceholder: "职位",
  projectPlaceholder: "项目名称",
  schoolPlaceholder: "学校名称",
  pageBreak: "分页",
  targetRole: "目标岗位",
  targetCity: "期望城市",
  expectedSalary: "期望薪资",
  jobType: "工作类型",
  experienceYears: "工作年限",
  resumeFallback: "简历",
  other: "其他",
  entry: "条目",
  link: "链接",
  colon: "：",
  listSeparator: "、",
};

const EN_LABELS: ResumeLabels = {
  summary: "SUMMARY",
  experience: "EXPERIENCE",
  projects: "PROJECTS",
  education: "EDUCATION",
  educationAcademic: "EDUCATION",
  skills: "SKILLS",
  skillsProfessional: "SKILLS",
  intent: "OBJECTIVE",
  otherInfo: "ADDITIONAL",
  emptyPreview: "Fill in the form on the left to see a live preview",
  present: "Present",
  month: "month",
  rank: "Rank",
  courses: "Coursework",
  honors: "Honors",
  namePlaceholder: "YOUR NAME",
  headlinePlaceholder: "YOUR TITLE",
  companyPlaceholder: "Company",
  rolePlaceholder: "Role",
  projectPlaceholder: "Project",
  schoolPlaceholder: "School",
  pageBreak: "Page break",
  targetRole: "Target role",
  targetCity: "Preferred location",
  expectedSalary: "Expected salary",
  jobType: "Job type",
  experienceYears: "Experience",
  resumeFallback: "Resume",
  other: "Other",
  entry: "Entry",
  link: "Link",
  colon: ": ",
  listSeparator: ", ",
};

function mergeLabels(zh: ResumeLabels, en: ResumeLabels): ResumeLabels {
  const merged = {} as ResumeLabels;
  const keys = Object.keys(zh) as (keyof ResumeLabels)[];
  for (const key of keys) {
    merged[key] = `${zh[key]} / ${en[key]}`;
  }
  merged.colon = "：";
  merged.listSeparator = " / ";
  return merged;
}

const BILINGUAL_LABELS = mergeLabels(ZH_LABELS, EN_LABELS);

export function resumeLabels(language: ResumeLanguage): ResumeLabels {
  if (language === "en") return EN_LABELS;
  if (language === "bilingual") return BILINGUAL_LABELS;
  return ZH_LABELS;
}

/** 英文为空时回退中文；双语按分隔符并列，中文为空时只显示英文。 */
export function pickText(
  language: ResumeLanguage,
  zh: string,
  en: string,
  separator = " / ",
): string {
  const chinese = zh.trim();
  const english = en.trim();
  if (language === "zh" || !english) return chinese;
  if (language === "en") return english;
  return chinese ? `${chinese}${separator}${english}` : english;
}

const JOB_TYPE_MAP: Record<string, string> = {
  全职: "Full-time",
  兼职: "Part-time",
  实习: "Internship",
  合同: "Contract",
  远程: "Remote",
  自由职业: "Freelance",
};

const DEGREE_MAP: Record<string, string> = {
  高中: "High School",
  大专: "Associate",
  专科: "Associate",
  本科: "Bachelor",
  学士: "Bachelor",
  硕士: "Master",
  研究生: "Master",
  博士: "PhD",
};

const SKILL_LEVEL_MAP: Record<Exclude<SkillLevel, "">, string> = {
  了解: "Basic",
  熟练: "Proficient",
  精通: "Expert",
};

/**
 * 英文 / 双语模式下把用户选择的中文枚举值兑换成英文；
 * 用户填了英文覆盖值时优先使用，双语并列显示。
 */
function mapValue(
  language: ResumeLanguage,
  zh: string,
  en: string,
  dictionary: Record<string, string>,
): string {
  const chinese = zh.trim();
  if (en.trim()) return pickText(language, chinese, en);
  if (language === "zh" || !chinese) return chinese;
  const english = dictionary[chinese];
  if (!english) return chinese;
  return language === "en" ? english : `${chinese} / ${english}`;
}

export function localizeJobType(
  language: ResumeLanguage,
  zh: string,
  en = "",
): string {
  return mapValue(language, zh, en, JOB_TYPE_MAP);
}

export function localizeDegree(
  language: ResumeLanguage,
  zh: string,
  en = "",
): string {
  return mapValue(language, zh, en, DEGREE_MAP);
}

export function localizeExperience(
  language: ResumeLanguage,
  zh: string,
  en = "",
): string {
  const chinese = zh.trim();
  if (en.trim()) return pickText(language, chinese, en);
  if (language === "zh" || !chinese) return chinese;
  let english = "";
  if (/^(应届|应届生)$/.test(chinese)) english = "New graduate";
  else if (/^(不限)$/.test(chinese)) english = "Any";
  else {
    const range = chinese.match(/^(\d+)\s*[-–~至]\s*(\d+)\s*年$/);
    if (range) english = `${range[1]}–${range[2]} years`;
    else {
      const above = chinese.match(/^(\d+)\s*年以上$/);
      if (above) english = `${above[1]}+ years`;
      else {
        const exact = chinese.match(/^(\d+)\s*年$/);
        if (exact) english = `${exact[1]} years`;
      }
    }
  }
  if (!english) return chinese;
  return language === "en" ? english : `${chinese} / ${english}`;
}

export function localizeSkillLevel(
  language: ResumeLanguage,
  level: SkillLevel,
): string {
  if (!level || language === "zh") return level;
  const english = SKILL_LEVEL_MAP[level];
  return language === "en" ? english : `${level} / ${english}`;
}

function localizeEnd(language: ResumeLanguage, end: string): string {
  const value = end.trim();
  if (!value) return value;
  if (/^(至今|现在|今)$/.test(value)) {
    const labels = resumeLabels(language);
    return language === "zh" ? value : labels.present;
  }
  return value;
}

/**
 * 把英文覆盖层与语言设置合并成可直接交给模板渲染的 Resume 视图。
 * `placeholders: false` 用于 ATS 导出，避免把表单占位文字当成真实内容。
 */
export function localizedResume(
  resume: Resume,
  options: { placeholders?: boolean } = {},
): Resume {
  const placeholders = options.placeholders !== false;
  const language = normalizeResumeLanguage(resume.language);
  const labels = resumeLabels(language);
  const translation = resume.translation ?? createEmptyTranslation();
  const inline = (zh: string, en: string) => pickText(language, zh, en, " / ");
  const block = (zh: string, en: string) => pickText(language, zh, en, "\n");

  const basicTranslation = translation.basic ?? {
    name: "",
    headline: "",
    summary: "",
    city: "",
  };
  const intentTranslation = translation.intent ?? {
    targetRole: "",
    targetCity: "",
    jobType: "",
    experience: "",
  };

  const skillName = (name: string) =>
    (
      pickText(language, name, translation.skills?.[name] ?? "") || name
    ).trim();
  const groupName = (name: string) =>
    name.trim()
      ? (
          pickText(language, name, translation.skillGroups?.[name] ?? "") ||
          name
        ).trim()
      : "";
  const viewSkills = [...new Set(resume.skills.map(skillName))];
  const viewSkillMeta: Record<string, SkillMeta> = {};
  for (const name of resume.skills) {
    const display = skillName(name);
    const meta = resume.skillMeta[name];
    if (meta) {
      viewSkillMeta[display] = {
        level: meta.level,
        group: groupName(meta.group),
      };
    }
  }
  const viewSkillGroups = [
    ...new Set(resume.skillGroups.map(groupName).filter(Boolean)),
  ];

  return {
    ...resume,
    language,
    basic: {
      ...resume.basic,
      name:
        inline(resume.basic.name, basicTranslation.name) ||
        (placeholders ? labels.namePlaceholder : ""),
      headline:
        inline(resume.basic.headline, basicTranslation.headline) ||
        (placeholders ? labels.headlinePlaceholder : ""),
      summary: inline(resume.basic.summary, basicTranslation.summary),
      city: inline(resume.basic.city, basicTranslation.city ?? ""),
    },
    intent: {
      ...resume.intent,
      targetRole: inline(
        resume.intent.targetRole,
        intentTranslation.targetRole,
      ),
      targetCity: inline(resume.intent.targetCity, intentTranslation.targetCity),
      jobType: localizeJobType(
        language,
        resume.intent.jobType,
        intentTranslation.jobType,
      ),
      experience: localizeExperience(
        language,
        resume.intent.experience,
        intentTranslation.experience,
      ),
    },
    experiences: resume.experiences.map((item) => {
      const translated = translation.experiences?.[item.id];
      return {
        ...item,
        company:
          inline(item.company, translated?.company ?? "") ||
          (placeholders ? labels.companyPlaceholder : ""),
        role:
          inline(item.role, translated?.role ?? "") ||
          (placeholders ? labels.rolePlaceholder : ""),
        description: block(item.description, translated?.description ?? ""),
        end: localizeEnd(language, item.end),
      };
    }),
    projects: resume.projects.map((item) => {
      const translated = translation.projects?.[item.id];
      return {
        ...item,
        name:
          inline(item.name, translated?.name ?? "") ||
          (placeholders ? labels.projectPlaceholder : ""),
        role: inline(item.role, translated?.role ?? ""),
        description: block(item.description, translated?.description ?? ""),
        end: localizeEnd(language, item.end),
      };
    }),
    educations: resume.educations.map((item: Education) => {
      const translated = translation.educations?.[item.id];
      return {
        ...item,
        school:
          inline(item.school, translated?.school ?? "") ||
          (placeholders ? labels.schoolPlaceholder : ""),
        major: inline(item.major, translated?.major ?? ""),
        degree: localizeDegree(language, item.degree, translated?.degree ?? ""),
        ranking: inline(item.ranking, translated?.ranking ?? ""),
        courses: inline(item.courses, translated?.courses ?? ""),
        honors: inline(item.honors, translated?.honors ?? ""),
        end: localizeEnd(language, item.end),
      };
    }),
    customSections: resume.customSections.map((section) => {
      const translated = translation.customSections?.[section.id];
      return {
        ...section,
        title:
          inline(section.title, translated?.title ?? "") ||
          (placeholders ? labels.otherInfo : ""),
        items: section.items.map((item) => {
          const translatedItem = translated?.items?.[item.id];
          return {
            ...item,
            title: inline(item.title, translatedItem?.title ?? ""),
            subtitle: inline(item.subtitle, translatedItem?.subtitle ?? ""),
            description: block(
              item.description,
              translatedItem?.description ?? "",
            ),
          };
        }),
      };
    }),
    skills: viewSkills,
    skillMeta: viewSkillMeta,
    skillGroups: viewSkillGroups,
  };
}
