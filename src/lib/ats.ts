import { extractJdKeywords } from "./jdMatch";
import { isSectionVisible } from "./layout";
import { textHasSkill } from "./matching";
import { groupSkills } from "./skills";
import { safeFileName } from "./storage";
import type { Resume } from "./types";

export type AtsFormat = "text" | "markdown";

export const ATS_FORMATS: { id: AtsFormat; label: string; extension: "txt" | "md" }[] =
  [
    { id: "text", label: "纯文本", extension: "txt" },
    { id: "markdown", label: "Markdown", extension: "md" },
  ];

type AtsEntry = {
  heading: string;
  details: string[];
  link: string;
  description: string[];
};

type AtsSection = {
  title: string;
  lines: string[];
  entries: AtsEntry[];
};

function joinParts(parts: string[], separator = " | "): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(separator);
}

function dateRange(start: string, end: string): string {
  const from = start.trim();
  const to = end.trim();
  if (from && to) return `${from} – ${to}`;
  return from || to;
}

function descriptionLines(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return lines;
  return lines.map((line) => (/^[-•*]\s/.test(line) ? line : `- ${line}`));
}

function salaryText(resume: Resume): string {
  const { salaryMin, salaryMax } = resume.intent;
  if (!salaryMin && !salaryMax) return "";
  return `${salaryMin || "?"}–${salaryMax || "?"}K`;
}

function buildHeader(resume: Resume): {
  name: string;
  headline: string;
  contact: string;
  links: string;
} {
  return {
    name:
      resume.basic.name.trim() ||
      resume.basic.headline.trim() ||
      "简历",
    headline: resume.basic.name.trim() ? resume.basic.headline.trim() : "",
    contact: joinParts(
      [resume.basic.email, resume.basic.phone, resume.basic.city],
      " · ",
    ),
    links: joinParts([resume.basic.website, resume.basic.github], " · "),
  };
}

function buildSections(resume: Resume): AtsSection[] {
  const sections: AtsSection[] = [];

  const intentLines: string[] = [];
  if (resume.intent.targetRole.trim()) {
    intentLines.push(`目标岗位：${resume.intent.targetRole.trim()}`);
  }
  if (resume.intent.targetCity.trim()) {
    intentLines.push(`期望城市：${resume.intent.targetCity.trim()}`);
  }
  const salary = salaryText(resume);
  if (salary) intentLines.push(`期望薪资：${salary}`);
  if (resume.intent.jobType.trim()) {
    intentLines.push(`工作类型：${resume.intent.jobType.trim()}`);
  }
  if (resume.intent.experience.trim()) {
    intentLines.push(`工作年限：${resume.intent.experience.trim()}`);
  }
  if (intentLines.length > 0 && isSectionVisible(resume, "intent")) {
    sections.push({ title: "求职意向", lines: intentLines, entries: [] });
  }

  const summary = resume.basic.summary.trim();
  if (summary && isSectionVisible(resume, "summary")) {
    sections.push({
      title: "个人简介",
      lines: summary.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
      entries: [],
    });
  }

  const educations: AtsEntry[] = [];
  for (const education of resume.educations) {
    const heading = joinParts([
      education.school,
      education.major,
      education.degree,
      dateRange(education.start, education.end),
    ]);
    const details: string[] = [];
    if (education.gpa.trim()) details.push(`GPA：${education.gpa.trim()}`);
    if (education.ranking.trim()) {
      details.push(`排名：${education.ranking.trim()}`);
    }
    if (education.courses.trim()) {
      details.push(`主修课程：${education.courses.trim()}`);
    }
    if (education.honors.trim()) {
      details.push(`荣誉：${education.honors.trim()}`);
    }
    if (heading || details.length > 0) {
      educations.push({
        heading: heading || "教育经历",
        details,
        link: "",
        description: [],
      });
    }
  }
  if (educations.length > 0 && isSectionVisible(resume, "education")) {
    sections.push({ title: "教育经历", lines: [], entries: educations });
  }

  const experiences: AtsEntry[] = [];
  for (const experience of resume.experiences) {
    const heading = joinParts([
      experience.company,
      experience.role,
      dateRange(experience.start, experience.end),
    ]);
    const description = descriptionLines(experience.description);
    if (heading || description.length > 0) {
      experiences.push({
        heading: heading || "工作经历",
        details: [],
        link: "",
        description,
      });
    }
  }
  if (experiences.length > 0 && isSectionVisible(resume, "experience")) {
    sections.push({ title: "工作经历", lines: [], entries: experiences });
  }

  const projects: AtsEntry[] = [];
  for (const project of resume.projects) {
    const heading = joinParts([
      project.name,
      project.role,
      dateRange(project.start, project.end),
    ]);
    const description = descriptionLines(project.description);
    if (heading || description.length > 0 || project.link.trim()) {
      projects.push({
        heading: heading || "项目经历",
        details: [],
        link: project.link.trim(),
        description,
      });
    }
  }
  if (projects.length > 0 && isSectionVisible(resume, "projects")) {
    sections.push({ title: "项目经历", lines: [], entries: projects });
  }

  for (const custom of resume.customSections) {
    if (!custom.visible || !isSectionVisible(resume, "custom")) continue;
    const entries: AtsEntry[] = [];
    for (const item of custom.items) {
      const heading = joinParts([item.title, item.subtitle, item.date]);
      const description = descriptionLines(item.description);
      if (heading || description.length > 0 || item.link.trim()) {
        entries.push({
          heading: heading || custom.title.trim() || "条目",
          details: [],
          link: item.link.trim(),
          description,
        });
      }
    }
    if (entries.length > 0) {
      sections.push({
        title: custom.title.trim() || "其他",
        lines: [],
        entries,
      });
    }
  }

  const groups = groupSkills(resume);
  if (groups.length > 0 && isSectionVisible(resume, "skills")) {
    const onlyUngrouped = groups.length === 1 && !groups[0].title;
    const lines = groups.map((group) => {
      const names = group.skills.map((skill) => skill.name).join("、");
      if (onlyUngrouped) return names;
      return group.title ? `${group.title}：${names}` : `其他：${names}`;
    });
    sections.push({ title: "技能", lines, entries: [] });
  }

  return sections;
}

