"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
  analyzeAtsCoverage,
  ATS_FORMATS,
  downloadAtsResume,
  resumeToAts,
  type AtsFormat,
} from "@/lib/ats";
import { readSavedJd } from "@/lib/jdStorage";
import type { Resume } from "@/lib/types";

type Props = {
  onClose: () => void;
  title: string;
  resume: Resume;
};

function coverageTone(score: number): string {
  if (score >= 75) return "text-emerald-700";
  if (score >= 50) return "text-amber-700";
  return "text-red-700";
}

function coverageBar(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-400";
}

export function AtsExportDialog({ onClose, title, resume }: Props) {
  const [format, setFormat] = useState<AtsFormat>("text");
  const [jd, setJd] = useState(readSavedJd);

  const content = useMemo(
    () => resumeToAts(resume, format),
    [resume, format],
  );
  const coverage = useMemo(
    () => analyzeAtsCoverage(content, jd),
    [content, jd],
  );
  const activeFormat =
    ATS_FORMATS.find((item) => item.id === format) ?? ATS_FORMATS[0];

  return (
    <Dialog
      title="ATS 文本导出"
      description="线性纯文本或 Markdown，方便招聘系统解析；照片、分栏与颜色不会导出。"
      size="xl"
      dataQa="ats-dialog"
      closeDataQa="ats-close"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10.5px] text-zinc-400">
            文件编码为 UTF-8，可直接上传或粘贴到招聘系统。
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              关闭
            </Button>
            <Button
              variant="primary"
              size="sm"
              data-qa="ats-download"
              onClick={() => downloadAtsResume(title, resume, format)}
            >
              下载 .{activeFormat.extension}
            </Button>
          </div>
        </div>
      }
    >
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex items-center rounded-lg border border-zinc-200 bg-white p-0.5"
              role="group"
              aria-label="导出格式"
            >
              {ATS_FORMATS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-qa={`ats-format-${item.id}`}
                  aria-pressed={format === item.id}
                  onClick={() => setFormat(item.id)}
                  className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
                    format === item.id
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-zinc-400">
              纯文本适合 ATS 与在线表单，Markdown 适合人工阅读
            </span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
            <div className="min-w-0">
              <p className="mb-1.5 text-[11px] font-medium text-zinc-600">
                导出预览
              </p>
              <pre
                data-qa="ats-preview"
                className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-[11px] leading-5 text-zinc-700"
              >
                {content}
              </pre>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="ats-jd"
                className="mb-1.5 block text-[11px] font-medium text-zinc-600"
              >
                目标 JD（可选）
              </label>
              <textarea
                id="ats-jd"
                data-qa="ats-jd"
                value={jd}
                maxLength={8000}
                onChange={(event) => setJd(event.target.value)}
                rows={4}
                placeholder="粘贴岗位描述，检查导出文本的关键词覆盖"
                className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11.5px] leading-5 text-zinc-800 transition focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-700/10"
              />
              <p className="mt-1 text-[10.5px] leading-4 text-zinc-400">
                自动读取职位推荐页保存的 JD，修改只影响本次检查。
              </p>

              <div
                data-qa="ats-coverage"
                data-score={coverage.score}
                className="mt-3 rounded-xl border border-zinc-200 bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-medium text-zinc-700">
                    关键词覆盖
                  </span>
                  <span
                    className={`text-[13px] font-semibold ${coverageTone(coverage.score)}`}
                  >
                    {coverage.total > 0 ? `${coverage.score}%` : "—"}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="JD 关键词覆盖率"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={coverage.score}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100"
                >
                  <div
                    className={`h-full rounded-full transition-all ${coverageBar(coverage.score)}`}
                    style={{ width: `${coverage.score}%` }}
                  />
                </div>
                {jd.trim() ? (
                  coverage.total === 0 ? (
                    <p className="mt-2 text-[11px] leading-4 text-zinc-500">
                      JD 中没有识别到常见技能关键词，试试粘贴更完整的岗位描述。
                    </p>
                  ) : (
                    <>
                      <p className="mt-2 text-[11px] leading-4 text-zinc-500">
                        已覆盖 {coverage.matched.length} / {coverage.total}
                        {coverage.matched.length > 0
                          ? `：${coverage.matched.join("、")}`
                          : ""}
                      </p>
                      {coverage.missing.length > 0 ? (
                        <p
                          data-qa="ats-missing"
                          className="mt-1.5 text-[11px] leading-4 text-amber-700"
                        >
                          未覆盖：{coverage.missing.join("、")}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-[11px] leading-4 text-emerald-700">
                          JD 关键词已全部出现。
                        </p>
                      )}
                    </>
                  )
                ) : (
                  <p className="mt-2 text-[11px] leading-4 text-zinc-500">
                    粘贴目标 JD 后，会检查导出文本里是否出现对应关键词。
                  </p>
                )}
                <p className="mt-2 text-[10px] leading-4 text-zinc-400">
                  只检查关键词是否出现，不代表真实技能水平。
                </p>
              </div>
            </div>
          </div>
    </Dialog>
  );
}
