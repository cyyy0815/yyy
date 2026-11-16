"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useApplications } from "@/hooks/useApplications";
import {
  createEmptyApplication,
  type JobApplication,
} from "@/lib/applications";
import {
  capturedJobKey,
  type CapturedJob,
} from "@/lib/capturedJobs";
import { analyzeJd } from "@/lib/jdMatch";
import type { Resume } from "@/lib/types";

const SOURCE_LABEL: Record<string, string> = {
  boss: "BOSS直聘",
  lagou: "拉勾",
  liepin: "猎聘",
  zhaopin: "智联招聘",
  "51job": "前程无忧",
  other: "招聘网站",
};

function scoreTone(score: number): string {
  if (score >= 75) return "bg-emerald-50 text-emerald-700";
  if (score >= 40) return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

export function JobCaptureDialog({
  jobs,
  resume,
  resumeTitle,
  onClose,
  onImported,
}: {
  jobs: CapturedJob[];
  resume: Resume;
  resumeTitle: string;
  onClose: () => void;
  onImported: (count: number) => void;
}) {
  const { applications, update } = useApplications();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(jobs.map((job) => capturedJobKey(job))),
  );
  const [error, setError] = useState("");

  const existingKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const application of applications) {
      keys.add(
        `${application.company.trim().toLowerCase()}|${application.role
          .trim()
          .toLowerCase()}`,
      );
    }
    return keys;
  }, [applications]);

  const rows = useMemo(
    () =>
      jobs.map((job) => {
        const key = capturedJobKey(job);
        const text = [job.jdPreview, job.tags.join(" ")].filter(Boolean).join(" ");
        const analysis = text.trim() ? analyzeJd(text, resume) : null;
        const score =
          analysis && analysis.keywordCount > 0 ? analysis.score : null;
        const exists =
          existingKeys.has(
            `${job.company.trim().toLowerCase()}|${job.role.trim().toLowerCase()}`,
          ) || (job.url ? applications.some((a) => a.note.includes(job.url)) : false);
        return { job, key, score, analysis, exists };
      }),
    [jobs, resume, applications, existingKeys],
  );

  const available = rows.filter((row) => !row.exists);
  const selectedAvailable = available.filter((row) => selected.has(row.key));

  const toggle = (key: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allSelected =
    available.length > 0 && available.every((row) => selected.has(row.key));

  const importSelected = () => {
    const chosen = available.filter((row) => selected.has(row.key));
    if (chosen.length === 0) {
      setError("先勾选要加入待投清单的岗位");
      return;
    }
    const records: JobApplication[] = chosen.map(({ job }) => ({
      ...createEmptyApplication(resumeTitle),
      company: job.company,
      role: job.role,
      city: job.city,
      jd: job.jdPreview,
      note: job.url ? `来源：${job.url}` : "",
    }));
    const ok = update((current) => [...records, ...current]);
    if (!ok) {
      setError("导入失败：浏览器存储不可用或空间已满");
      return;
    }
    onImported(records.length);
    onClose();
  };

  return (
    <Dialog
      title={`采集到 ${jobs.length} 个岗位`}
      description="确认后会加入「待投清单」；重复岗位会自动跳过。只保存列表页能看到的信息。"
      onClose={onClose}
      size="lg"
      dataQa="job-capture-dialog"
      closeDataQa="job-capture-close"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-[11.5px] text-zinc-500">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => {
                setSelected(
                  allSelected ? new Set() : new Set(available.map((row) => row.key)),
                );
              }}
              aria-label="全选可导入岗位"
            />
            全选（{available.length} 个可导入）
          </label>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button
              variant="primary"
              data-qa="job-capture-import"
              onClick={importSelected}
              disabled={selectedAvailable.length === 0}
            >
              加入待投（{selectedAvailable.length}）
            </Button>
          </div>
        </div>
      }
    >
      <ul className="max-h-[55vh] space-y-2 overflow-auto pr-1">
        {rows.map(({ job, key, score, analysis, exists }) => (
          <li
            key={key}
            data-qa="job-capture-item"
            className={`rounded-xl border px-3 py-2.5 ${
              exists ? "border-zinc-100 bg-zinc-50/60" : "border-zinc-200"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                className="mt-1.5"
                checked={!exists && selected.has(key)}
                disabled={exists}
                onChange={() => toggle(key)}
                aria-label={`选择 ${job.company || "未命名公司"} ${job.role || "岗位"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-[12.5px] font-medium text-zinc-900">
                    {job.company || "未命名公司"} · {job.role || "未填写岗位"}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                    {SOURCE_LABEL[job.source] ?? "招聘网站"}
                  </span>
                  {exists ? (
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
                      已在待投清单
                    </span>
                  ) : score !== null ? (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${scoreTone(score)}`}>
                      匹配 {score}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                  {[job.city, job.salary].filter(Boolean).join(" · ") ||
                    "城市 / 薪资未提供"}
                  {analysis && analysis.missing.length > 0
                    ? ` · 还差 ${analysis.missing.slice(0, 3).join("、")}`
                    : ""}
                </p>
                {job.tags.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {job.tags.slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-white px-1.5 py-0.5 text-[10px] text-zinc-500 ring-1 ring-zinc-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              {job.url ? (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-zinc-500 hover:bg-white hover:text-zinc-900"
                >
                  原页 ↗
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="mt-2 text-[11.5px] text-red-700">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}
