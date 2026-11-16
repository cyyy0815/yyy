import { parseCapturedJobs, type CapturedJob } from "./capturedJobs";

/** 书签把采集结果放在 `#jobs?capture=<encodeURIComponent(JSON)>`，不经过服务器。 */
export const CAPTURE_HASH_PREFIX = "#jobs?capture=";

/** 从 location.hash 读取采集结果；格式不对返回空数组。 */
export function readCaptureHash(hash: string): CapturedJob[] {
  if (!hash.startsWith(CAPTURE_HASH_PREFIX)) return [];
  try {
    const raw = decodeURIComponent(hash.slice(CAPTURE_HASH_PREFIX.length));
    return parseCapturedJobs(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** 消费后把地址恢复成普通的 #jobs，避免刷新时重复弹预览。 */
export function clearCaptureHash(): void {
  if (typeof window === "undefined") return;
  if (!window.location.hash.startsWith("#jobs")) return;
  try {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#jobs`,
    );
  } catch {
    // ignore
  }
}
