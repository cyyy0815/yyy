import { isPhotoDataUrl } from "./photo";
import { normalizeAccent } from "./theme";
import {
  createEmptyResume,
  isTemplateId,
  newId,
  type Resume,
  type TemplateId,
} from "./types";

export const STORAGE_KEY = "resume-workshop:v1";
export const LAST_SAVED_KEY = "resume-workshop:last-saved-at";
export const FIRST_USE_KEY = "resume-workshop:first-use-at";
export const LAST_EXPORT_KEY = "resume-workshop:last-export-at";
export const BACKUP_SNOOZE_KEY = "resume-workshop:backup-snooze-at";

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
      photo: isPhotoDataUrl(basic.photo) ? basic.photo : "",
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
      gpa: asString(item.gpa),
      ranking: asString(item.ranking),
      courses: asString(item.courses),
      honors: asString(item.honors),
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
      start: asString(item.start),
      end: asString(item.end),
      description: asString(item.description),
      link: asString(item.link),
      ...(item.pageBreakBefore === true ? { pageBreakBefore: true } : {}),
    })),
    customSections: asArray<Record<string, unknown>>(raw.customSections).map(
      (section) => ({
        id: asString(section.id) || newId(),
        title: asString(section.title),
        visible: section.visible !== false,
        items: asArray<Record<string, unknown>>(section.items).map((item) => ({
          id: asString(item.id) || newId(),
          title: asString(item.title),
          subtitle: asString(item.subtitle),
          date: asString(item.date),
          description: asString(item.description),
          link: asString(item.link),
        })),
      }),
    ),
    skills: asArray<unknown>(raw.skills)
      .filter((skill): skill is string => typeof skill === "string")
      .map((skill) => skill.trim())
      .filter(Boolean),
    theme: { accent: normalizeAccent(theme.accent) },
  };
}

/** 只读原始字符串：用于多标签页保存前比对，不做解析。 */
export function readStoredResumeRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function readTimestamp(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function readLastSavedAt(): number | null {
  return readTimestamp(LAST_SAVED_KEY);
}

export function readFirstUseAt(): number | null {
  return readTimestamp(FIRST_USE_KEY);
}

export function readLastExportAt(): number | null {
  return readTimestamp(LAST_EXPORT_KEY);
}

export function readBackupSnoozeAt(): number | null {
  return readTimestamp(BACKUP_SNOOZE_KEY);
}

export function recordExport(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function snoozeBackupReminder(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BACKUP_SNOOZE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
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

export function saveResume(resume: Resume): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
    window.localStorage.setItem(LAST_SAVED_KEY, String(Date.now()));
    if (!window.localStorage.getItem(FIRST_USE_KEY)) {
      window.localStorage.setItem(FIRST_USE_KEY, String(Date.now()));
    }
    return true;
  } catch {
    // 隐私模式、配额已满或存储被禁用：交给调用方提示用户导出备份
    return false;
  }
}

export function clearResume(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LAST_SAVED_KEY);
  } catch {
    // ignore
  }
}

export function downloadResumeJSON(
  resume: Resume,
  template?: TemplateId,
): void {
  const payload = template ? { ...resume, template } : resume;
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
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
  | { ok: true; resume: Resume; template?: TemplateId }
  | { ok: false; error: string };

export function parseResumeJSON(text: string): ImportResult {
  try {
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== "object" || !("basic" in data)) {
      return { ok: false, error: "文件格式不正确：缺少 basic 字段" };
    }
    const template = (data as { template?: unknown }).template;
    return {
      ok: true,
      resume: normalizeResume(data),
      ...(isTemplateId(template) ? { template } : {}),
    };
  } catch {
    return { ok: false, error: "无法解析该文件，请选择由本工具导出的 JSON" };
  }
}
