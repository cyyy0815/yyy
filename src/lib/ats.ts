import { extractJdKeywords } from "./jdMatch";
import {
  localizedResume,
  resumeLabels,
  type ResumeLabels,
} from "./language";
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

function buildHeader(
  resume: Resume,
  labels: ResumeLabels,
): {
  name: string;
  headline: string;
  contact: string;
  links: string;
} {
  return {
    name:
      resume.basic.name.trim() ||
      resume.basic.headline.trim() ||
      labels.resumeFallback,
    headline: resume.basic.name.trim() ? resume.basic.headline.trim() : "",
    contact: joinParts(
      [resume.basic.email, resume.basic.phone, resume.basic.city],
      " · ",
    ),
    links: joinParts([resume.basic.website, resume.basic.github], " · "),
  };
}

function buildSections(resume: Resume, labels: ResumeLabels): AtsSection[] {
  const sections: AtsSection[] = [];

  const intentLines: string[] = [];
  if (resume.intent.targetRole.trim()) {
    intentLines.push(
      `${labels.targetRole}${labels.colon}${resume.intent.targetRole.trim()}`,
    );
  }
  if (resume.intent.targetCity.trim()) {
    intentLines.push(
      `${labels.targetCity}${labels.colon}${resume.intent.targetCity.trim()}`,
    );
  }
  const salary = salaryText(resume);
  if (salary) {
    intentLines.push(`${labels.expectedSalary}${labels.colon}${salary}`);
  }
  if (resume.intent.jobType.trim()) {
    intentLines.push(
      `${labels.jobType}${labels.colon}${resume.intent.jobType.trim()}`,
    );
  }
  if (resume.intent.experience.trim()) {
    intentLines.push(
      `${labels.experienceYears}${labels.colon}${resume.intent.experience.trim()}`,
    );
  }
  if (intentLines.length > 0 && isSectionVisible(resume, "intent")) {
    sections.push({ title: labels.intent, lines: intentLines, entries: [] });
  }

  const summary = resume.basic.summary.trim();
  if (summary && isSectionVisible(resume, "summary")) {
    sections.push({
      title: labels.summary,
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
      details.push(
        `${labels.rank}${labels.colon}${education.ranking.trim()}`,
      );
    }
    if (education.courses.trim()) {
      details.push(
        `${labels.courses}${labels.colon}${education.courses.trim()}`,
      );
    }
    if (education.honors.trim()) {
      details.push(
        `${labels.honors}${labels.colon}${education.honors.trim()}`,
      );
    }
    if (heading || details.length > 0) {
      educations.push({
        heading: heading || labels.education,
        details,
        link: "",
        description: [],
      });
    }
  }
  if (educations.length > 0 && isSectionVisible(resume, "education")) {
    sections.push({ title: labels.education, lines: [], entries: educations });
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
        heading: heading || labels.experience,
        details: [],
        link: "",
        description,
      });
    }
  }
  if (experiences.length > 0 && isSectionVisible(resume, "experience")) {
    sections.push({ title: labels.experience, lines: [], entries: experiences });
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
        heading: heading || labels.projects,
        details: [],
        link: project.link.trim(),
        description,
      });
    }
  }
  if (projects.length > 0 && isSectionVisible(resume, "projects")) {
    sections.push({ title: labels.projects, lines: [], entries: projects });
  }

  for (const custom of resume.customSections) {
    if (!custom.visible || !isSectionVisible(resume, "custom")) continue;
    const entries: AtsEntry[] = [];
    for (const item of custom.items) {
      const heading = joinParts([item.title, item.subtitle, item.date]);
      const description = descriptionLines(item.description);
      if (heading || description.length > 0 || item.link.trim()) {
        entries.push({
          heading: heading || custom.title.trim() || labels.entry,
          details: [],
          link: item.link.trim(),
          description,
        });
      }
    }
    if (entries.length > 0) {
      sections.push({
        title: custom.title.trim() || labels.other,
        lines: [],
        entries,
      });
    }
  }

  const groups = groupSkills(resume);
  if (groups.length > 0 && isSectionVisible(resume, "skills")) {
    const onlyUngrouped = groups.length === 1 && !groups[0].title;
    const lines = groups.map((group) => {
      const names = group.skills
        .map((skill) => skill.name)
        .join(labels.listSeparator);
      if (onlyUngrouped) return names;
      return group.title
        ? `${group.title}${labels.colon}${names}`
        : `${labels.other}${labels.colon}${names}`;
    });
    sections.push({ title: labels.skills, lines, entries: [] });
  }

  return sections;
}

function sectionToPlainText(
  section: AtsSection,
  labels: ResumeLabels,
): string {
  const parts = [section.title, ...section.lines];
  for (const entry of section.entries) {
    parts.push(entry.heading);
    parts.push(...entry.details);
    if (entry.link) parts.push(`${labels.link}${labels.colon}${entry.link}`);
    parts.push(...entry.description);
  }
  return parts.join("\n");
}

function sectionToMarkdown(
  section: AtsSection,
  labels: ResumeLabels,
): string {
  const lines = [`## ${section.title}`, ...section.lines];
  for (const entry of section.entries) {
    lines.push("", `### ${entry.heading}`);
    lines.push(...entry.details);
    if (entry.link) lines.push(`${labels.link}${labels.colon}${entry.link}`);
    lines.push(...entry.description);
  }
  return lines.join("\n");
}

/** ATS 友好的纯文本：线性结构、无分栏、无照片、无技能等级装饰。 */
export function resumeToPlainText(resume: Resume): string {
  const view = localizedResume(resume, { placeholders: false });
  const labels = resumeLabels(view.language);
  const header = buildHeader(view, labels);
  const blocks = [
    [header.name, header.headline, header.contact, header.links]
      .filter(Boolean)
      .join("\n"),
    ...buildSections(view, labels).map((section) =>
      sectionToPlainText(section, labels),
    ),
  ].filter(Boolean);
  return `${blocks.join("\n\n")}\n`;
}

/** Markdown 版本使用标准标题与条目，适合在线表单或人工阅读。 */
export function resumeToMarkdown(resume: Resume): string {
  const view = localizedResume(resume, { placeholders: false });
  const labels = resumeLabels(view.language);
  const header = buildHeader(view, labels);
  const blocks = [
    [`# ${header.name}`, header.headline, header.contact, header.links]
      .filter(Boolean)
      .join("\n"),
    ...buildSections(view, labels).map((section) =>
      sectionToMarkdown(section, labels),
    ),
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
