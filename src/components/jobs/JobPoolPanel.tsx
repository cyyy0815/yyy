"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useApplications } from "@/hooks/useApplications";
import { useJobPool } from "@/hooks/useJobPool";
import {
  createEmptyApplication,
  type JobApplication,
} from "@/lib/applications";
import { analyzeJd } from "@/lib/jdMatch";
import {
  markPoolJobIgnored,
  markPoolJobNew,
  markPoolJobQueued,
  readJobPool,
  type JobPoolSource,
  type PoolJob,
} from "@/lib/jobPool";
import type { Resume } from "@/lib/types";

const SOURCE_LABEL: Record<JobPoolSource, string> = {
  boss: "BOSS直聘",
  lagou: "拉勾",
  liepin: "猎聘",
  zhaopin: "智联招聘",
  "51job": "前程无忧",
  other: "招聘网站",
};

type Filter = "all" | "new" | "queued" | "ignored";
type SortMode = "score" | "latest";

type Notice = {
  message: string;
  tone: "ok" | "error";
  undo?: () => void;
};

function scoreTone(score: number): string {
  if (score >= 75) return "bg-emerald-50 text-emerald-700";
  if (score >= 40) return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

function statusLabel(
  job: PoolJob,
  application: JobApplication | undefined,
): { label: string; tone: string } | null {
  if (job.state === "ignored") {
    return { label: "已忽略", tone: "bg-zinc-100 text-zinc-500" };
  }
  if (job.state === "queued") {
    return application && application.status !== "wishlist"
      ? { label: "已投", tone: "bg-emerald-50 text-emerald-700" }
      : { label: "已加入待投", tone: "bg-blue-50 text-blue-700" };
  }
  return null;
}

export function JobPoolPanel({
  resume,
  resumeTitle,
}: {
  resume: Resume;
  resumeTitle: string;
}) {
  const jobs = useJobPool();
  const { applications, update } = useApplications();
  const [filter, setFilter] = useState<Filter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("score");
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 8000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const applicationsById = useMemo(
    () => new Map(applications.map((application) => [application.id, application])),
    [applications],
  );

  const rows = useMemo(() => {
    const enriched = jobs.map((job) => {
      const text = [job.jdPreview, job.tags.join(" ")]
        .filter(Boolean)
        .join(" ");
      const analysis = text.trim() ? analyzeJd(text, resume) : null;
      const score =
        analysis && analysis.keywordCount > 0 ? analysis.score : null;
      return {
        job,
        analysis,
        score,
        application: job.applicationId
          ? applicationsById.get(job.applicationId)
          : undefined,
      };
    });

    const filtered = enriched.filter(({ job }) => {
      if (filter === "all") return true;
      return job.state === filter;
    });

    return filtered.sort((a, b) => {
      if (sortMode === "latest") {
        return b.job.capturedAt - a.job.capturedAt;
      }
      const left = a.score ?? -1;
      const right = b.score ?? -1;
      return right - left || b.job.capturedAt - a.job.capturedAt;
    });
  }, [jobs, resume, applicationsById, filter, sortMode]);

  const unhandled = jobs.filter((job) => job.state === "new").length;

  const addToQueue = (job: PoolJob) => {
    // 防连点：以存储里的最新状态为准，已经处理过的不再重复创建投递记录。
    const current = readJobPool().find((item) => item.id === job.id);
    if (!current || current.state !== "new") return;

    const record: JobApplication = {
      ...createEmptyApplication(resumeTitle),
      company: job.company,
      role: job.role,
      city: job.city,
      jd: job.jdPreview,
      note: job.url ? `来源：${job.url}` : "",
    };
    const ok = update((curr) => [record, ...curr]);
    if (!ok) {
      setNotice({ tone: "error", message: "加入待投失败：浏览器存储空间不足" });
      return;
    }
    if (!markPoolJobQueued(job.id, record.id)) {
      setNotice({
        tone: "error",
        message: "已加入待投，但推荐池状态未保存，请刷新后重试",
      });
      return;
    }
    setNotice({
      tone: "ok",
      message: `已加入待投：${job.company || "未命名公司"} · ${job.role || "岗位"}`,
    });
  };

  const ignoreJob = (job: PoolJob) => {
    if (!markPoolJobIgnored(job.id)) {
      setNotice({ tone: "error", message: "操作失败，请重试" });
      return;
    }
    setNotice({
      tone: "ok",
      message: "已忽略这条岗位",
      undo: () => {
        markPoolJobNew(job.id);
        setNotice({ tone: "ok", message: "已恢复这条岗位" });
      },
    });
  };

  const copyLink = async (job: PoolJob) => {
    if (!job.url) return;
    try {
      await navigator.clipboard.writeText(job.url);
      setNotice({ tone: "ok", message: "链接已复制" });
    } catch {
      setNotice({ tone: "error", message: "复制失败，请手动打开原页" });
    }
  };

  return (
    <section
      data-qa="job-pool"
      className="scroll-mt-24 rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold tracking-tight text-zinc-900">
            推荐岗位池
          </h2>
          <p className="mt-1 max-w-2xl text-[11.5px] leading-5 text-zinc-500">
            在招聘网站搜索页点扩展「采集本页职位」，岗位会进到这里；按当前简历排序，
            再决定加入待投或忽略。信息以原站为准。
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-zinc-500">
          <span data-qa="job-pool-count">共 {jobs.length} 个</span>
          {unhandled > 0 ? (
            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10.5px] text-white">
              {unhandled} 待处理
            </span>
          ) : null}
        </div>
      </div>

      {jobs.length === 0 ? (
        <p className="mt-4 rounded-xl bg-zinc-50 px-3 py-6 text-center text-[12.5px] leading-6 text-zinc-500">
          还没有采集岗位。打开 BOSS / 拉勾 / 猎聘的搜索结果页，点扩展里的
          「采集本页职位」后会出现在这里；也可以先用下面的搜索入口去找岗位。
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="筛选岗位池"
              className="flex flex-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-0.5"
            >
              {(
                [
                  ["all", "全部"],
                  ["new", "未处理"],
                  ["queued", "已加入待投"],
                  ["ignored", "已忽略"],
                ] as [Filter, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`rounded-md px-2.5 py-1 text-[11.5px] transition ${
                    filter === value
                      ? "bg-white font-medium text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <select
              aria-label="岗位池排序"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="h-7 rounded-lg border border-zinc-200 bg-white px-2 text-[11.5px] text-zinc-700"
            >
              <option value="score">按匹配度</option>
              <option value="latest">按最新采集</option>
            </select>
            <span className="text-[11px] text-zinc-400">
              匹配分按列表里能拿到的短描述计算
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="mt-4 rounded-xl bg-zinc-50 px-3 py-5 text-center text-[12px] text-zinc-500">
              这个筛选下没有岗位。
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {rows.map(({ job, analysis, score, application }) => {
                const status = statusLabel(job, application);
                return (
                  <li
                    key={job.key}
                    data-qa="job-pool-item"
                    className="rounded-xl border border-zinc-200 px-3 py-3 transition hover:border-zinc-300"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold ${
                          score === null
                            ? "bg-zinc-100 text-zinc-400"
                            : scoreTone(score)
                        }`}
                      >
                        {score === null ? "—" : score}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[13px] font-medium text-zinc-900">
                            {job.company || "未命名公司"} ·{" "}
                            {job.role || "未填写岗位"}
                          </p>
                          {status ? (
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] ${status.tone}`}
                            >
                              {status.label}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                            {SOURCE_LABEL[job.source]}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[11.5px] text-zinc-500">
                          {[job.city, job.salary].filter(Boolean).join(" · ") ||
                            "城市 / 薪资未提供"}
                          {analysis && analysis.keywordCount > 0
                            ? ` · 覆盖 ${analysis.matched.length}/${analysis.keywordCount} 个关键词`
                            : " · 列表信息不足，可打开原页查看"}
                          {analysis && analysis.missing.length > 0
                            ? ` · 还差 ${analysis.missing.slice(0, 3).join("、")}`
                            : ""}
                        </p>
                        {job.tags.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {job.tags.slice(0, 6).map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-zinc-50 px-1.5 py-0.5 text-[10.5px] text-zinc-600"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                      {job.url ? (
                        <>
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-[11.5px] text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
                          >
                            打开原页 ↗
                          </a>
                          <button
                            type="button"
                            onClick={() => void copyLink(job)}
                            className="rounded-lg px-2 py-1 text-[11.5px] text-zinc-500 transition hover:text-zinc-800"
                          >
                            复制链接
                          </button>
                        </>
                      ) : null}
                      {job.state === "new" ? (
                        <>
                          <button
                            type="button"
                            data-qa={`pool-ignore-${job.id}`}
                            onClick={() => ignoreJob(job)}
                            className="rounded-lg px-2 py-1 text-[11.5px] text-zinc-500 transition hover:text-zinc-800"
                          >
                            忽略
                          </button>
                          <Button
                            variant="primary"
                            size="sm"
                            data-qa={`pool-add-${job.id}`}
                            onClick={() => addToQueue(job)}
                          >
                            加入待投
                          </Button>
                        </>
                      ) : null}
                      {job.state === "ignored" ? (
                        <button
                          type="button"
                          onClick={() => {
                            markPoolJobNew(job.id);
                            setNotice({ tone: "ok", message: "已恢复这条岗位" });
                          }}
                          className="rounded-lg px-2 py-1 text-[11.5px] text-zinc-500 transition hover:text-zinc-800"
                        >
                          恢复
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {notice ? (
        <div
          role="status"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11.5px] text-zinc-700"
        >
          <span>{notice.message}</span>
          {notice.undo ? (
            <button
              type="button"
              onClick={notice.undo}
              className="font-medium text-blue-700 hover:text-blue-800"
            >
              撤销
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
