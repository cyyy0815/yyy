import { preserveUnreadable } from "./corruptBackup";

/**
 * 推荐岗位池：扩展从招聘网站搜索结果页采集来的岗位。
 *
 * 池里的岗位还没有进入「待投清单」；用户点「加入待投」后才创建
 * JobApplication。这样采集/忽略不会污染投递看板，也便于批量清理。
 */
export const JOB_POOL_KEY = "resume-workshop:job-pool:v1";
export const JOB_POOL_EVENT = "resume-workshop:job-pool-change";
export const MAX_POOL_JOBS = 300;

export const JOB_POOL_SOURCES = [
  "boss",
  "lagou",
  "liepin",
  "zhaopin",
  "51job",
  "other",
] as const;

export type JobPoolSource = (typeof JOB_POOL_SOURCES)[number];
export type JobPoolState = "new" | "queued" | "ignored";

export type PoolJob = {
  /** 等于去重键；重复采集时按它合并。 */
  id: string;
  key: string;
  company: string;
  role: string;
  city: string;
  salary: string;
  tags: string[];
  /** 打开原站的链接；只接受 http(s)。 */
  url: string;
  source: JobPoolSource;
  /** 列表卡片里能拿到的短描述，用于本地匹配。 */
  jdPreview: string;
  state: JobPoolState;
  /** 加入待投后对应的投递记录 id。 */
  applicationId?: string;
  capturedAt: number;
};

const LIMITS = {
  company: 100,
  role: 100,
  city: 50,
  salary: 50,
  tag: 30,
  tags: 8,
  url: 1000,
  jdPreview: 2000,
  key: 320,
} as const;

