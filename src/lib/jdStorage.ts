export const JD_STORAGE_KEY = "resume-workshop:jd";
/** AI 请求中的 JD 上限，与 /api/ai/generate 校验保持一致。 */
export const JD_MAX_LENGTH = 4000;

export function readSavedJd(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(JD_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveJd(text: string): void {
  if (typeof window === "undefined") return;
  try {
    if (text.trim()) {
      window.localStorage.setItem(JD_STORAGE_KEY, text);
    } else {
      window.localStorage.removeItem(JD_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function clearSavedJd(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(JD_STORAGE_KEY);
  } catch {
    // ignore
  }
}
