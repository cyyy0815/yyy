/**
 * 撤销 / 重做栈的会话持久化。
 *
 * 只写入 sessionStorage：刷新页面后仍可继续撤销，关闭标签页即清空，
 * 不会把编辑历史长期留在本机。快照含整份简历，因此按条数和字符数双重限制，
 * 照片较大时自动丢弃最旧的步骤，避免挤占配额。
 */
import { isPhotoDataUrl } from "./photo";
import { isNewerResumeSchema, RESUME_SCHEMA_VERSION } from "./schema";
import { normalizeResume } from "./storage";
import type { Resume } from "./types";

export const HISTORY_STORAGE_KEY = "resume-workshop:history:v1";
export const HISTORY_STORAGE_FORMAT = "resume-workshop-history";
/** v2：照片从每份快照里抽出来单独存一份，避免 base64 在 20 步历史里重复。 */
export const HISTORY_STORAGE_VERSION = 2;
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

/** 序列化时的快照：照片用 photoRef 指向 payload.photos，避免重复。 */
type StoredSnapshot = {
  resume: Resume;
  isSample: boolean;
  photoRef?: number;
};

type Payload = {
  format: typeof HISTORY_STORAGE_FORMAT;
  version: typeof HISTORY_STORAGE_VERSION | 1;
  schemaVersion: number;
  savedAt: number;
  photos?: string[];
  past: StoredSnapshot[];
  future: StoredSnapshot[];
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

  const build = (): string => {
    const photos: string[] = [];
    const photoIndex = new Map<string, number>();
    const encode = (snapshot: ResumeHistorySnapshot): StoredSnapshot => {
      const photo = snapshot.resume.basic.photo;
      if (!photo) {
        return { resume: snapshot.resume, isSample: snapshot.isSample };
      }
      let ref = photoIndex.get(photo);
      if (ref === undefined) {
        ref = photos.length;
        photos.push(photo);
        photoIndex.set(photo, ref);
      }
      // 快照里不再带 base64，只留一个指向 photos 的索引。
      return {
        resume: {
          ...snapshot.resume,
          basic: { ...snapshot.resume.basic, photo: "" },
        },
        isSample: snapshot.isSample,
        photoRef: ref,
      };
    };
    const encodedPast = past.map(encode);
    const encodedFuture = future.map(encode);
    return JSON.stringify({
      format: HISTORY_STORAGE_FORMAT,
      version: HISTORY_STORAGE_VERSION,
      schemaVersion: RESUME_SCHEMA_VERSION,
      savedAt: options.now ?? Date.now(),
      ...(photos.length > 0 ? { photos } : {}),
      past: encodedPast,
      future: encodedFuture,
    } satisfies Payload);
  };

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

function parseSnapshots(value: unknown, photos: string[]): ResumeHistorySnapshot[] {
  if (!Array.isArray(value)) return [];
  const snapshots: ResumeHistorySnapshot[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isRecord(item.resume)) continue;
    // 更新版本的数据不在这里猜结构，直接忽略这一份历史。
    if (isNewerResumeSchema(item.resume)) continue;
    const resume = normalizeResume(item.resume);
    const ref = item.photoRef;
    const photo =
      typeof ref === "number" && Number.isInteger(ref) ? photos[ref] : undefined;
    if (photo) resume.basic.photo = photo;
    snapshots.push({
      resume,
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
    // v1 是旧格式（整份简历重复存），仍可读取；v2 起照片单独存。
    if (
      data.format !== HISTORY_STORAGE_FORMAT ||
      (data.version !== HISTORY_STORAGE_VERSION && data.version !== 1)
    ) {
      return null;
    }
    if (isNewerResumeSchema(data)) return null;
    const photos =
      data.version === HISTORY_STORAGE_VERSION && Array.isArray(data.photos)
        ? data.photos
            .filter((photo): photo is string => isPhotoDataUrl(photo))
            .slice(0, HISTORY_MAX_SNAPSHOTS)
        : [];
    const past = parseSnapshots(data.past, photos);
    const future = parseSnapshots(data.future, photos);
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
