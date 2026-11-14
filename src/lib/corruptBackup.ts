/**
 * 本机数据损坏时的兜底备份。
 *
 * localStorage 里的简历 / 文档列表 / 投递记录被外力改坏（手工编辑、扩展、半截写入）时，
 * 旧实现把它们当成「没有数据」，随后任意一次保存都会用空集合覆盖掉原始内容。
 * 这里在读取时把无法解析的原始字符串另存一份，覆盖前仍有据可查；
 * 界面通过 `listCorruptBackups()` 给出提示与下载入口。
 */
const BACKUP_PREFIX = "resume-workshop:corrupt:";

export type CorruptBackup = {
  /** 原始存储键，例如 resume-workshop:v1 */
  key: string;
  backupKey: string;
  raw: string;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function backupKeyFor(key: string): string {
  return `${BACKUP_PREFIX}${key}`;
}

/**
 * 若 `key` 当前有值但无法被 `isReadable` 接受，就把原始字符串存进备份键。
 * 同一来源只保留第一份（首次损坏前的样子），不会因后续坏数据反复覆盖。
 */
export function preserveUnreadable(
  key: string,
  isReadable: (raw: string) => boolean,
): boolean {
  if (!canUseStorage()) return false;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return false;
    const backupKey = backupKeyFor(key);
    if (window.localStorage.getItem(backupKey) !== null) return false;
    if (isReadable(raw)) return false;
    window.localStorage.setItem(backupKey, raw);
    return true;
  } catch {
    return false;
  }
}

/** 列出所有已保存的损坏数据副本，供界面提示与导出。 */
export function listCorruptBackups(): CorruptBackup[] {
  if (!canUseStorage()) return [];
  const found: CorruptBackup[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const backupKey = window.localStorage.key(index);
      if (!backupKey || !backupKey.startsWith(BACKUP_PREFIX)) continue;
      const raw = window.localStorage.getItem(backupKey);
      if (raw === null) continue;
      found.push({
        key: backupKey.slice(BACKUP_PREFIX.length),
        backupKey,
        raw,
      });
    }
  } catch {
    return found;
  }
  return found;
}

export function clearCorruptBackup(backupKey: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(backupKey);
  } catch {
    // ignore
  }
}

export function corruptBackupsAsJson(entries: CorruptBackup[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      note: "简历工坊检测到本机数据损坏时自动保留的原始内容",
      entries: Object.fromEntries(entries.map((entry) => [entry.key, entry.raw])),
    },
    null,
    2,
  );
}
