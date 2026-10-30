"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FactCheckPanel } from "@/components/ui/FactCheckPanel";
import { buildPlan } from "@/lib/agent/plan";
import { LOCAL_TOOLS } from "@/lib/agent/tools";
import type {
  AgentContext,
  AgentStep,
  AgentStepStatus,
  AgentToolId,
  AgentTraceEntry,
} from "@/lib/agent/types";
import { streamGenerate } from "@/lib/ai/client";
import { checkGeneratedText, type FactWarning } from "@/lib/ai/factCheck";
import type { AiStatus } from "@/lib/ai/types";
import { analyzeJd } from "@/lib/jdMatch";
import { buildResumeText } from "@/lib/matching";
import type { Resume } from "@/lib/types";

type Props = {
  resume: Resume;
  onChange: Dispatch<SetStateAction<Resume>>;
  job: { company: string; role: string; jd: string };
  onClose: () => void;
};

const STATUS_LABEL: Record<AgentStepStatus, string> = {
  pending: "待执行",
  running: "执行中…",
  done: "已完成",
  skipped: "已跳过",
  failed: "失败",
};

const STATUS_TONE: Record<AgentStepStatus, string> = {
  pending: "text-zinc-400",
  running: "text-blue-600",
  done: "text-emerald-600",
  skipped: "text-amber-600",
  failed: "text-red-600",
};

/**
 * 求职 Agent：把「看 JD → 查差距 → 改简介 → 写求职信」串成一条可观察的流程。
 *
 * 设计取舍：
 * - 前两步是纯本地计算，没有 API Key 也能跑，保证演示不断链；
 * - 后两步用现有流式接口，生成结果必须经过事实核对并手动采用，不自动写简历；
 * - 每步都有状态、耗时与工具名，轨迹本身就是「AI 在做什么」的证据。
 */
