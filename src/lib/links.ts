const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const HTTP_URL = /^https?:\/\//i;

/**
 * 只允许 http(s) 链接；允许省略协议（github.com/you -> https://github.com/you）。
 * 返回 null 表示不应渲染成可点击链接，避免 javascript: / data: 等地址进入简历。
 */
export function toSafeHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;

  if (HAS_SCHEME.test(trimmed) && !HTTP_URL.test(trimmed)) return null;

  const candidate = HTTP_URL.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (
      !url.hostname ||
      (!url.hostname.includes(".") && url.hostname !== "localhost")
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/** 简历上展示的短链接：去掉协议与末尾斜杠，非法值原样展示。 */
export function displayUrl(value: string): string {
  const href = toSafeHref(value);
  if (!href) return value.trim();
  return href.replace(HTTP_URL, "").replace(/\/$/, "");
}
