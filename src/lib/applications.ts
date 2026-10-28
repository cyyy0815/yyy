import { newId } from "./types";

export const APPLICATIONS_KEY = "resume-workshop:applications:v1";
export const APPLICATIONS_EVENT = "resume-workshop:applications-change";
export const MAX_APPLICATIONS = 300;

export const APPLICATION_STATUSES = [
  { id: "wishlist", label: "想投", hint: "收藏或准备中" },
  { id: "applied", label: "已投", hint: "等待回复" },
  { id: "interview", label: "面试中", hint: "笔试 / 面试" },
  { id: "offer", label: "Offer", hint: "已录用" },
  { id: "rejected", label: "未通过", hint: "已结束" },
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]["id"];

export type JobApplication = {
  id: string;
  company: string;
  role: string;
  city: string;
  status: ApplicationStatus;
  /** 该岗位自己的 JD，可留空；不依赖全局「当前 JD」。 */
  jd: string;
  coverLetter: string;
  note: string;
  /** 投递时使用的简历标题，便于区分版本。 */
  resumeTitle: string;
  /** YYYY-MM-DD；空字符串表示未填写。 */
  appliedAt: string;
  /** YYYY-MM-DD；用于跟进提醒。 */
  nextActionAt: string;
  createdAt: number;
  updatedAt: number;
};

const LIMITS = {
  company: 100,
  role: 100,
  city: 50,
  jd: 8000,
  coverLetter: 12000,
  note: 4000,
  resumeTitle: 60,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asText(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function asTimestamp(value: unknown): number {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

export function isApplicationStatus(
  value: unknown,
): value is ApplicationStatus {
  return (
    typeof value === "string" &&
    APPLICATION_STATUSES.some((status) => status.id === value)
  );
}

export function applicationStatusLabel(status: ApplicationStatus): string {
  return (
    APPLICATION_STATUSES.find((item) => item.id === status)?.label ?? "想投"
  );
}

/** 只接受真实存在的 YYYY-MM-DD，避免浏览器日期控件被坏数据污染。 */
export function normalizeApplicationDate(value: unknown): string {
  if (typeof value !== "string") return "";
  const text = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? text
    : "";
}

export function createEmptyApplication(
  resumeTitle = "",
  now = Date.now(),
): JobApplication {
  return {
    id: newId(),
    company: "",
    role: "",
    city: "",
    status: "wishlist",
    jd: "",
    coverLetter: "",
    note: "",
    resumeTitle: asText(resumeTitle, LIMITS.resumeTitle).trim(),
    appliedAt: "",
    nextActionAt: "",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 把本地存储或导入文件里的任意数据收敛成一条投递记录。
 * 完全空白的记录会被丢弃，避免坏文件制造空卡片。
 */
export function normalizeApplication(input: unknown): JobApplication | null {
  if (!isRecord(input)) return null;

  const company = asText(input.company, LIMITS.company).trim();
  const role = asText(input.role, LIMITS.role).trim();
  const city = asText(input.city, LIMITS.city).trim();
  const jd = asText(input.jd, LIMITS.jd).trim();
  const coverLetter = asText(input.coverLetter, LIMITS.coverLetter).trim();
  const note = asText(input.note, LIMITS.note).trim();
  if (!company && !role && !jd && !coverLetter && !note) return null;

  const createdAt = asTimestamp(input.createdAt) || Date.now();
  const updatedAt = asTimestamp(input.updatedAt) || createdAt;

  return {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : newId(),
    company,
    role,
    city,
    status: isApplicationStatus(input.status) ? input.status : "wishlist",
    jd,
    coverLetter,
    note,
    resumeTitle: asText(input.resumeTitle, LIMITS.resumeTitle).trim(),
    appliedAt: normalizeApplicationDate(input.appliedAt),
    nextActionAt: normalizeApplicationDate(input.nextActionAt),
    createdAt,
    updatedAt,
  };
}

/** 校验、去重 id 并限制总条数；顺序保持不变，展示层再按更新时间排序。 */
export function normalizeApplications(input: unknown): JobApplication[] {
  if (!Array.isArray(input)) return [];
  const result: JobApplication[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    const application = normalizeApplication(item);
    if (!application) continue;
    if (seen.has(application.id)) application.id = newId();
    seen.add(application.id);
    result.push(application);
    if (result.length >= MAX_APPLICATIONS) break;
  }
  return result;
}

export function sortApplications(
  applications: JobApplication[],
): JobApplication[] {
  return [...applications].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function readApplications(): JobApplication[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(APPLICATIONS_KEY);
    return raw ? normalizeApplications(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function notifyApplicationsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(APPLICATIONS_EVENT));
}

/** 写入失败时返回 false，调用方负责提示用户，不假装保存成功。 */
export function saveApplications(applications: JobApplication[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      APPLICATIONS_KEY,
      JSON.stringify(normalizeApplications(applications)),
    );
    notifyApplicationsChanged();
    return true;
  } catch {
    return false;
  }
}
