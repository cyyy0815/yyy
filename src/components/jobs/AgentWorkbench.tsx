"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/Button";
import { useApplications } from "@/hooks/useApplications";
import { TOOL_SPECS } from "@/lib/agent/tools";
import { analyzeJd } from "@/lib/jdMatch";
import type { Resume } from "@/lib/types";
import { JobAgentPanel } from "./JobAgentPanel";

type Props = {
  resume: Resume;
  onChange: Dispatch<SetStateAction<Resume>>;
};

const PIPELINE = [
  {
    id: "analyze_jd" as const,
    hint: "本地计算 · 不发数据",
  },
  {
    id: "diagnose_gaps" as const,
    hint: "本地计算 · 对照岗位画像",
  },
  {
    id: "rewrite_summary" as const,
    hint: "AI 流式 · 生成后事实核对",
  },
  {
    id: "cover_letter" as const,
    hint: "AI 流式 · 可直接复制",
  },
];

/**
 * AI 工作台：把求职 Agent 从「弹窗里的一步」提升为一级页面。
 *
 * 页面本身只做三件事：选岗位、说明流水线、启动；真正的执行仍在 Agent 面板里，
 * 这样执行状态、事实核对、采用与撤销的逻辑只有一份。
 */
export function AgentWorkbench({ resume, onChange }: Props) {
  const { applications } = useApplications();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] tracking-[0.18em] text-zinc-400">AI WORKFLOW</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-zinc-900">
          AI 工作台
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-zinc-500">
          选一个目标岗位，让 Agent 规划并执行「解析 → 诊断 → 改写 → 求职信」四步。
          前两步在你的浏览器里算，后两步由模型生成、经事实核对后由你决定是否采用。
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[14px] font-semibold text-zinc-900">
              1. 选择目标岗位
            </h2>
            <span className="text-[11.5px] text-zinc-400">
              共 {queue.length} 个待投
            </span>
          </div>

          {queue.length === 0 ? (
            <p className="mt-4 rounded-xl bg-zinc-50 px-3 py-6 text-center text-[12.5px] text-zinc-500">
              还没有待投岗位。先去「职位推荐」粘贴一段 JD，或点顶栏「演示场景」载入示例。
            </p>
          ) : (
            <ul className="mt-3 space-y-2" data-qa="agent-jobs">
              {queue.map((item) => {
                const active = selected?.application.id === item.application.id;
                return (
                  <li key={item.application.id}>
                    <button
                      type="button"
                      data-qa={`agent-job-${item.application.id}`}
                      onClick={() => setSelectedId(item.application.id)}
                      aria-pressed={active}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold ${
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
                        <span className="block truncate text-[13px] font-medium text-zinc-900">
                          {item.application.company || "未命名公司"} ·{" "}
                          {item.application.role || "未填写岗位"}
                        </span>
                        <span className="mt-0.5 block truncate text-[11.5px] text-zinc-500">
                          覆盖 {item.analysis.matched.length}/
                          {item.analysis.keywordCount} 个关键词
                          {item.analysis.missing.length > 0
                            ? ` · 还差 ${item.analysis.missing.slice(0, 3).join("、")}`
                            : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="md"
              data-qa="agent-workbench-start"
              disabled={!selected}
              onClick={() => selected && setAgentId(selected.application.id)}
            >
              启动 AI 工作流
            </Button>
            <span className="text-[11.5px] text-zinc-500">
              {selected
                ? `将处理：${selected.application.company || "未命名公司"} · ${selected.application.role || "未填写岗位"}`
                : "先选一个岗位"}
            </span>
          </div>
        </section>

        <aside className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <h2 className="text-[14px] font-semibold text-zinc-900">
            2. 流水线会做什么
          </h2>
          <ol className="mt-3 space-y-3">
            {PIPELINE.map((item, index) => (
              <li key={item.id} className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-medium text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-zinc-900">
                    {TOOL_SPECS[item.id].title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-5 text-zinc-500">
                    {item.hint}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-xl bg-zinc-50 px-3 py-2 text-[11px] leading-5 text-zinc-500">
            计划由模型生成（工具白名单校验），本地步骤跑完会把观察回灌给模型重新规划；
            没有配置 AI Key 时自动用本地计划，前两步照样能跑。
          </p>
        </aside>
      </div>

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
    </div>
  );
}
