"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { streamGenerate } from "@/lib/ai/client";
import { cleanAiText } from "@/lib/ai/prompt";
import type { AiStatus, AiTone } from "@/lib/ai/types";
import { JD_MAX_LENGTH, readSavedJd } from "@/lib/jdStorage";
import type { Resume } from "@/lib/types";

const TONES: { value: AiTone; label: string }[] = [
  { value: "professional", label: "专业稳重" },
  { value: "concise", label: "精炼简洁" },
  { value: "result", label: "结果导向" },
];

const MATERIAL_MAX = 2000;

/** 默认素材只取简介与前 12 个技能，姓名和联系方式不进入请求。 */
function buildMaterial(resume: Resume): string {
  const parts: string[] = [];
  const summary = resume.basic.summary.trim();
  if (summary) parts.push(summary);
  const skills = resume.skills.slice(0, 12);
  if (skills.length > 0) parts.push(`核心技能：${skills.join("、")}`);
  return parts.join("\n").slice(0, MATERIAL_MAX);
}

function safeFilePart(value: string): string {
  return value
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 继续尝试旧版复制。
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}

export function CoverLetterWriter({ resume }: { resume: Resume }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [role, setRole] = useState("");
  const [years, setYears] = useState("");
  const [material, setMaterial] = useState("");
  const [jd, setJd] = useState("");
  const [jdFromSaved, setJdFromSaved] = useState(false);
  const [tone, setTone] = useState<AiTone>("professional");

  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef("");
  const copyTimerRef = useRef<number | null>(null);

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

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(
    () => () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const openDialog = () => {
    setRole(
      (current) =>
        current ||
        resume.intent.targetRole.trim() ||
        resume.basic.headline.trim(),
    );
    setYears((current) => current || resume.intent.experience.trim());
    setMaterial((current) => current || buildMaterial(resume));
    const savedJd = readSavedJd().trim().slice(0, JD_MAX_LENGTH);
    setJd(savedJd);
    setJdFromSaved(Boolean(savedJd));
    setError(null);
    setCopied(false);
    setOpen(true);
    if (!status && !statusLoading && !statusError) void checkStatus();
  };

  const handleGenerate = async () => {
    const trimmedMaterial = material.trim();
    if (!trimmedMaterial) {
      setError("请先填写个人素材");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    outputRef.current = "";
    setStreaming(true);
    setOutput("");
    setError(null);
    setCopied(false);

    await streamGenerate(
      {
        section: "cover",
        mode: "draft",
        tone,
        role: role.trim(),
        years: years.trim(),
        keywords: trimmedMaterial,
        jd: jd.trim() || undefined,
      },
      controller.signal,
      {
        onDelta: (text) => {
          outputRef.current += text;
          setOutput(outputRef.current);
        },
        onDone: () => {
          const cleaned = cleanAiText(outputRef.current, "cover");
          setStreaming(false);
          setOutput(cleaned);
          if (!cleaned) setError("生成内容为空，请重新生成");
        },
        onError: (_code, message) => {
          setError(message);
          setStreaming(false);
        },
      },
    );

    if (abortRef.current === controller) abortRef.current = null;
    setStreaming(false);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  const letter = output.trim();

  const handleCopy = async () => {
    if (!letter) return;
    const ok = await copyText(letter);
    if (!ok) {
      setError("复制失败，请手动选中文本复制");
      return;
    }
    setCopied(true);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!letter) return;
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `求职信-${safeFilePart(role) || "未命名岗位"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <section
        data-qa="cover-letter"
        className="rounded-3xl border border-blue-200/70 bg-gradient-to-r from-blue-50/70 via-white to-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[14px] font-semibold tracking-tight text-zinc-900">
                AI 求职信
              </h3>
              <span className="rounded-full border border-blue-200 bg-white/70 px-2 py-0.5 text-[10px] text-blue-700">
                可选 · DeepSeek
              </span>
            </div>
            <p className="mt-1.5 max-w-2xl text-[12.5px] leading-6 text-zinc-500">
              用简历摘要、核心技能与参考 JD 生成一封中文求职信；可编辑后复制或下载，不会写入简历。
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            data-qa="cover-letter-open"
            onClick={openDialog}
            className="shrink-0 border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
          >
            生成求职信
          </Button>
        </div>
      </section>

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
            aria-labelledby="cover-letter-title"
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
              <div>
                <h2
                  id="cover-letter-title"
                  className="text-[15px] font-semibold text-zinc-900"
                >
                  AI 求职信
                </h2>
                <p className="mt-0.5 text-[11.5px] text-zinc-500">
                  中文求职信 · 内容会发送到 DeepSeek
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
                    配置不会影响你使用简历编辑与求职推荐。
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
                        data-qa="cover-role"
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        maxLength={80}
                        placeholder="如 前端工程师"
                      />
                    </Field>
                    <Field label="工作年限" hint="选填">
                      <TextInput
                        data-qa="cover-years"
                        value={years}
                        onChange={(event) => setYears(event.target.value)}
                        maxLength={20}
                        placeholder="如 3-5 年"
                      />
                    </Field>
                  </div>

                  <Field
                    label="个人素材"
                    hint={`${material.length}/${MATERIAL_MAX} · 默认取自简介与技能，可删改`}
                  >
                    <TextArea
                      autoFocus
                      data-qa="cover-brief"
                      value={material}
                      onChange={(event) => setMaterial(event.target.value)}
                      maxLength={MATERIAL_MAX}
                      className="min-h-[120px]"
                      placeholder={
                        "写你希望招聘方记住的事实，例如：\n4 年前端经验，主导中后台重构；首屏性能提升 40%；带过 3 人小组。"
                      }
                    />
                  </Field>

                  <Field
                    label="参考 JD"
                    hint={`${jd.length}/${JD_MAX_LENGTH}${
                      jdFromSaved ? " · 已读取 JD 匹配页" : " · 选填"
                    }`}
                  >
                    <TextArea
                      data-qa="cover-jd"
                      value={jd}
                      onChange={(event) => {
                        setJd(event.target.value);
                        setJdFromSaved(false);
                      }}
                      maxLength={JD_MAX_LENGTH}
                      className="min-h-[88px]"
                      placeholder="选填：粘贴目标岗位 JD，求职信会针对它调整重点，但不会编造你没写过的经历"
                    />
                  </Field>

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

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      data-qa="cover-generate"
                      onClick={() => void handleGenerate()}
                      disabled={streaming || !material.trim()}
                    >
                      {streaming
                        ? "生成中…"
                        : output
                          ? "重新生成"
                          : "生成求职信"}
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
                      <span>
                        求职信预览
                        {letter && !streaming ? "（可直接修改）" : ""}
                      </span>
                      {letter ? <span>{letter.length} 字</span> : null}
                    </div>
                    {output && !streaming ? (
                      <textarea
                        data-qa="cover-output"
                        aria-label="求职信预览，可直接修改"
                        value={output}
                        onChange={(event) => setOutput(event.target.value)}
                        className="min-h-[280px] w-full resize-y bg-transparent text-[13px] leading-6 text-zinc-800 outline-none"
                      />
                    ) : (
                      <div className="min-h-[220px] whitespace-pre-wrap text-[13px] leading-6 text-zinc-800">
                        {output ||
                          (streaming
                            ? "AI 正在写求职信…"
                            : "生成后，这里会显示求职信草稿")}
                        {streaming ? (
                          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-zinc-900 align-middle" />
                        ) : null}
                      </div>
                    )}
                  </div>

                  {error ? (
                    <p role="alert" className="text-[12px] text-red-600">
                      {error}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <footer className="border-t border-zinc-100 px-5 py-3">
              <p className="text-[11px] leading-4 text-zinc-400">
                只发送本面板中的目标岗位、工作年限、个人素材与参考 JD；姓名、邮箱、电话和链接不会发送（服务端也会再次过滤）。个人素材可自行删改。
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                {letter && !streaming ? (
                  <>
                    <span className="mr-auto text-[10.5px] text-zinc-400">
                      可直接粘贴到邮件或招聘平台
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      data-qa="cover-copy"
                      onClick={() => void handleCopy()}
                    >
                      {copied ? "已复制" : "复制全文"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      data-qa="cover-download"
                      onClick={handleDownload}
                    >
                      下载 .txt
                    </Button>
                  </>
                ) : null}
                <Button variant="ghost" size="sm" onClick={closeDialog}>
                  关闭
                </Button>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
