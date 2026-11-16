/**
 * 书签采集结果：只在当前标签页内存里停留，用户确认后才写入「待投清单」。
 * 不落 localStorage，避免把一次误点变成长期脏数据。
 */
export const BOOKMARKLET_SOURCE = "resume-workshop-bookmarklet";
export const CAPTURED_JOB_LIMIT = 50;

export const CAPTURED_SOURCES = [
  "boss",
  "lagou",
  "liepin",
  "zhaopin",
  "51job",
  "other",
] as const;

export type CapturedJobSource = (typeof CAPTURED_SOURCES)[number];

export type CapturedJob = {
  company: string;
  role: string;
  city: string;
  salary: string;
  tags: string[];
  url: string;
  source: CapturedJobSource;
  jdPreview: string;
};

export const TRUSTED_JOB_ORIGINS = [
  "https://www.zhipin.com",
  "https://www.lagou.com",
  "https://www.liepin.com",
  "https://www.zhaopin.com",
  "https://sou.zhaopin.com",
  "https://we.51job.com",
  "https://jobs.51job.com",
] as const;

const LIMITS = {
  company: 100,
  role: 100,
  city: 50,
  salary: 50,
  tag: 30,
  tags: 8,
  url: 1000,
  jdPreview: 2000,
} as const;

function asText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isTrustedJobOrigin(origin: string): boolean {
  return (TRUSTED_JOB_ORIGINS as readonly string[]).includes(origin);
}

export function safeCapturedUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, LIMITS.url);
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.href;
  } catch {
    return "";
  }
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags: string[] = [];
  for (const item of value) {
    const tag = asText(item, LIMITS.tag);
    if (tag && !tags.includes(tag)) tags.push(tag);
    if (tags.length >= LIMITS.tags) break;
  }
  return tags;
}

export function normalizeCapturedJob(input: unknown): CapturedJob | null {
  if (!isRecord(input)) return null;
  const company = asText(input.company, LIMITS.company);
  const role = asText(input.role, LIMITS.role);
  const url = safeCapturedUrl(input.url);
  if (!company && !role && !url) return null;
  return {
    company,
    role,
    city: asText(input.city, LIMITS.city),
    salary: asText(input.salary, LIMITS.salary),
    tags: normalizeTags(input.tags),
    url,
    source:
      typeof input.source === "string" &&
      (CAPTURED_SOURCES as readonly string[]).includes(input.source)
        ? (input.source as CapturedJobSource)
        : "other",
    jdPreview: asText(input.jdPreview, LIMITS.jdPreview),
  };
}

export function capturedJobKey(job: CapturedJob): string {
  if (job.url) {
    try {
      const url = new URL(job.url);
      return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "")}`;
    } catch {
      // fall through
    }
  }
  return [job.company, job.role, job.city]
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .join("|");
}

/** 解析书签发来的一页岗位；数组、上限、URL 与字段都在这里收敛。 */
export function parseCapturedJobs(payload: unknown): CapturedJob[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }
  const jobs = (payload as { jobs?: unknown }).jobs;
  if (!Array.isArray(jobs)) return [];

  const result: CapturedJob[] = [];
  const seen = new Set<string>();
  for (const item of jobs.slice(0, CAPTURED_JOB_LIMIT)) {
    const job = normalizeCapturedJob(item);
    if (!job) continue;
    const key = capturedJobKey(job);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(job);
  }
  return result;
}

/** 解析书签复制到剪贴板的 JSON；不是该格式时返回空数组。 */
export function parseCapturedClipboard(text: string): CapturedJob[] {
  try {
    return parseCapturedJobs(JSON.parse(text.trim()));
  } catch {
    return [];
  }
}

/** 多次点击书签时把新结果合并到当前预览里，按 key 去重。 */
export function mergeCapturedJobs(
  current: CapturedJob[],
  incoming: CapturedJob[],
): CapturedJob[] {
  const map = new Map<string, CapturedJob>();
  for (const job of [...current, ...incoming]) {
    const key = capturedJobKey(job);
    if (!key) continue;
    const previous = map.get(key);
    map.set(
      key,
      previous
        ? {
            ...previous,
            company: job.company || previous.company,
            role: job.role || previous.role,
            city: job.city || previous.city,
            salary: job.salary || previous.salary,
            tags: Array.from(new Set([...previous.tags, ...job.tags])).slice(0, 8),
            url: job.url || previous.url,
            jdPreview:
              job.jdPreview.length > previous.jdPreview.length
                ? job.jdPreview
                : previous.jdPreview,
          }
        : job,
    );
  }
  return [...map.values()].slice(0, CAPTURED_JOB_LIMIT);
}
