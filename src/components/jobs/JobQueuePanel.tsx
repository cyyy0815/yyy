"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextArea, TextInput } from "@/components/ui/Field";
import { useApplications } from "@/hooks/useApplications";
import { downloadAtsResume } from "@/lib/ats";
import {
  createEmptyApplication,
  type JobApplication,
} from "@/lib/applications";
import { analyzeJd } from "@/lib/jdMatch";
import { formatJobLeads, parseJobLeads } from "@/lib/jobLeads";
import {
  subscribeJobBridge,
  takePendingLeads,
} from "@/lib/jobBridge";
import { saveJd } from "@/lib/jdStorage";
import type { Resume } from "@/lib/types";
import { JobAgentPanel } from "./JobAgentPanel";
import { SkillChip } from "./SkillChip";

type Props = {
  resume: Resume;
  resumeTitle: string;
  onAddSkill: (skill: string) => void;
  /** 采用 Agent 改写结果时写回简历（走撤销栈） */
  onChange: Dispatch<SetStateAction<Resume>>;
  /** 设为当前 JD 之后打开求职信弹窗 */
  onPrepareCoverLetter: () => void;
  /** 设为当前 JD 之后打开编辑页的 AI 写作弹窗（按 JD 定制简历） */
  onOpenAiWriter: () => void;
};

