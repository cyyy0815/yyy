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
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

/** 把任意来源的数据收敛成合法的 Resume，避免旧版本或坏文件导致崩溃。 */
export function normalizeResume(input: unknown): Resume {
  const base = createEmptyResume();
  if (!isRecord(input)) return base;

  const raw = input;
  const basic = asRecord(raw.basic);
  const intent = asRecord(raw.intent);
  const theme = asRecord(raw.theme);

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
    educations: asArray<unknown>(raw.educations).filter(isRecord).map((item) => ({
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
    experiences: asArray<unknown>(raw.experiences).filter(isRecord).map((item) => ({
      id: asString(item.id) || newId(),
      company: asString(item.company),
      role: asString(item.role),
      start: asString(item.start),
      end: asString(item.end),
      description: asString(item.description),
      ...(item.pageBreakBefore === true ? { pageBreakBefore: true } : {}),
    })),
    projects: asArray<unknown>(raw.projects).filter(isRecord).map((item) => ({
      id: asString(item.id) || newId(),
      name: asString(item.name),
      role: asString(item.role),
      start: asString(item.start),
      end: asString(item.end),
      description: asString(item.description),
      link: asString(item.link),
      ...(item.pageBreakBefore === true ? { pageBreakBefore: true } : {}),
    })),
    customSections: asArray<unknown>(raw.customSections)
      .filter(isRecord)
      .map((section) => ({
        id: asString(section.id) || newId(),
        title: asString(section.title),
        visible: section.visible !== false,
        items: asArray<unknown>(section.items).filter(isRecord).map((item) => ({
          id: asString(item.id) || newId(),
          title: asString(item.title),
          subtitle: asString(item.subtitle),
          date: asString(item.date),
          description: asString(item.description),
          link: asString(item.link),
        })),
      })),
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

export type ArchiveDocument = {
  id: string;
  title: string;
  template: TemplateId;
  resume: Resume;
};

export type ResumeArchive = {
  format: "resume-workshop";
  version: 2;
  exportedAt: string;
  activeId: string;
  documents: ArchiveDocument[];
};

const ARCHIVE_FORMAT = "resume-workshop";
const ARCHIVE_VERSION = 2;

function safeFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned || "我的简历";
}

/** 导出全部简历（含当前文档）为一份备份文件。 */
export function downloadResumeArchive(
  documents: ArchiveDocument[],
  activeId: string,
  currentTitle: string,
): void {
  const payload: ResumeArchive = {
    format: ARCHIVE_FORMAT,
    version: ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    activeId,
    documents,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName(currentTitle)}-全部简历.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type ImportResult =
  | { ok: true; resume: Resume; template?: TemplateId }
  | { ok: false; error: string };

export type ImportFileResult =
  | { ok: true; kind: "single"; resume: Resume; template?: TemplateId }
  | {
      ok: true;
      kind: "library";
      documents: ArchiveDocument[];
      activeId: string;
    }
  | { ok: false; error: string };

const BASIC_KEYS = [
  "name",
  "headline",
  "email",
  "phone",
  "city",
  "website",
  "github",
  "summary",
  "photo",
] as const;

const ENTRY_ARRAYS: [string, string][] = [
  ["educations", "教育经历"],
  ["experiences", "工作经历"],
  ["projects", "项目经历"],
  ["customSections", "自定义板块"],
];

/** 不追求完整 schema，只拦截明显不是本工具导出的结构。 */
function checkImportShape(data: unknown): string | null {
  if (!isRecord(data)) return "文件内容必须是 JSON 对象";
  if (!("basic" in data)) return "文件格式不正确：缺少 basic 字段";
  const basic = data.basic;
  if (!isRecord(basic)) return "基本信息（basic）必须是对象";
  if (!BASIC_KEYS.some((key) => key in basic)) {
    return "基本信息（basic）缺少简历字段";
  }
  for (const [key, label] of ENTRY_ARRAYS) {
    const value = data[key];
    if (value === undefined) continue;
    if (!Array.isArray(value)) return `${label}（${key}）必须是数组`;
    if (value.some((item) => !isRecord(item))) {
      return `${label}（${key}）中存在无效条目`;
    }
  }
  if (data.skills !== undefined) {
    if (!Array.isArray(data.skills)) return "技能（skills）必须是数组";
    if (data.skills.some((skill) => typeof skill !== "string")) {
      return "技能（skills）中存在非文本条目";
    }
  }
  if (data.theme !== undefined && !isRecord(data.theme)) {
    return "主题色（theme）必须是对象";
  }
  return null;
}

function parseJson(
  text: string,
): { ok: true; data: unknown } | { ok: false; error: string } {
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: "文件过大（超过 5 MB），请检查是否选错了文件" };
  }
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, error: "无法解析该文件，请选择由本工具导出的 JSON" };
  }
}

function toSingleImport(data: unknown): ImportResult {
  const shapeError = checkImportShape(data);
  if (shapeError) return { ok: false, error: shapeError };
  const template = (data as { template?: unknown }).template;
  return {
    ok: true,
    resume: normalizeResume(data),
    ...(isTemplateId(template) ? { template } : {}),
  };
}

/** 旧版单份简历导入；保持原行为，`template` 为可选。 */
export function parseResumeJSON(text: string): ImportResult {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  return toSingleImport(parsed.data);
}

function parseArchive(data: Record<string, unknown>): ImportFileResult {
  const rawDocuments = Array.isArray(data.documents) ? data.documents : [];
  if (rawDocuments.length === 0) {
    return { ok: false, error: "备份文件里没有任何简历" };
  }
  const documents: ArchiveDocument[] = [];
  const seenIds = new Set<string>();
  for (let index = 0; index < rawDocuments.length; index += 1) {
    const item = rawDocuments[index];
    if (!isRecord(item)) {
      return { ok: false, error: `第 ${index + 1} 份简历格式不正确` };
    }
    const shapeError = checkImportShape(item.resume);
    if (shapeError) {
      return { ok: false, error: `第 ${index + 1} 份简历：${shapeError}` };
    }
    const rawId = asString(item.id).trim();
    const id = rawId && !seenIds.has(rawId) ? rawId : newId();
    seenIds.add(id);
    const title = asString(item.title).trim().slice(0, 60);
    documents.push({
      id,
      title: title || `简历 ${index + 1}`,
      template: isTemplateId(item.template) ? item.template : "modern",
      resume: normalizeResume(item.resume),
    });
  }
  const requested = asString(data.activeId).trim();
  return {
    ok: true,
    kind: "library",
    documents,
    activeId: documents.some((document) => document.id === requested)
      ? requested
      : documents[0].id,
  };
}

/** 兼容导入：旧版单份简历 JSON 与「全部简历」备份。 */
export function parseImportFile(text: string): ImportFileResult {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  const data = parsed.data;
  if (isRecord(data) && Array.isArray(data.documents)) {
    return parseArchive(data);
  }
  const single = toSingleImport(data);
  if (!single.ok) return single;
  return {
    ok: true,
    kind: "single",
    resume: single.resume,
    ...(single.template ? { template: single.template } : {}),
  };
}
