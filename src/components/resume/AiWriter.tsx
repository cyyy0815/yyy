"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { streamGenerate } from "@/lib/ai/client";
import { cleanAiText } from "@/lib/ai/prompt";
import type {
  AiGenerateRequest,
  AiMode,
  AiStatus,
  AiTone,
} from "@/lib/ai/types";
import type { Resume } from "@/lib/types";

const SECTION = "summary" as const;

const TONES: { value: AiTone; label: string }[] = [
  { value: "professional", label: "专业稳重" },
  { value: "concise", label: "精炼简洁" },
  { value: "result", label: "结果导向" },
];

type Props = {
  resume: Resume;
  onChange: Dispatch<SetStateAction<Resume>>;
};

export function AiWriter({ resume, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [role, setRole] = useState("");
  const [years, setYears] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState<AiTone>("professional");
  const [mode, setMode] = useState<AiMode>("draft");

  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [undo, setUndo] = useState<{ previous: string } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const prefilledRef = useRef(false);

  const checkStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const response = await fetch("/api/ai/status", { cache: "no-store" });
      if (!response.ok) throw new Error("status_failed");
      setStatus((await response.json()) as AiStatus);
    } catch {
      setStatusError("无法检查 AI 配置，请稍后重试");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const closeDialog = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setConfirmOverwrite(false);
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeDialog]);

  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => setUndo(null), 8000);
    return () => window.clearTimeout(timer);
  }, [undo]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const openDialog = () => {
    if (!prefilledRef.current) {
      setRole(resume.intent.targetRole || resume.basic.headline || "");
      setYears(resume.intent.experience || "");
      prefilledRef.current = true;
    }
    setError(null);
    setConfirmOverwrite(false);
    setOpen(true);
    if (!status && !statusLoading && !statusError) void checkStatus();
  };

  const handleGenerate = async () => {
    const trimmedKeywords = keywords.trim();
    if (!trimmedKeywords) {
      setError("请先填写关键词或成果");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStreaming(true);
    setOutput("");
    setError(null);
    setConfirmOverwrite(false);

    const input: AiGenerateRequest = {
      section: SECTION,
      mode,
      tone,
      role: role.trim(),
      years: years.trim(),
      keywords: trimmedKeywords,
      // 新写不发送现有简介，减少数据暴露。
      current:
        mode === "polish"
          ? resume.basic.summary.trim() || undefined
          : undefined,
    };

    await streamGenerate(input, controller.signal, {
      onDelta: (text) => setOutput((previous) => previous + text),
      onDone: () => setStreaming(false),
      onError: (_code, message) => {
        setError(message);
        setStreaming(false);
      },
    });

    if (abortRef.current === controller) abortRef.current = null;
    setStreaming(false);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  const applyAdopt = () => {
    const text = cleanAiText(output, SECTION);
    if (!text) {
      setError("生成内容为空，请重新生成");
      return;
    }

    const previous = resume.basic.summary;
    onChange((prev) => ({
      ...prev,
      basic: { ...prev.basic, summary: text },
    }));
    setUndo({ previous });
    setConfirmOverwrite(false);
    setOpen(false);
  };

  const handleAdopt = () => {
    if (streaming || !output.trim()) return;
    if (resume.basic.summary.trim() && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }
    applyAdopt();
  };

  const handleUndo = () => {
    if (!undo) return;
    const previous = undo.previous;
    onChange((prev) => ({
      ...prev,
      basic: { ...prev.basic, summary: previous },
    }));
    setUndo(null);
  };

  return (
    <>
      <div className="print-hide flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-gradient-to-r from-blue-50/80 via-white to-white px-4 py-3">
        <div>
          <p className="text-[13px] font-semibold text-zinc-900">AI 帮我写</p>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            填写岗位与关键词，生成个人简介草稿，确认后写入简历。
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={openDialog}
          className="border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
        >
          帮我写简介
        </Button>
      </div>

      {undo ? (
        <div
          role="status"
          className="print-hide fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full bg-zinc-900 px-4 py-2 text-[12px] text-white shadow-lg"
        >
          <span>已写入简历</span>
          <button
            type="button"
            onClick={handleUndo}
            className="font-medium text-blue-300 transition hover:text-blue-200"
          >
            撤销
          </button>
        </div>
      ) : null}

      {open ? (
        <div
          className="print-hide fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-writer-title"
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
              <div>
                <h2
                  id="ai-writer-title"
                  className="text-[15px] font-semibold text-zinc-900"
                >
                  AI 帮我写
                </h2>
                <p className="mt-0.5 text-[11.5px] text-zinc-500">
                  个人简介 · 内容会发送到 DeepSeek
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="关闭"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[16px] leading-none text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                ×
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {statusLoading || (!status && !statusError) ? (
                <p className="py-8 text-center text-[12.5px] text-zinc-400">
                  正在检查 AI 配置…
                </p>
              ) : statusError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[12.5px] text-red-700">
                  <p>{statusError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void checkStatus()}
                  >
                    重新检查
                  </Button>
                </div>
              ) : status && !status.configured ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[12.5px] leading-5 text-amber-900">
                  <p className="font-medium">还没有配置 DeepSeek API Key</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    <li>
                      在项目根目录创建{" "}
                      <code className="rounded bg-white/70 px-1">.env.local</code>
                    </li>
                    <li>
                      写入{" "}
                      <code className="rounded bg-white/70 px-1">
                        DEEPSEEK_API_KEY=sk-...
                      </code>
                    </li>
                    <li>
                      重启{" "}
                      <code className="rounded bg-white/70 px-1">npm run dev</code>
                    </li>
                  </ol>
                  <p className="mt-2 text-amber-800/80">
                    配置不会影响你继续手动编辑简历。
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void checkStatus()}
                  >
                    重新检查
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="目标岗位" hint="选填">
                      <TextInput
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        maxLength={80}
                        placeholder="如 前端工程师"
                      />
                    </Field>
                    <Field label="工作年限" hint="选填">
                      <TextInput
                        value={years}
                        onChange={(event) => setYears(event.target.value)}
                        maxLength={20}
                        placeholder="如 3-5 年"
                      />
                    </Field>
                  </div>

                  <Field label="关键词 / 成果" hint={`${keywords.length}/2000`}>
                    <TextArea
                      autoFocus
                      value={keywords}
                      onChange={(event) => setKeywords(event.target.value)}
                      maxLength={2000}
                      className="min-h-[96px]"
                      placeholder="一条一行，如：主导中后台重构；首屏性能提升 40%；带过 3 人小组"
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="风格">
                      <Select
                        value={tone}
                        onChange={(event) =>
                          setTone(event.target.value as AiTone)
                        }
                      >
                        {TONES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="模式">
                      <Select
                        value={mode}
                        onChange={(event) =>
                          setMode(event.target.value as AiMode)
                        }
                      >
                        <option value="draft">新写</option>
                        <option
                          value="polish"
                          disabled={!resume.basic.summary.trim()}
                        >
                          优化现有简介
                          {resume.basic.summary.trim() ? "" : "（简介为空）"}
                        </option>
                      </Select>
                    </Field>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void handleGenerate()}
                      disabled={streaming || !keywords.trim()}
                    >
                      {output ? "重新生成" : "生成"}
                    </Button>
                    {streaming ? (
                      <Button variant="ghost" size="sm" onClick={handleStop}>
                        停止
                      </Button>
                    ) : null}
                    {status?.model ? (
                      <span className="ml-auto text-[11px] text-zinc-400">
                        {status.model}
                      </span>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] text-zinc-400">
                      <span>生成预览</span>
                      {output ? <span>{output.length} 字</span> : null}
                    </div>
                    <div className="min-h-[120px] whitespace-pre-wrap text-[13px] leading-6 text-zinc-800">
                      {output ||
                        (streaming ? "AI 正在构思…" : "填写关键词后点击生成")}
                      {streaming ? (
                        <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-zinc-900 align-middle" />
                      ) : null}
                    </div>
                  </div>

                  {error ? (
                    <p role="alert" className="text-[12px] text-red-600">
                      {error}
                    </p>
                  ) : null}

                  {confirmOverwrite ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                      <p>个人简介已有内容，采用后会覆盖原文。</p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={applyAdopt}
                        >
                          确认覆盖
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmOverwrite(false)}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <footer className="border-t border-zinc-100 px-5 py-3">
              <p className="text-[11px] leading-4 text-zinc-400">
                只发送本面板内容与当前简介，不发送姓名、电话、邮箱或整份简历。
              </p>
              <div className="mt-2 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={closeDialog}>
                  取消
                </Button>
                {status?.configured ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAdopt}
                    disabled={streaming || !output.trim()}
                  >
                    采用到简历
                  </Button>
                ) : null}
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