function sectionToPlainText(section: AtsSection): string {
  const parts = [section.title, ...section.lines];
  for (const entry of section.entries) {
    parts.push(entry.heading);
    parts.push(...entry.details);
    if (entry.link) parts.push(`链接：${entry.link}`);
    parts.push(...entry.description);
  }
  return parts.join("\n");
}

function sectionToMarkdown(section: AtsSection): string {
  const lines = [`## ${section.title}`, ...section.lines];
  for (const entry of section.entries) {
    lines.push("", `### ${entry.heading}`);
    lines.push(...entry.details);
    if (entry.link) lines.push(`链接：${entry.link}`);
    lines.push(...entry.description);
  }
  return lines.join("\n");
}

/** ATS 友好的纯文本：线性结构、无分栏、无照片、无技能等级装饰。 */
export function resumeToPlainText(resume: Resume): string {
  const header = buildHeader(resume);
  const blocks = [
    [header.name, header.headline, header.contact, header.links]
      .filter(Boolean)
      .join("\n"),
    ...buildSections(resume).map(sectionToPlainText),
  ].filter(Boolean);
  return `${blocks.join("\n\n")}\n`;
}

/** Markdown 版本使用标准标题与条目，适合在线表单或人工阅读。 */
export function resumeToMarkdown(resume: Resume): string {
  const header = buildHeader(resume);
  const blocks = [
    [`# ${header.name}`, header.headline, header.contact, header.links]
      .filter(Boolean)
      .join("\n"),
    ...buildSections(resume).map(sectionToMarkdown),
  ].filter(Boolean);
  return `${blocks.join("\n\n")}\n`;
}

export function resumeToAts(resume: Resume, format: AtsFormat): string {
  return format === "markdown"
    ? resumeToMarkdown(resume)
    : resumeToPlainText(resume);
}

export type AtsCoverage = {
  total: number;
  matched: string[];
  missing: string[];
  score: number;
};

/** 检查导出的文本里是否出现 JD 关键词；不判断真实技能掌握程度。 */
export function analyzeAtsCoverage(text: string, jd: string): AtsCoverage {
  const keywords = extractJdKeywords(jd);
  const matched = keywords.filter((keyword) => textHasSkill(text, keyword));
  const missing = keywords.filter((keyword) => !matched.includes(keyword));
  return {
    total: keywords.length,
    matched,
    missing,
    score: keywords.length
      ? Math.round((matched.length / keywords.length) * 100)
      : 0,
  };
}

export function downloadAtsResume(
  title: string,
  resume: Resume,
  format: AtsFormat,
): void {
  const meta = ATS_FORMATS.find((item) => item.id === format) ?? ATS_FORMATS[0];
  const content = resumeToAts(resume, format);
  const blob = new Blob([content], {
    type:
      format === "markdown"
        ? "text/markdown;charset=utf-8"
        : "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName(title)}-ATS.${meta.extension}`;
  anchor.click();
  URL.revokeObjectURL(url);
}
