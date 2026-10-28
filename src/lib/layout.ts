import {
  DEFAULT_SECTION_ORDER,
  RESUME_SECTION_KEYS,
  type CustomItem,
  type CustomSection,
  type Resume,
  type ResumeLayout,
  type ResumeSectionKey,
} from "./types";

export const SECTION_LABELS: Record<ResumeSectionKey, string> = {
  summary: "个人简介",
  experience: "工作经历",
  projects: "项目经历",
  custom: "自定义板块",
  education: "教育经历",
  skills: "专业技能",
  intent: "求职意向",
};

/** 一页适配里优先建议隐藏的板块：不影响工作与教育等核心信息。 */
export const FIT_SUGGESTED_SECTIONS: ResumeSectionKey[] = ["intent", "custom"];

export function isResumeSectionKey(value: unknown): value is ResumeSectionKey {
  return (
    typeof value === "string" &&
    (RESUME_SECTION_KEYS as readonly string[]).includes(value)
  );
}

export function defaultSectionLayout(): ResumeLayout {
  return { order: [...DEFAULT_SECTION_ORDER], hidden: [] };
}

/**
 * 收敛任意来源的布局：丢弃未知/重复板块，补全缺失项；
 * 旧简历没有 layout 时得到默认顺序且全部显示。
 */
export function normalizeSectionLayout(input: unknown): ResumeLayout {
  const source =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const order: ResumeSectionKey[] = [];
  const seen = new Set<ResumeSectionKey>();
  if (Array.isArray(source.order)) {
    for (const value of source.order) {
      if (!isResumeSectionKey(value) || seen.has(value)) continue;
      seen.add(value);
      order.push(value);
    }
  }
  for (const key of DEFAULT_SECTION_ORDER) {
    if (!seen.has(key)) order.push(key);
  }

  const hidden = new Set<ResumeSectionKey>();
  if (Array.isArray(source.hidden)) {
    for (const value of source.hidden) {
      if (isResumeSectionKey(value)) hidden.add(value);
    }
  }

  return {
    order,
    hidden: DEFAULT_SECTION_ORDER.filter((key) => hidden.has(key)),
  };
}

export function resolveSectionLayout(resume: Resume): ResumeLayout {
  return normalizeSectionLayout(resume.layout);
}

export function customItemHasContent(item: CustomItem): boolean {
  return Boolean(
    item.title.trim() ||
      item.subtitle.trim() ||
      item.date.trim() ||
      item.description.trim() ||
      item.link.trim(),
  );
}

/** 关闭的自定义板块或没有内容的条目不参与展示。 */
export function customSectionHasContent(section: CustomSection): boolean {
  return section.visible && section.items.some(customItemHasContent);
}

export function sectionHasContent(
  resume: Resume,
  key: ResumeSectionKey,
): boolean {
  switch (key) {
    case "summary":
      return Boolean(resume.basic.summary.trim());
    case "experience":
      return resume.experiences.length > 0;
    case "projects":
      return resume.projects.length > 0;
    case "custom":
      return resume.customSections.some(customSectionHasContent);
    case "education":
      return resume.educations.length > 0;
    case "skills":
      return resume.skills.length > 0;
    case "intent":
      return Boolean(
        resume.intent.targetRole.trim() || resume.intent.targetCity.trim(),
      );
  }
}

export function isSectionVisible(resume: Resume, key: ResumeSectionKey): boolean {
  const layout = resolveSectionLayout(resume);
  return !layout.hidden.includes(key) && sectionHasContent(resume, key);
}

export function hasVisibleSection(
  resume: Resume,
  keys: readonly ResumeSectionKey[],
): boolean {
  return keys.some((key) => isSectionVisible(resume, key));
}

/** 按用户布局排序给定板块；布局里缺失的键追加在末尾。 */
export function orderSections(
  resume: Resume,
  keys: readonly ResumeSectionKey[],
): ResumeSectionKey[] {
  const layout = resolveSectionLayout(resume);
  const allowed = new Set(keys);
  const ordered = layout.order.filter((key) => allowed.has(key));
  for (const key of keys) {
    if (!ordered.includes(key)) ordered.push(key);
  }
  return ordered;
}

export function sectionSummary(
  resume: Resume,
  key: ResumeSectionKey,
): string {
  switch (key) {
    case "summary":
      return `${resume.basic.summary.trim().length} 字`;
    case "experience":
      return `${resume.experiences.length} 段`;
    case "projects":
      return `${resume.projects.length} 个`;
    case "custom":
      return `${resume.customSections.filter(customSectionHasContent).length} 个板块`;
    case "education":
      return `${resume.educations.length} 条`;
    case "skills":
      return `${resume.skills.length} 项`;
    case "intent":
      return (
        [resume.intent.targetRole.trim(), resume.intent.targetCity.trim()]
          .filter(Boolean)
          .join(" · ") || "已填写"
      );
  }
}

export function toggleSectionHidden(
  layout: ResumeLayout,
  key: ResumeSectionKey,
): ResumeLayout {
  const hidden = new Set(layout.hidden);
  if (hidden.has(key)) hidden.delete(key);
  else hidden.add(key);
  return {
    ...layout,
    hidden: DEFAULT_SECTION_ORDER.filter((item) => hidden.has(item)),
  };
}

export function moveSectionInLayout(
  layout: ResumeLayout,
  key: ResumeSectionKey,
  direction: -1 | 1,
): ResumeLayout {
  const index = layout.order.indexOf(key);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= layout.order.length) return layout;
  const order = [...layout.order];
  [order[index], order[next]] = [order[next], order[index]];
  return { ...layout, order };
}

/** 一页适配建议：有内容且尚未隐藏的可选板块。 */
export function fitSuggestions(resume: Resume): ResumeSectionKey[] {
  const layout = resolveSectionLayout(resume);
  return FIT_SUGGESTED_SECTIONS.filter(
    (key) => !layout.hidden.includes(key) && sectionHasContent(resume, key),
  );
}
