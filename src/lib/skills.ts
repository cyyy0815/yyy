import {
  localizeSkillLevel,
  normalizeResumeLanguage,
  type ResumeLanguage,
} from "./language";
import type { Resume, SkillLevel, SkillMeta } from "./types";

export type SkillEntry = {
  name: string;
  level: SkillLevel;
};

export type SkillGroupView = {
  /** 空字符串表示未分组 */
  title: string;
  skills: SkillEntry[];
};

type SkillSource = Pick<Resume, "skills" | "skillMeta" | "skillGroups">;

export function skillMetaOf(resume: SkillSource, name: string): SkillMeta {
  return resume.skillMeta[name] ?? { level: "", group: "" };
}

/**
 * 按分组顺序整理技能；分组名只作为展示层，技能本身仍以扁平 `skills` 为准。
 * `includeEmpty` 用于编辑表单，让刚创建、还没放技能的分组也能显示。
 */
export function groupSkills(
  resume: SkillSource,
  options: { includeEmpty?: boolean } = {},
): SkillGroupView[] {
  const buckets = new Map<string, SkillEntry[]>();
  for (const title of resume.skillGroups) {
    if (!buckets.has(title)) buckets.set(title, []);
  }

  for (const name of resume.skills) {
    const meta = resume.skillMeta[name];
    const title = meta?.group ?? "";
    const list = buckets.get(title) ?? [];
    list.push({ name, level: meta?.level ?? "" });
    buckets.set(title, list);
  }

  const groups: SkillGroupView[] = [];
  for (const title of resume.skillGroups) {
    const skills = buckets.get(title) ?? [];
    if (skills.length === 0 && !options.includeEmpty) continue;
    groups.push({ title, skills });
    buckets.delete(title);
  }
  for (const [title, skills] of buckets) {
    if (!title) continue;
    if (skills.length === 0 && !options.includeEmpty) continue;
    groups.push({ title, skills });
  }
  const ungrouped = buckets.get("") ?? [];
  if (ungrouped.length > 0 || options.includeEmpty) {
    groups.push({ title: "", skills: ungrouped });
  }
  return groups;
}

/** 分组、熟练度都为空时保持旧的纯文本渲染，避免改变老简历的排版。 */
export function hasSkillDetails(resume: SkillSource): boolean {
  if (resume.skillGroups.length > 0) return true;
  return Object.values(resume.skillMeta).some(
    (meta) => meta.level !== "" || meta.group !== "",
  );
}

/** 纯文本模板里使用的展示形式；英文 / 双语时翻译熟练度。 */
export function formatSkill(
  entry: SkillEntry,
  language: ResumeLanguage = "zh",
): string {
  const lang = normalizeResumeLanguage(language);
  if (!entry.level) return entry.name;
  const level = localizeSkillLevel(lang, entry.level);
  return lang === "en" ? `${entry.name} (${level})` : `${entry.name}（${level}）`;
}

export function skillGroupKey(group: SkillGroupView): string {
  return group.title || "__ungrouped";
}
