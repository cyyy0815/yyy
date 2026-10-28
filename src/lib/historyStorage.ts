/**
 * 撤销 / 重做栈的会话持久化。
 *
 * 只写入 sessionStorage：刷新页面后仍可继续撤销，关闭标签页即清空，
 * 不会把编辑历史长期留在本机。快照含整份简历，因此按条数和字符数双重限制，
 * 照片较大时自动丢弃最旧的步骤，避免挤占配额。
 */
import { isNewerResumeSchema, RESUME_SCHEMA_VERSION } from "./schema";
import { normalizeResume } from "./storage";
import type { Resume } from "./types";

export const HISTORY_STORAGE_KEY = "resume-workshop:history:v1";
export const HISTORY_STORAGE_FORMAT = "resume-workshop-history";
export const HISTORY_STORAGE_VERSION = 1;
export const HISTORY_MAX_SNAPSHOTS = 20;
export const HISTORY_MAX_CHARS = 1_500_000;

export type ResumeHistorySnapshot = {
  resume: Resume;
  isSample: boolean;
};

export type StoredResumeHistory = {
  past: ResumeHistorySnapshot[];
  future: ResumeHistorySnapshot[];
};

type Payload = {
  format: typeof HISTORY_STORAGE_FORMAT;
  version: typeof HISTORY_STORAGE_VERSION;
  schemaVersion: number;
  savedAt: number;
  past: ResumeHistorySnapshot[];
  future: ResumeHistorySnapshot[];
};

type PackOptions = {
  limit?: number;
  maxChars?: number;
  now?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function trim(state: StoredResumeHistory, limit: number): StoredResumeHistory {
  // past / future 都是栈，末尾最接近当前状态，超出时丢弃最旧的一端。
  return {
    past: state.past.slice(-limit),
    future: state.future.slice(-limit),
  };
}

/** 序列化为带版本号的载荷；为空或单份快照超过预算时返回 null。 */
export function packResumeHistory(
  state: StoredResumeHistory,
  options: PackOptions = {},
): string | null {
  const limit = Math.max(1, options.limit ?? HISTORY_MAX_SNAPSHOTS);
  const maxChars = Math.max(1, options.maxChars ?? HISTORY_MAX_CHARS);
  let { past, future } = trim(state, limit);
  if (past.length === 0 && future.length === 0) return null;

  const build = (): string =>
    JSON.stringify({
      format: HISTORY_STORAGE_FORMAT,
      version: HISTORY_STORAGE_VERSION,
      schemaVersion: RESUME_SCHEMA_VERSION,
      savedAt: options.now ?? Date.now(),
      past,
      future,
    } satisfies Payload);

  let text = build();
  while (text.length > maxChars) {
    if (past.length > 1) {
      past = past.slice(1);
    } else if (future.length > 1) {
      future = future.slice(1);
    } else {
      return null;
    }
    text = build();
  }
  return text;
}

function parseSnapshots(value: unknown): ResumeHistorySnapshot[] {
  if (!Array.isArray(value)) return [];
  const snapshots: ResumeHistorySnapshot[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isRecord(item.resume)) continue;
    // 更新版本的数据不在这里猜结构，直接忽略这一份历史。
    if (isNewerResumeSchema(item.resume)) continue;
    snapshots.push({
      resume: normalizeResume(item.resume),
      isSample: item.isSample === true,
    });
  }
  return snapshots.slice(-HISTORY_MAX_SNAPSHOTS);
}

export function parseResumeHistory(text: string | null): StoredResumeHistory | null {
  if (!text) return null;
  try {
    const data: unknown = JSON.parse(text);
    if (!isRecord(data)) return null;
    if (
      data.format !== HISTORY_STORAGE_FORMAT ||
      data.version !== HISTORY_STORAGE_VERSION
    ) {
      return null;
    }
    if (isNewerResumeSchema(data)) return null;
    const past = parseSnapshots(data.past);
    const future = parseSnapshots(data.future);
    if (past.length === 0 && future.length === 0) return null;
    return { past, future };
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function loadResumeHistory(): StoredResumeHistory | null {
  const storage = getSessionStorage();
  if (!storage) return null;
  try {
    return parseResumeHistory(storage.getItem(HISTORY_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** 写入会话存储；为空时删除旧值。配额不足时逐步丢弃最旧步骤再试。 */
export function saveResumeHistory(state: StoredResumeHistory): boolean {
  const storage = getSessionStorage();
  if (!storage) return false;
  let maxChars = HISTORY_MAX_CHARS;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const text = packResumeHistory(state, { maxChars });
    if (!text) {
      clearResumeHistory();
      return true;
    }
    try {
      storage.setItem(HISTORY_STORAGE_KEY, text);
      return true;
    } catch {
      maxChars = Math.floor(maxChars / 2);
    }
  }
  return false;
}

export function clearResumeHistory(): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // ignore
  }
}
