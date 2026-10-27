import {
  BACKUP_SNOOZE_KEY,
  FIRST_USE_KEY,
  LAST_EXPORT_KEY,
  readBackupSnoozeAt,
  readFirstUseAt,
  readLastExportAt,
} from "./storage";

const BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const BACKUP_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
const WATCHED_KEYS = [FIRST_USE_KEY, LAST_EXPORT_KEY, BACKUP_SNOOZE_KEY];

function compute(): boolean {
  if (typeof window === "undefined") return false;
  const now = Date.now();
  const snooze = readBackupSnoozeAt();
  if (snooze && now - snooze < BACKUP_SNOOZE_MS) return false;
  const reference = readLastExportAt() ?? readFirstUseAt();
  return reference !== null && now - reference >= BACKUP_INTERVAL_MS;
}

let snapshot: boolean | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** 导出、稍后提醒或另一个标签页改动备份时间后重新计算。 */
export function refreshBackupReminder(): void {
  const next = compute();
  if (next === snapshot) return;
  snapshot = next;
  emit();
}

export function getBackupReminderSnapshot(): boolean {
  if (snapshot === null) snapshot = compute();
  return snapshot;
}

export function subscribeBackupReminder(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || WATCHED_KEYS.includes(event.key)) {
      refreshBackupReminder();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
