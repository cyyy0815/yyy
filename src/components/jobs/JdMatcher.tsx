"use client";

import { useEffect, useMemo, useState } from "react";
import { analyzeJd } from "@/lib/jdMatch";
import type { Resume } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { SkillChip } from "./SkillChip";

const JD_STORAGE_KEY = "resume-workshop:jd";

function readSavedJd(): string {
  try {
    return window.localStorage.getItem(JD_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function JdMatcher({
  resume,
  onAddSkill,
}: {
  resume: Resume;
  onAddSkill: (skill: string) => void;
}) {
  const [jd, setJd] = useState(readSavedJd);
  const [showResult, setShowResult] = useState(false);

  const result = useMemo(
    () => (showResult && jd.trim() ? analyzeJd(jd, resume) : null),
    [showResult, jd, resume],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (jd.trim()) {
          window.localStorage.setItem(JD_STORAGE_KEY, jd);
        } else {
          window.localStorage.removeItem(JD_STORAGE_KEY);
        }
      } catch {
        // ignore
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [jd]);

  const clear = () => {
    setJd("");
    setShowResult(false);
    try {
      window.localStorage.removeItem(JD_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const scoreColor =
    result && result.score >= 75
      ? "text-emerald-600"
      : result && result.score >= 50
        ? "text-blue-700"
        : "text-amber-600";
  const barColor =
    result && result.score >= 75
      ? "bg-emerald-600"
      : result && result.score >= 50
        ? "bg-blue-700"
        : "bg-amber-500";

  return (
    <section
      data-qa="jd-matcher"
      className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold tracking-tight text-zinc-900">
            已有目标 JD？测测匹配度
          </h3>
          <p className="mt-1 text-[12px] text-zinc-500">
            粘贴岗位描述，看看简历覆盖了哪些关键词、还缺什么
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10.5px] text-zinc-500">
          本地分析，不上传
        </span>
      </div>

      <TextArea
        value={jd}
        onChange={(event) => setJd(event.target.value)}
        placeholder={
          "例如：\n岗位职责：负责 Web 前端开发，使用 React、TypeScript 构建页面……\n任职要求：3 年以上经验，本科及以上学历，熟悉 HTML、CSS、JavaScript……"
        }
        className="mt-4 min-h-[132px]"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          onClick={() => setShowResult(true)}
          disabled={!jd.trim()}
        >
          分析匹配度
        </Button>
        {jd ? (
          <Button variant="ghost" onClick={clear}>
            清空
          </Button>
        ) : null}
        <span className="text-[11px] text-zinc-400">粘贴完整 JD，结果更准</span>
      </div>

      {result ? (
        <div className="mt-5 border-t border-zinc-100 pt-5" aria-live="polite">
          {result.keywordCount === 0 ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-[12.5px] leading-6 text-amber-700">
              没有从这段文字里识别到常见的技能关键词。可以粘贴更完整的「任职要求」部分再试。
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-[36px] font-semibold leading-none tracking-tight tabular-nums ${scoreColor}`}
                  >
                    {result.score}
                  </span>
                  <span className="text-[13px] text-zinc-400">%</span>
                </div>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11.5px] text-zinc-600">
                  {result.label}
                </span>
                <span className="ml-auto text-[11.5px] text-zinc-400">
                  JD 关键词 {result.keywordCount} 个 · 已覆盖 {result.matched.length} 个
                </span>
              </div>

              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${result.score}%` }}
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[11px] text-zinc-400">简历已覆盖</p>
                  {result.matched.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {result.matched.map((skill) => (
                        <SkillChip key={skill} tone="matched">
                          {skill}
                        </SkillChip>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-zinc-400">暂无</p>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-[11px] text-zinc-400">
                    简历未体现
                    {result.missing.length > 0 ? (
                      <span className="ml-1 text-zinc-300">
                        · 若你掌握，点击加入简历
                      </span>
                    ) : null}
                  </p>
                  {result.missing.length > 0 ? (
                    <div
                      data-qa="jd-missing"
                      className="flex flex-wrap gap-1.5"
                    >
                      {result.missing.map((skill) => (
                        <SkillChip
                          key={skill}
                          tone="missing"
                          onClick={() => onAddSkill(skill)}
                          title="若你掌握该技能，点击加入简历"
                        >
                          {skill}
                        </SkillChip>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-emerald-600">全部覆盖</p>
                  )}
                </div>
              </div>

              <ol className="mt-5 space-y-2.5">
                {result.suggestions.map((suggestion, index) => (
                  <li key={suggestion} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-medium text-zinc-500">
                      {index + 1}
                    </span>
                    <span className="text-[12.5px] leading-6 text-zinc-600">
                      {suggestion}
                    </span>
                  </li>
                ))}
              </ol>

              <p className="mt-4 text-[10.5px] leading-5 text-zinc-400">
                仅基于本地技能词典与简历文本做关键词覆盖分析，不构成录用判断；建议结合岗位实际情况投递。
              </p>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