function today(): string {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function leadLabel(application: JobApplication): string {
  const company = application.company.trim() || "未命名公司";
  const role = application.role.trim() || "未填写岗位";
  return `${company} · ${role}`;
}

function scoreTone(score: number): string {
  if (score >= 75) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (score >= 50) return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

const IMPORT_PLACEHOLDER = `某科技 | 高级前端工程师
负责中后台系统开发，要求 3 年以上经验，熟悉 React、TypeScript 与工程化。

---
某金融 | Java 后端工程师
负责交易系统，要求熟悉 Spring Boot、MySQL、Redis 与微服务。`;

export function JobQueuePanel({
  resume,
  resumeTitle,
  onAddSkill,
  onChange,
  onPrepareCoverLetter,
  onOpenAiWriter,
}: Props) {
  const { applications, update, saveError } = useApplications();
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [prepId, setPrepId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // 浏览器扩展投递过来的岗位：打开导入弹窗并预填，用户确认后才入库。
  useEffect(() => {
    const drain = () => {
      const leads = takePendingLeads();
      if (leads.length === 0) return;
      const text = formatJobLeads(leads);
      setImportText((current) =>
        current.trim() ? `${current.trim()}\n---\n${text}` : text,
      );
      setImportOpen(true);
      setNotice(`收到 ${leads.length} 条来自浏览器扩展的岗位，确认后导入`);
    };
    // 挂载时先取一次：扩展可能在推荐页还没渲染时就发了消息。
    drain();
    return subscribeJobBridge(drain);
  }, []);

  const parsed = useMemo(
    () => (importText.trim() ? parseJobLeads(importText) : null),
    [importText],
  );

  // 待投 = 看板里 status 为「想投」的记录；按该 JD 的匹配分从高到低排。
  const queue = useMemo(
    () =>
      applications
        .filter((application) => application.status === "wishlist")
        .map((application) => ({
          application,
          analysis: application.jd.trim()
            ? analyzeJd(application.jd, resume)
            : null,
        }))
        .sort(
          (a, b) =>
            (b.analysis?.score ?? -1) - (a.analysis?.score ?? -1) ||
            b.application.updatedAt - a.application.updatedAt,
        ),
    [applications, resume],
  );

  const preparing = prepId
    ? queue.find((item) => item.application.id === prepId) ?? null
    : null;
  const agentApp = agentId
    ? applications.find((item) => item.id === agentId) ?? null
    : null;

  /** 启动 Agent：先把它设为当前 JD，这样改写与求职信都围绕这个岗位。 */
  const handleStartAgent = (application: JobApplication) => {
    saveJd(application.jd);
    setAgentId(application.id);
    setPrepId(null);
  };

  const handleImport = () => {
    if (!parsed || parsed.error || parsed.leads.length === 0) return;
    const now = Date.now();
    const created: JobApplication[] = parsed.leads.map((lead, index) => ({
      ...createEmptyApplication(resumeTitle, now + index),
      company: lead.company,
      role: lead.role,
      jd: lead.jd,
    }));
    if (!update((current) => [...created, ...current])) {
      setNotice("导入失败：浏览器存储不可用或空间已满");
      return;
    }
    setImportText("");
    setImportOpen(false);
    setNotice(`已导入 ${created.length} 条岗位，按匹配度排序`);
  };

  const handleRemove = (application: JobApplication) => {
    if (
      !window.confirm(`确定从待投清单移除「${leadLabel(application)}」吗？`)
    ) {
      return;
    }
    if (!update((current) => current.filter((item) => item.id !== application.id))) {
      setNotice("移除失败：浏览器存储不可用或空间已满");
      return;
    }
    setNotice("已从待投清单移除");
  };

  const handlePrepareLetter = (application: JobApplication) => {
    // 求职信弹窗打开时会读取「当前 JD」，所以先写入再触发打开。
    saveJd(application.jd);
    setPrepId(null);
    onPrepareCoverLetter();
  };

  /** 按 JD 优化简历：复用编辑页的 AI 写作弹窗，弹窗自己读取「当前 JD」。 */
  const handleOptimizeResume = (application: JobApplication) => {
    saveJd(application.jd);
    setPrepId(null);
    onOpenAiWriter();
  };

  const handleMarkApplied = (application: JobApplication) => {    const ok = update((current) =>
      current.map((item) =>
        item.id === application.id
          ? {
              ...item,
              status: "applied",
              appliedAt: item.appliedAt || today(),
              updatedAt: Date.now(),
            }
          : item,
      ),
    );
    if (!ok) {
      setNotice("保存失败：浏览器存储不可用或空间已满");
      return;
    }
    setPrepId(null);
    setNotice(`已把「${leadLabel(application)}」标记为已投`);
  };

  const handleNextAction = (application: JobApplication, value: string) => {
    update((current) =>
      current.map((item) =>
        item.id === application.id
          ? { ...item, nextActionAt: value, updatedAt: Date.now() }
          : item,
      ),
    );
  };

  return (
    <section
      data-qa="job-queue"
      className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold tracking-tight text-zinc-900">
            待投清单
          </h3>
          <p className="mt-1 max-w-2xl text-[12px] leading-5 text-zinc-500">
            批量粘贴岗位描述，按当前简历的匹配度排队；点「准备」把该 JD
            设为当前 JD 并打开求职信，投完一键标记已投。
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          data-qa="job-import-open"
          onClick={() => setImportOpen(true)}
        >
          批量导入 JD
        </Button>
      </div>

      {saveError ? (
        <p role="alert" className="mt-3 text-[11.5px] text-red-600">
          投递记录保存失败：浏览器存储不可用或空间已满
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-3 text-[11.5px] text-emerald-700">
          {notice}
        </p>
      ) : null}

      {queue.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-[12px] text-zinc-400">
          还没有待投岗位。点右上角「批量导入 JD」，一次粘贴多条岗位描述即可开始排队。
        </p>
      ) : (
        <ul className="mt-4 space-y-2" data-qa="job-queue-list">
          {queue.map(({ application, analysis }) => (
            <li
              key={application.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-3 py-2.5"
            >
              <span
                className={`flex h-9 w-12 shrink-0 items-center justify-center rounded-lg border text-[13px] font-semibold tabular-nums ${scoreTone(analysis?.score ?? 0)}`}
              >
                {analysis ? analysis.score : "—"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-zinc-800">
                  {leadLabel(application)}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                  {analysis
                    ? `关键词覆盖 ${analysis.matched.length}/${analysis.keywordCount} · 缺口 ${analysis.missing.length} 项${analysis.missing.length > 0 ? `：${analysis.missing.slice(0, 3).join("、")}` : ""}`
                    : "未填写 JD，无法计算匹配度"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  data-qa="job-prepare"
                  onClick={() => setPrepId(application.id)}
                >
                  准备
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemove(application)}
                >
                  移除
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {importOpen ? (
        <Dialog
          title="批量导入岗位"
          description="每段用 --- 分隔，第一行写「公司 | 岗位」。JD 只保存在本机。"
          size="lg"
          dataQa="job-import-dialog"
          closeDataQa="job-import-close"
          onClose={() => setImportOpen(false)}
          footer={
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10.5px] text-zinc-400">
                单次最多导入 50 条，单条 JD 最多 8000 字
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportOpen(false)}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  data-qa="job-import-submit"
                  disabled={!parsed || Boolean(parsed.error) || parsed.leads.length === 0}
                  onClick={handleImport}
                >
                  导入{parsed && !parsed.error ? ` ${parsed.leads.length} 条` : ""}
                </Button>
              </div>
            </div>
          }
        >
          <TextArea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder={IMPORT_PLACEHOLDER}
            aria-label="粘贴岗位描述"
            className="min-h-[220px] font-mono text-[11.5px]"
          />
          {parsed?.error ? (
            <p role="alert" className="mt-2 text-[11.5px] text-red-600">
              {parsed.error}
            </p>
          ) : null}
          {parsed && !parsed.error ? (
            <p className="mt-2 text-[11.5px] text-zinc-500">
              将导入 {parsed.leads.length} 条
              {parsed.skipped > 0 ? `，跳过 ${parsed.skipped} 段（没有 JD 正文）` : ""}
              {parsed.truncated > 0 ? `，超出上限丢弃 ${parsed.truncated} 段` : ""}
            </p>
          ) : null}
        </Dialog>
      ) : null}

      {preparing ? (
        <Dialog
          title={leadLabel(preparing.application)}
          description="确认匹配情况，下一步准备材料并记录投递。"
          size="lg"
          dataQa="job-prep-dialog"
          closeDataQa="job-prep-close"
          onClose={() => setPrepId(null)}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  data-qa="job-agent"
                  disabled={!preparing.application.jd.trim()}
                  onClick={() => handleStartAgent(preparing.application)}
                >
                  启动求职 Agent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  data-qa="job-download-ats"
                  onClick={() => downloadAtsResume(resumeTitle, resume, "text")}
                >
                  下载 ATS 文本
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  data-qa="job-optimize-resume"
                  disabled={!preparing.application.jd.trim()}
                  onClick={() => handleOptimizeResume(preparing.application)}
                >
                  按 JD 优化简历
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  data-qa="job-mark-applied"
                  onClick={() => handleMarkApplied(preparing.application)}
                >
                  标记为已投
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  data-qa="job-prepare-letter"
                  disabled={!preparing.application.jd.trim()}
                  onClick={() => handlePrepareLetter(preparing.application)}
                >
                  设为当前 JD 并写求职信
                </Button>
              </div>
            </div>
          }
        >
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`flex h-12 w-16 items-center justify-center rounded-xl border text-[18px] font-semibold tabular-nums ${scoreTone(preparing.analysis?.score ?? 0)}`}
            >
              {preparing.analysis ? preparing.analysis.score : "—"}
            </span>
            <div className="min-w-0 flex-1 text-[12px] leading-6 text-zinc-500">
              {preparing.analysis ? (
                <>
                  {preparing.analysis.label} · 关键词覆盖{" "}
                  {preparing.analysis.matched.length}/
                  {preparing.analysis.keywordCount}
                  {preparing.analysis.minYears !== null
                    ? ` · JD 要求 ${preparing.analysis.minYears} 年以上`
                    : ""}
                  {preparing.analysis.requiredDegree
                    ? ` · ${preparing.analysis.requiredDegree}及以上`
                    : ""}
                </>
              ) : (
                "这条记录没有 JD，只能记录投递状态"
              )}
            </div>
          </div>

          {preparing.analysis && preparing.analysis.missing.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-[11px] text-zinc-400">
                简历未体现（若你掌握，点击补进简历）
              </p>
              <div className="flex flex-wrap gap-1.5">
                {preparing.analysis.missing.map((skill) => (
                  <SkillChip
                    key={skill}
                    tone="missing"
                    onClick={() => onAddSkill(skill)}
                    title="点击添加到简历技能"
                  >
                    {skill}
                  </SkillChip>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <label
              htmlFor="job-next-action"
              className="mb-1 block text-[11px] text-zinc-400"
            >
              下一步（跟进提醒日期）
            </label>
            <TextInput
              id="job-next-action"
              type="date"
              value={preparing.application.nextActionAt}
              onChange={(event) =>
                handleNextAction(preparing.application, event.target.value)
              }
              className="max-w-[220px]"
            />
          </div>

          <div className="mt-4">
            <p className="mb-1 text-[11px] text-zinc-400">JD 原文</p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-sans text-[11.5px] leading-5 text-zinc-600">
              {preparing.application.jd || "（无）"}
            </pre>
          </div>
        </Dialog>
      ) : null}

      {agentApp ? (
        <JobAgentPanel
          resume={resume}
          onChange={onChange}
          job={{
            company: agentApp.company,
            role: agentApp.role,
            jd: agentApp.jd,
          }}
          onClose={() => setAgentId(null)}
        />
      ) : null}
    </section>
  );
}
