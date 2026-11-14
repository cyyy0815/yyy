"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/Button";
import { useApplications } from "@/hooks/useApplications";
import { buildPlan } from "@/lib/agent/plan";
import type { AiStatus } from "@/lib/ai/types";
import { analyzeJd } from "@/lib/jdMatch";
import { saveJd } from "@/lib/jdStorage";
import type { Resume } from "@/lib/types";
import { JobAgentPanel } from "./JobAgentPanel";

type Props = {
  resume: Resume;
  onChange: Dispatch<SetStateAction<Resume>>;
  /** 没有待投岗位时，切到「职位推荐」添加 */
  onGoJobs?: () => void;
};

/**
 * AI 工作台：把求职 Agent 从「弹窗里的一步」提升为一级页面。
 *
 * 页面本身负责三件事：选岗位、按当前岗位与 AI 状态预演计划、启动；
 * 真正的执行仍在 Agent 面板里，这样执行状态、事实核对、采用与撤销的逻辑只有一份。
 */
export function AgentWorkbench({ resume, onChange, onGoJobs }: Props) {
  const { applications } = useApplications();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const workflowRef = useRef<HTMLElement>(null);

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

  const queue = useMemo(
    () =>
      applications
        .filter((application) => application.status === "wishlist")
        .map((application) => ({
          application,
          analysis: analyzeJd(application.jd, resume),
        }))
        .sort(
          (a, b) =>
            (b.analysis?.score ?? -1) - (a.analysis?.score ?? -1) ||
            b.application.updatedAt - a.application.updatedAt,
        ),
    [applications, resume],
  );

  const selected =
    queue.find((item) => item.application.id === selectedId) ?? queue[0] ?? null;
  const agentApp = applications.find((item) => item.id === agentId) ?? null;

  const aiReady = aiStatus?.configured === true;
  const plan = useMemo(
    () =>
      buildPlan({
        resume,
        jd: selected?.application.jd ?? "",
        aiReady,
      }),
    [resume, selected?.application.jd, aiReady],
  );
  const localSteps = plan.filter((step) => !step.requiresAi).length;
  const aiSteps = plan.length - localSteps;

  const selectJob = (id: string) => {
    setSelectedId(id);
    // 移动端列表在流程卡上方：选完直接带到「启动」位置，少滚一次。
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      window.setTimeout(() => {
        workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  };

  const startWorkflow = () => {
    if (!selected) return;
    // 与待投清单里的启动保持一致：先把它设为当前 JD，后续改写/求职信都围绕这个岗位。
    saveJd(selected.application.jd);
    setAgentId(selected.application.id);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.18em] text-zinc-500">
            AI WORKFLOW
          </p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-zinc-900">
            AI 工作台
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-zinc-500">
            选一个待投岗位，Agent 会按你的简历和这段 JD 预演计划；启动后本地两步自动跑完，
            AI 两步逐条生成、经事实核对后由你决定是否采用。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            data-qa="agent-ai-state"
            className={`rounded-full px-2.5 py-1 text-[11.5px] ${
              aiStatus === null
                ? "bg-zinc-100 text-zinc-500"
                : aiReady
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-800"
            }`}
          >
            {aiStatus === null
              ? "检测 AI 配置…"
              : aiReady
                ? "AI 规划已就绪"
                : "未配置 Key · 本地模式"}
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11.5px] text-zinc-600">
            待投 {queue.length}
          </span>
        </div>
      </header>

      {queue.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-zinc-300 bg-white/60 px-6 py-10 text-center">
          <p className="text-[14px] font-medium text-zinc-900">
            还没有待投岗位
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-6 text-zinc-500">
            先去「职位推荐」粘贴一段 JD 加入待投清单；也可以点顶栏「演示场景」，
            用「小林 + 3 个目标岗位」直接体验完整工作流。
          </p>
          {onGoJobs ? (
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={onGoJobs}
            >
              去职位推荐添加岗位
            </Button>
          ) : null}
        </section>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-zinc-900">
                选择目标岗位
              </h2>
              <span className="text-[11.5px] text-zinc-500">
                按匹配度排序 · 共 {queue.length} 个
              </span>
            </div>

            <ul className="mt-3 space-y-2" data-qa="agent-jobs">
              {queue.map((item) => {
                const active = selected?.application.id === item.application.id;
                const coverage =
                  item.analysis.keywordCount > 0
                    ? Math.round(
                        (item.analysis.matched.length /
                          item.analysis.keywordCount) *
                          100,
                      )
                    : 0;
                return (
                  <li key={item.application.id}>
                    <button
                      type="button"
                      data-qa={`agent-job-${item.application.id}`}
                      onClick={() => selectJob(item.application.id)}
                      aria-pressed={active}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900/10"
                          : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/60"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold ${
                            item.analysis.score >= 75
                              ? "bg-emerald-50 text-emerald-700"
                              : item.analysis.score >= 40
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {item.analysis.score}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="block truncate text-[13px] font-medium text-zinc-900">
                              {item.application.company || "未命名公司"} ·{" "}
                              {item.application.role || "未填写岗位"}
                            </span>
                            {active ? (
                              <span className="shrink-0 rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white">
                                已选
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 block truncate text-[11.5px] text-zinc-500">
                            {item.analysis.keywordCount > 0
                              ? `覆盖 ${item.analysis.matched.length}/${item.analysis.keywordCount} 个关键词`
                              : "JD 里没有识别到词库技能"}
                            {item.analysis.missing.length > 0
                              ? ` · 还差 ${item.analysis.missing.slice(0, 3).join("、")}`
                              : ""}
                          </span>
                        </span>
                      </span>
                      <span className="mt-2 flex items-center gap-2">
                        <span className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-100">
                          <span
                            className="block h-full rounded-full bg-zinc-800"
                            style={{ width: `${coverage}%` }}
                          />
                        </span>
                        <span className="w-8 text-right text-[10.5px] tabular-nums text-zinc-400">
                          {coverage}%
                        </span>
                      </span>
                      {!item.application.jd.trim() ? (
                        <span className="mt-2 block text-[11px] text-amber-700">
                          这个岗位还没有 JD，建议先回待投清单补充
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>

            {onGoJobs ? (
              <button
                type="button"
                onClick={onGoJobs}
                className="mt-3 text-[11.5px] text-zinc-500 underline-offset-2 transition hover:text-zinc-800 hover:underline"
              >
                去职位推荐添加更多岗位
              </button>
            ) : null}
          </section>

          <aside
            ref={workflowRef}
            className="scroll-mt-24 rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] lg:sticky lg:top-[88px]"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-[14px] font-semibold text-zinc-900">
                  本次工作流
                </h2>
                <p className="mt-1 text-[11.5px] leading-5 text-zinc-500">
                  {selected
                    ? `${selected.application.company || "未命名公司"} · ${
                        selected.application.role || "未填写岗位"
                      }`
                    : "先选一个岗位"}
                </p>
              </div>
              {selected ? (
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[11px] tabular-nums text-zinc-700">
                  匹配 {selected.analysis.score}
                </span>
              ) : null}
            </div>

            <ol className="mt-4 space-y-3" data-qa="agent-plan-preview">
              {plan.map((step, index) => (
                <li key={step.id} className="flex gap-2.5">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${
                      step.requiresAi && !aiReady
                        ? "bg-amber-100 text-amber-800"
                        : "bg-zinc-900 text-white"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-zinc-900">
                      {step.title}
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-normal ${
                          step.requiresAi
                            ? aiReady
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-800"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {step.requiresAi
                          ? aiReady
                            ? "AI"
                            : "需配置 Key"
                          : "本地"}
                      </span>
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-zinc-500">
                      {step.rationale}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <Button
              variant="primary"
              size="md"
              data-qa="agent-workbench-start"
              disabled={!selected}
              onClick={startWorkflow}
              className="mt-5 w-full"
            >
              {selected
                ? aiReady
                  ? "启动 AI 工作流"
                  : "启动本地工作流"
                : "先选择岗位"}
            </Button>
            <p className="mt-2 text-center text-[11px] leading-5 text-zinc-500">
              {aiReady
                ? `本地 ${localSteps} 步自动执行，AI ${aiSteps} 步逐条确认后再采用`
                : `本地 ${localSteps} 步自动执行；配置 AI Key 后可解锁改写与求职信`}
            </p>
            <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-[10.5px] leading-5 text-zinc-500">
              计划会随岗位与简历变化；模型规划会过工具白名单，失败时自动回退本地计划。
            </p>
          </aside>
        </div>
      )}

      {agentApp ? (
        <JobAgentPanel
          key={agentApp.id}
          resume={resume}
          onChange={onChange}
          job={{
            company: agentApp.company,
            role: agentApp.role,
            jd: agentApp.jd,
          }}
          autoStart
          onClose={() => setAgentId(null)}
        />
      ) : null}
    </div>
  );
}