export function JobAgentPanel({ resume, onChange, job, onClose }: Props) {
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [steps, setSteps] = useState<AgentStep[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, AgentStepStatus>>({});
  const [results, setResults] = useState<
    Record<string, { summary: string; detail?: string }>
  >({});
  const [trace, setTrace] = useState<AgentTraceEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ai, setAi] = useState<{
    stepId: AgentToolId;
    text: string;
    done: boolean;
    error: string | null;
    warnings: FactWarning[];
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const streamRef = useRef("");

  const sourceText = useMemo(() => buildResumeText(resume), [resume]);
  const analysis = useMemo(() => analyzeJd(job.jd, resume), [job.jd, resume]);
  const keywords = useMemo(
    () => analysis.matched.slice(0, 10).join("、"),
    [analysis.matched],
  );

  // 只查一次 AI 是否可用；失败按「不可用」处理，不阻塞本地步骤。
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: AiStatus | null) => {
        if (!cancelled) setAiStatus(data ?? { configured: false, model: "" });
      })
      .catch(() => {
        if (!cancelled) setAiStatus({ configured: false, model: "" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 计划只生成一次：采用改写后简历会变，但步骤不该跟着跳。
  // 放到 setTimeout 里再设置，避免在 effect 体内同步 setState。
  useEffect(() => {
    if (!aiStatus || steps) return;
    const timer = window.setTimeout(() => {
      setSteps(buildPlan({ resume, jd: job.jd, aiReady: aiStatus.configured }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [aiStatus, steps, resume, job.jd]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const skipStep = useCallback((step: AgentStep, reason = "跳过") => {
    setStatuses((current) => ({ ...current, [step.id]: "skipped" }));
    setTrace((current) => [
      ...current,
      {
        id: step.id,
        title: step.title,
        status: "skipped",
        summary: reason,
        durationMs: 0,
      },
    ]);
  }, []);

  const runLocalStep = useCallback(
    async (step: AgentStep) => {
      if (!(step.id in LOCAL_TOOLS)) return;
      const startedAt = performance.now();
      setStatuses((current) => ({ ...current, [step.id]: "running" }));
      // 让「执行中」有机会渲染一帧，轨迹才有可观察的过程
      await new Promise((resolve) => setTimeout(resolve, 220));
      const tool = LOCAL_TOOLS[step.id as keyof typeof LOCAL_TOOLS];
      const result = tool({ resume, jd: job.jd } as AgentContext);
      const durationMs = Math.round(performance.now() - startedAt);
      setResults((current) => ({ ...current, [step.id]: result }));
      setStatuses((current) => ({ ...current, [step.id]: "done" }));
      setTrace((current) => [
        ...current,
        {
          id: step.id,
          title: step.title,
          status: "done",
          summary: result.summary,
          durationMs,
        },
      ]);
    },
    [resume, job.jd],
  );

  const startAiStep = useCallback(
    async (step: AgentStep) => {
      if (!aiStatus?.configured) {
        skipStep(step, "未配置 AI Key");
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      streamRef.current = "";
      const startedAt = performance.now();
      const isCover = step.id === "cover_letter";

      setStatuses((current) => ({ ...current, [step.id]: "running" }));
      setAi({
        stepId: step.id,
        text: "",
        done: false,
        error: null,
        warnings: [],
      });

      await streamGenerate(
        {
          section: isCover ? "cover" : "summary",
          mode: isCover
            ? "draft"
            : resume.basic.summary.trim()
              ? "polish"
              : "draft",
          role: resume.intent.targetRole || resume.basic.headline,
          years: resume.intent.experience,
          keywords,
          current: isCover ? undefined : resume.basic.summary,
          jd: job.jd,
          tone: "professional",
          language: resume.language,
        },
        controller.signal,
        {
          onDelta: (text) => {
            streamRef.current += text;
            const value = streamRef.current;
            setAi((current) => (current ? { ...current, text: value } : current));
          },
          onDone: () => {
            const text = streamRef.current.trim();
            const warnings = checkGeneratedText(text, sourceText);
            setAi((current) =>
              current ? { ...current, done: true, warnings } : current,
            );
            setStatuses((current) => ({ ...current, [step.id]: "done" }));
            setTrace((current) => [
              ...current,
              {
                id: step.id,
                title: step.title,
                status: "done",
                summary: `生成 ${text.length} 字 · ${warnings.length} 处待核对`,
                durationMs: Math.round(performance.now() - startedAt),
              },
            ]);
          },
          onError: (_code, message) => {
            setAi((current) =>
              current ? { ...current, error: message } : current,
            );
            setStatuses((current) => ({ ...current, [step.id]: "failed" }));
            setTrace((current) => [
              ...current,
              {
                id: step.id,
                title: step.title,
                status: "failed",
                summary: message,
                durationMs: Math.round(performance.now() - startedAt),
              },
            ]);
          },
        },
      );
    },
    [aiStatus, keywords, job.jd, resume, skipStep, sourceText],
  );

  const runAll = async () => {
    if (!steps) return;
    setRunning(true);
    const seen = { ...statuses };
    for (const step of steps) {
      if (seen[step.id] === "done" || seen[step.id] === "skipped") continue;
      // 需要模型的步骤交给用户点「执行」，避免一次点击跑掉全部生成
      if (step.requiresAi) break;
      await runLocalStep(step);
      seen[step.id] = "done";
    }
    setRunning(false);
  };

  const adoptSummary = () => {
    if (!ai || !ai.done) return;
    const text = ai.text.trim();
    if (!text) return;
    onChange((current) => ({
      ...current,
      basic: { ...current.basic, summary: text },
    }));
    setAi(null);
    setResults((current) => ({
      ...current,
      rewrite_summary: {
        summary: "已写入个人简介（可在顶栏撤销）",
        detail: text,
      },
    }));
  };

  const copyCover = async () => {
    if (!ai) return;
    try {
      await navigator.clipboard.writeText(ai.text.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const discardAi = () => {
    abortRef.current?.abort();
    const stepId = ai?.stepId;
    setAi(null);
    if (stepId) {
      setStatuses((current) => ({ ...current, [stepId]: "pending" }));
    }
  };

  return (
    <Dialog
      title={`求职 Agent · ${job.company || "目标岗位"}`}
      description={`为「${job.role || "该岗位"}」准备材料：先解析与诊断（本地，不发数据），再按你的确认改写与生成求职信。`}
      size="xl"
      dataQa="agent-dialog"
      closeDataQa="agent-close"
      onClose={() => {
        abortRef.current?.abort();
        onClose();
      }}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11.5px] text-zinc-500" data-qa="agent-summary">
            工具调用 {trace.length} 次
            {trace.length > 0
              ? ` · 共 ${trace.reduce((sum, entry) => sum + entry.durationMs, 0)} ms`
              : ""}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              关闭
            </Button>
            <Button
              variant="primary"
              size="sm"
              data-qa="agent-run-all"
              disabled={running || !steps}
              onClick={runAll}
            >
              {running ? "执行中…" : "自动执行本地步骤"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-[12px] text-zinc-600">
          <span className="font-medium text-zinc-900">
            {job.company || "未填写公司"}
          </span>
          <span>·</span>
          <span>{job.role || "未填写岗位"}</span>
          <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] text-zinc-500 ring-1 ring-zinc-200">
            匹配分 {analysis.score} · 覆盖 {analysis.matched.length}/
            {analysis.keywordCount}
          </span>
        </div>

        <ol className="space-y-2">
          {steps?.map((step, index) => {
            const status = statuses[step.id] ?? "pending";
            const result = results[step.id];
            const active = ai?.stepId === step.id;
            return (
              <li
                key={step.id}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
                data-qa={`agent-step-${step.id}`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-medium text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-zinc-900">
                        {step.title}
                      </span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10.5px] text-zinc-500">
                        {step.requiresAi ? "AI" : "本地"}
                      </span>
                      <span
                        className={`text-[11px] ${STATUS_TONE[status]}`}
                        data-qa={`agent-status-${step.id}`}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-5 text-zinc-500">
                      {step.rationale}
                    </p>

                    {result ? (
                      <div className="mt-2 rounded-lg bg-zinc-50 px-2.5 py-2 text-[11.5px] leading-5 text-zinc-600">
                        <p className="font-medium text-zinc-800">
                          {result.summary}
                        </p>
                        {result.detail ? (
                          <pre className="mt-1 whitespace-pre-wrap font-sans">
                            {result.detail}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}

                    {active && ai ? (
                      <div className="mt-2 space-y-2">
                        <pre
                          className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[12px] leading-6 text-zinc-800"
                          data-qa="agent-preview"
                        >
                          {ai.text || "等待输出…"}
                        </pre>
                        {ai.done ? (
                          <FactCheckPanel
                            warnings={ai.warnings}
                            sourceLabel="简历素材"
                          />
                        ) : null}
                        {ai.error ? (
                          <p
                            className="text-[11.5px] text-red-600"
                            data-qa="agent-error"
                          >
                            {ai.error}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          {step.id === "rewrite_summary" ? (
                            <Button
                              variant="primary"
                              size="sm"
                              data-qa="agent-adopt"
                              disabled={!ai.done || !ai.text.trim()}
                              onClick={adoptSummary}
                            >
                              采用并写入简介
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              data-qa="agent-copy"
                              disabled={!ai.done || !ai.text.trim()}
                              onClick={copyCover}
                            >
                              {copied ? "已复制" : "复制求职信"}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!ai.done}
                            onClick={() => startAiStep(step)}
                          >
                            重新生成
                          </Button>
                          <Button variant="ghost" size="sm" onClick={discardAi}>
                            放弃
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {status !== "done" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            data-qa={`agent-run-${step.id}`}
                            disabled={
                              running ||
                              (step.requiresAi && !aiStatus?.configured)
                            }
                            onClick={() =>
                              step.requiresAi
                                ? startAiStep(step)
                                : runLocalStep(step)
                            }
                          >
                            {status === "running"
                              ? "执行中…"
                              : status === "failed"
                                ? "重试"
                                : "执行"}
                          </Button>
                        ) : null}
                        {status !== "done" && status !== "skipped" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => skipStep(step)}
                          >
                            跳过
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {trace.length > 0 ? (
          <div
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
            data-qa="agent-trace"
          >
            <p className="text-[10.5px] font-medium uppercase tracking-wide text-zinc-400">
              工具调用轨迹
            </p>
            <ul className="mt-1 space-y-1">
              {trace.map((entry, index) => (
                <li
                  key={`${entry.id}-${index}`}
                  className="flex flex-wrap items-baseline gap-2 text-[11.5px] text-zinc-600"
                >
                  <span className="font-mono text-[11px] text-zinc-500">
                    {entry.id}
                  </span>
                  <span className={STATUS_TONE[entry.status]}>
                    {STATUS_LABEL[entry.status]}
                  </span>
                  <span className="text-zinc-400">{entry.durationMs} ms</span>
                  <span>{entry.summary}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
