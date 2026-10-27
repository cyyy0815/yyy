import { normalizeResume } from "./storage";
import { isTemplateId, newId, type Resume, type TemplateId } from "./types";

/**
 * 多份简历的「非当前」文档快照。
 * 当前文档仍保存在 resume-workshop:v1 / resume-workshop:template，
 * 这样旧版本和现有数据可以无缝继续使用，也不需要重复存储当前文档。
 */
export const LIBRARY_KEY = "resume-workshop:library:v1";

export type StoredDocument = {
  id: string;
  title: string;
  template: TemplateId;
  resume: Resume;
};

export type ResumeLibrary = {
  activeId: string;
  activeTitle: string;
  others: StoredDocument[];
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeDocument(value: unknown): StoredDocument | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = asString(raw.id);
  if (!id) return null;
  return {
    id,
    title: asString(raw.title).trim().slice(0, 60) || "我的简历",
    template: isTemplateId(raw.template) ? raw.template : "modern",
    resume: normalizeResume(raw.resume),
  };
}

/** 只读取除当前文档外的快照；当前文档仍以 v1 为准。 */
export function loadResumeLibrary(): ResumeLibrary | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const source = data as Record<string, unknown>;
    const activeId = asString(source.activeId) || newId();
    const seen = new Set([activeId]);
    const others: StoredDocument[] = [];
    for (const value of Array.isArray(source.others) ? source.others : []) {
      const document = normalizeDocument(value);
      if (!document || seen.has(document.id)) continue;
      seen.add(document.id);
      others.push(document);
    }
    return {
      activeId,
      activeTitle: asString(source.activeTitle).trim().slice(0, 60),
      others,
    };
  } catch {
    return null;
  }
}

export function saveResumeLibrary(library: ResumeLibrary): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
    return true;
  } catch {
    return false;
  }
}

export function clearResumeLibrary(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LIBRARY_KEY);
  } catch {
    // ignore
  }
}

/** 单份简历时用姓名作标题；示例简历固定显示为「示例简历」。 */
export function deriveResumeTitle(resume: Resume, isSample: boolean): string {
  if (isSample) return "示例简历";
  return resume.basic.name.trim().slice(0, 60) || "我的简历";
}

export function uniqueTitle(base: string, titles: string[]): string {
  const normalized = base.trim().slice(0, 60) || "我的简历";
  if (!titles.includes(normalized)) return normalized;
  let index = 2;
  while (titles.includes(`${normalized} ${index}`)) index += 1;
  return `${normalized} ${index}`;
}
