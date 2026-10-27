import { normalizeAccent } from "./theme";
import { createEmptyResume, newId, type Resume } from "./types";

export const STORAGE_KEY = "resume-workshop:v1";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** 把任意来源的数据收敛成合法的 Resume，避免旧版本或坏文件导致崩溃。 */
export function normalizeResume(input: unknown): Resume {
  const base = createEmptyResume();
  if (!input || typeof input !== "object") return base;

  const raw = input as Record<string, unknown>;
  const basic = (raw.basic ?? {}) as Record<string, unknown>;
  const intent = (raw.intent ?? {}) as Record<string, unknown>;
  const theme = (raw.theme ?? {}) as Record<string, unknown>;

  return {
    basic: {
      name: asString(basic.name),
      headline: asString(basic.headline),
      email: asString(basic.email),
      phone: asString(basic.phone),
      city: asString(basic.city),
      website: asString(basic.website),
      github: asString(basic.github),
      summary: asString(basic.summary),
    },
    intent: {
      targetRole: asString(intent.targetRole),
      targetCity: asString(intent.targetCity),
      salaryMin: asString(intent.salaryMin),
      salaryMax: asString(intent.salaryMax),
      jobType: asString(intent.jobType, "全职"),
      experience: asString(intent.experience),
    },
    educations: asArray<Record<string, unknown>>(raw.educations).map((item) => ({
      id: asString(item.id) || newId(),
      school: asString(item.school),
      major: asString(item.major),
      degree: asString(item.degree),
      start: asString(item.start),
      end: asString(item.end),
    })),
    experiences: asArray<Record<string, unknown>>(raw.experiences).map((item) => ({
      id: asString(item.id) || newId(),
      company: asString(item.company),
      role: asString(item.role),
      start: asString(item.start),
      end: asString(item.end),
      description: asString(item.description),
      ...(item.pageBreakBefore === true ? { pageBreakBefore: true } : {}),
    })),
    projects: asArray<Record<string, unknown>>(raw.projects).map((item) => ({
      id: asString(item.id) || newId(),
      name: asString(item.name),
      role: asString(item.role),
      description: asString(item.description),
      link: asString(item.link),
      ...(item.pageBreakBefore === true ? { pageBreakBefore: true } : {}),
    })),
    skills: asArray<unknown>(raw.skills)
      .filter((skill): skill is string => typeof skill === "string")
      .map((skill) => skill.trim())
      .filter(Boolean),
    theme: { accent: normalizeAccent(theme.accent) },
  };
}

export function loadResume(): Resume | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeResume(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveResume(resume: Resume): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
  } catch {
    // 存储不可用或已满时静默失败，不影响编辑
  }
}

export function clearResume(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function downloadResumeJSON(resume: Resume): void {
  const blob = new Blob([JSON.stringify(resume, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${resume.basic.name || "我的简历"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type ImportResult =
  | { ok: true; resume: Resume }
  | { ok: false; error: string };

export function parseResumeJSON(text: string): ImportResult {
  try {
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== "object" || !("basic" in data)) {
      return { ok: false, error: "文件格式不正确：缺少 basic 字段" };
    }
    return { ok: true, resume: normalizeResume(data) };
  } catch {
    return { ok: false, error: "无法解析该文件，请选择由本工具导出的 JSON" };
  }
}