function asText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function asTimestamp(value: unknown): number {
  const number =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isJobPoolSource(value: unknown): value is JobPoolSource {
  return typeof value === "string" && JOB_POOL_SOURCES.includes(value as JobPoolSource);
}

export function isJobPoolState(value: unknown): value is JobPoolState {
  return value === "new" || value === "queued" || value === "ignored";
}

/** 只接受 http(s) 链接；返回规范化后的 href，非法值返回空字符串。 */
export function safePoolUrl(value: unknown): string {
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

function safeUrl(value: unknown): URL | null {
  const href = safePoolUrl(value);
  if (!href) return null;
  try {
    return new URL(href);
  } catch {
    return null;
  }
}

/**
 * 去重键：优先用链接（去掉 hash 与查询串，避免跟踪参数造成同岗不同 key），
 * 没有链接时退回「公司|岗位|城市」。
 */
export function poolJobKey(input: {
  company: string;
  role: string;
  city: string;
  url: string;
}): string {
  const url = safeUrl(input.url);
  if (url) {
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "")}`.slice(
      0,
      LIMITS.key,
    );
  }
  const fallback = [input.company, input.role, input.city]
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .join("|");
  return fallback.slice(0, LIMITS.key);
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

/** 把扩展/存储里的任意数据收敛成池条目；没有公司也没有岗位时丢弃。 */
export function normalizePoolJob(input: unknown): PoolJob | null {
  if (!isRecord(input)) return null;

  const company = asText(input.company, LIMITS.company);
  const role = asText(input.role, LIMITS.role);
  const city = asText(input.city, LIMITS.city);
  const url = safePoolUrl(input.url);

  if (!company && !role && !url) return null;

  const key = poolJobKey({ company, role, city, url });
  if (!key) return null;

  const state = isJobPoolState(input.state) ? input.state : "new";
  const applicationId = asText(input.applicationId, 100);

  return {
    id: key,
    key,
    company,
    role,
    city,
    salary: asText(input.salary, LIMITS.salary),
    tags: normalizeTags(input.tags),
    url,
    source: isJobPoolSource(input.source) ? input.source : "other",
    jdPreview: asText(input.jdPreview, LIMITS.jdPreview),
    state,
    ...(applicationId ? { applicationId } : {}),
    capturedAt: asTimestamp(input.capturedAt) || Date.now(),
  };
}

function normalizePoolJobs(value: unknown): PoolJob[] {
  if (!Array.isArray(value)) return [];
  const jobs: PoolJob[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const job = normalizePoolJob(item);
    if (!job || seen.has(job.key)) continue;
    seen.add(job.key);
    jobs.push(job);
    if (jobs.length >= MAX_POOL_JOBS) break;
  }
  return jobs;
}

/** 读取岗位池；损坏时先备份原始字符串。 */
export function readJobPool(): PoolJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(JOB_POOL_KEY);
    if (!raw) return [];
    preserveUnreadable(JOB_POOL_KEY, (value) => {
      try {
        return Array.isArray(JSON.parse(value));
      } catch {
        return false;
      }
    });
    return normalizePoolJobs(JSON.parse(raw));
  } catch {
    return [];
  }
}

function capJobs(jobs: PoolJob[]): PoolJob[] {
  if (jobs.length <= MAX_POOL_JOBS) {
    return [...jobs].sort((a, b) => b.capturedAt - a.capturedAt);
  }
  // 已加入待投的优先保留，其余按采集时间倒序。
  const queued = jobs.filter((job) => job.state === "queued");
  const rest = jobs
    .filter((job) => job.state !== "queued")
    .sort((a, b) => b.capturedAt - a.capturedAt);
  return [...queued, ...rest].slice(0, MAX_POOL_JOBS);
}

/** 写入岗位池并广播同标签页事件；storage 事件由其他标签页接收。 */
export function saveJobPool(jobs: PoolJob[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      JOB_POOL_KEY,
      JSON.stringify(capJobs(jobs.map((job) => normalizePoolJob(job) ?? job))),
    );
    window.dispatchEvent(new Event(JOB_POOL_EVENT));
    return true;
  } catch {
    return false;
  }
}

function mergeJob(existing: PoolJob, incoming: PoolJob): PoolJob {
  return {
    ...existing,
    company: incoming.company || existing.company,
    role: incoming.role || existing.role,
    city: incoming.city || existing.city,
    salary: incoming.salary || existing.salary,
    tags: Array.from(new Set([...existing.tags, ...incoming.tags])).slice(0, LIMITS.tags),
    url: incoming.url || existing.url,
    source: incoming.source !== "other" ? incoming.source : existing.source,
    jdPreview:
      incoming.jdPreview.length > existing.jdPreview.length
        ? incoming.jdPreview
        : existing.jdPreview,
    capturedAt: Math.max(existing.capturedAt, incoming.capturedAt),
  };
}

export type PoolIngestResult = {
  added: number;
  updated: number;
  total: number;
  saved: boolean;
};

/**
 * 合并一批新采集的岗位：同 key 更新缺失字段、保留已有的处理状态；
 * 新岗位以 new 状态入池。
 */
export function ingestJobPool(incoming: unknown[]): PoolIngestResult {
  const existing = readJobPool();
  const map = new Map(existing.map((job) => [job.key, job]));
  let added = 0;
  let updated = 0;

  for (const item of incoming) {
    const job = normalizePoolJob(item);
    if (!job) continue;
    const previous = map.get(job.key);
    if (!previous) {
      map.set(job.key, job);
      added += 1;
      continue;
    }
    const merged = mergeJob(previous, job);
    if (JSON.stringify(merged) !== JSON.stringify(previous)) updated += 1;
    map.set(job.key, merged);
  }

  const jobs = capJobs([...map.values()]);
  const saved = added > 0 || updated > 0 ? saveJobPool(jobs) : true;
  return { added, updated, total: jobs.length, saved };
}

/** 更新单条状态；返回是否找到。 */
function patchJob(id: string, patch: Partial<PoolJob>): boolean {
  const jobs = readJobPool();
  const index = jobs.findIndex((job) => job.id === id);
  if (index < 0) return false;
  const next = { ...jobs[index], ...patch };
  jobs[index] = next;
  return saveJobPool(jobs);
}

export function markPoolJobQueued(id: string, applicationId: string): boolean {
  return patchJob(id, { state: "queued", applicationId });
}

export function markPoolJobIgnored(id: string): boolean {
  return patchJob(id, { state: "ignored" });
}

/** 忽略撤销 / 删除投递记录后回到未处理。 */
export function markPoolJobNew(id: string): boolean {
  const jobs = readJobPool();
  const target = jobs.find((job) => job.id === id);
  if (!target) return false;
  const next: PoolJob = { ...target, state: "new" };
  delete next.applicationId;
  return saveJobPool(jobs.map((job) => (job.id === id ? next : job)));
}

/** 删除投递记录时，把对应池条目标回未处理。 */
export function releasePoolJobByApplication(applicationId: string): void {
  const jobs = readJobPool();
  let changed = false;
  const next = jobs.map((job) => {
    if (job.applicationId !== applicationId) return job;
    changed = true;
    const released: PoolJob = { ...job, state: "new" };
    delete released.applicationId;
    return released;
  });
  if (changed) saveJobPool(next);
}
