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
  AiSection,
  AiStatus,
  AiTone,
} from "@/lib/ai/types";
import { newId, type Resume } from "@/lib/types";

const SECTIONS: { value: AiSection; label: string }[] = [
  { value: "summary", label: "个人简介" },
  { value: "experience", label: "工作经历" },
  { value: "project", label: "项目经历" },
];

const SECTION_LABELS: Record<AiSection, string> = {
  summary: "个人简介",
  experience: "工作经历",
  project: "项目经历",
};

const NEW_ENTRY_HINTS: Record<"experience" | "project", string> = {
  experience: "将新建一条空经历，公司、职位、时间由你补充。",
  project: "将新建一条空项目，项目名、角色、链接由你补充。",
};

const TONES: { value: AiTone; label: string }[] = [
  { value: "professional", label: "专业稳重" },
  { value: "concise", label: "精炼简洁" },
  { value: "result", label: "结果导向" },
];

type AdoptMode = "replace" | "append";

type UndoState =
  | { kind: "summary"; previous: string }
  | {
      kind: "experience";
      id: string;
      previousDescription: string;
      created: boolean;
    }
  | {
      kind: "project";
      id: string;
      previousDescription: string;
      created: boolean;
    };

type Props = {
  resume: Resume;
  onChange: Dispatch<SetStateAction<Resume>>;
};

export function AiWriter({ resume, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [section, setSection] = useState<AiSection>("summary");
  const [targetId, setTargetId] = useState("new");
  const [adoptMode, setAdoptMode] = useState<AdoptMode>("replace");

  const [role, setRole] = useState("");
  const [years, setYears] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState<AiTone>("professional");
  const [mode, setMode] = useState<AiMode>("draft");

  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [undo, setUndo] = useState<UndoState | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const prefilledRef = useRef(false);

  const currentText =
    section === "summary"
      ? resume.basic.summary
      : section === "experience"
        ? (resume.experiences.find((item) => item.id === targetId)?.description ??
          "")
        : (resume.projects.find((item) => item.id === targetId)?.description ??
          "");

  const targets =
    section === "experience"
      ? resume.experiences.map((item) => ({
          id: item.id,
          label: `${item.company || "未命名公司"} · ${item.role || "未填写职位"}`,
        }))
      : section === "project"
        ? resume.projects.map((item) => ({
            id: item.id,
            label: item.name || "未命名项目",
          }))
        : [];

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

  const handleSectionChange = (next: AiSection) => {
    setSection(next);
    setTargetId("new");
    setAdoptMode("replace");
    setMode("draft");
    setOutput("");
    setError(null);
    setConfirmOverwrite(false);
  };

  const handleTargetChange = (next: string) => {
    setTargetId(next);
    setAdoptMode("replace");
    setOutput("");
    setError(null);
    setConfirmOverwrite(false);

    const nextText =
      next === "new"
        ? ""
        : section === "experience"
          ? (resume.experiences.find((item) => item.id === next)?.description ??
            "")
          : (resume.projects.find((item) => item.id === next)?.description ?? "");

    if (mode === "polish" && !nextText.trim()) setMode("draft");
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
      section,
      mode,
      tone,
      role: role.trim(),
      years: years.trim(),
      keywords: trimmedKeywords,
      // 新写不发送现有文本，减少数据暴露。
      current:
        mode === "polish" ? currentText.trim() || undefined : undefined,
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
    const text = cleanAiText(output, section);
    if (!text) {
      setError("生成内容为空，请重新生成");
      return;
    }

    if (section === "summary") {
      const previous = resume.basic.summary;
      onChange((prev) => ({
        ...prev,
        basic: { ...prev.basic, summary: text },
      }));
      setUndo({ kind: "summary", previous });
    } else if (section === "experience") {
      if (targetId === "new") {
        const id = newId();
        onChange((prev) => ({
          ...prev,
          experiences: [
            ...prev.experiences,
            { id, company: "", role: "", start: "", end: "", description: text },
          ],
        }));
        setUndo({
          kind: "experience",
          id,
          previousDescription: "",
          created: true,
        });
      } else {
        const item = resume.experiences.find((entry) => entry.id === targetId);
        if (!item) {
          setError("目标经历不存在，请重新选择");
          return;
        }
        const previous = item.description;
        const nextDescription =
          adoptMode === "append" && previous.trim()
            ? `${previous.trim()}\n${text}`
            : text;
        onChange((prev) => ({
          ...prev,
          experiences: prev.experiences.map((entry) =>
            entry.id === targetId
              ? { ...entry, description: nextDescription }
              : entry,
          ),
        }));
        setUndo({
          kind: "experience",
          id: targetId,
          previousDescription: previous,
          created: false,
        });
      }
    } else {
      if (targetId === "new") {
        const id = newId();
        onChange((prev) => ({
          ...prev,
          projects: [
            ...prev.projects,
            { id, name: "", role: "", description: text, link: "" },
          ],
        }));
        setUndo({
          kind: "project",
          id,
          previousDescription: "",
          created: true,
        });
      } else {
        const item = resume.projects.find((entry) => entry.id === targetId);
        if (!item) {
          setError("目标项目不存在，请重新选择");
          return;
        }
        const previous = item.description;
        const nextDescription =
          adoptMode === "append" && previous.trim()
            ? `${previous.trim()}\n${text}`
            : text;
        onChange((prev) => ({
          ...prev,
          projects: prev.projects.map((entry) =>
            entry.id === targetId
              ? { ...entry, description: nextDescription }
              : entry,
          ),
        }));
        setUndo({
          kind: "project",
          id: targetId,
          previousDescription: previous,
          created: false,
        });
      }
    }

    setOutput("");
    setError(null);
    setConfirmOverwrite(false);
    setOpen(false);
  };

  const handleAdopt = () => {
    if (streaming || !output.trim()) return;

    const destructive =
      section === "summary"
        ? Boolean(resume.basic.summary.trim())
        : targetId !== "new" &&
          adoptMode === "replace" &&
          Boolean(currentText.trim());

    if (destructive && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }
    applyAdopt();
  };

  const handleUndo = () => {
    if (!undo) return;

    if (undo.kind === "summary") {
      const previous = undo.previous;
      onChange((prev) => ({
        ...prev,
        basic: { ...prev.basic, summary: previous },
      }));
    } else if (undo.kind === "experience") {
      const { id, previousDescription, created } = undo;
      onChange((prev) => ({
        ...prev,
        experiences: created
          ? prev.experiences.filter((entry) => entry.id !== id)
          : prev.experiences.map((entry) =>
              entry.id === id
                ? { ...entry, description: previousDescription }
                : entry,
            ),
      }));
    } else {
      const { id, previousDescription, created } = undo;
      onChange((prev) => ({
        ...prev,
        projects: created
          ? prev.projects.filter((entry) => entry.id !== id)
          : prev.projects.map((entry) =>
              entry.id === id
                ? { ...entry, description: previousDescription }
                : entry,
            ),
      }));
    }

    setUndo(null);
  };

  return (
    <>
      <div className="print-hide flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-gradient-to-r from-blue-50/80 via-white to-white px-4 py-3">
        <div>
          <p className="text-[13px] font-semibold text-zinc-900">AI 帮我写</p>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            生成个人简介、工作经历或项目描述草稿，确认后写入简历。
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={openDialog}
          className="border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
        >
          开始生成
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
                  {SECTION_LABELS[section]} · 内容会发送到 DeepSeek
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
                  <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
                    {SECTIONS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handleSectionChange(item.value)}
                        aria-pressed={section === item.value}
                        className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium transition ${
                          section === item.value
                            ? "bg-white text-zinc-900 shadow-sm"
                            : "text-zinc-500 hover:text-zinc-900"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

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

                  {section !== "summary" ? (
                    <>
                      <Field label="写入到">
                        <Select
                          value={targetId}
                          onChange={(event) =>
                            handleTargetChange(event.target.value)
                          }
                        >
                          <option value="new">新建一条</option>
                          {targets.map((target) => (
                            <option key={target.id} value={target.id}>
                              {target.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      {targetId === "new" ? (
                        <p className="-mt-1 text-[11px] leading-4 text-zinc-400">
                          {NEW_ENTRY_HINTS[section]}
                        </p>
                      ) : null}
                    </>
                  ) : null}

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
                        <option value="polish" disabled={!currentText.trim()}>
                          优化现有{SECTION_LABELS[section]}
                          {currentText.trim() ? "" : "（暂无内容）"}
                        </option>
                      </Select>
                    </Field>
                  </div>

                  {section !== "summary" && targetId !== "new" ? (
                    <Field label="采用方式" hint="追加不会删除原文">
                      <Select
                        value={adoptMode}
                        onChange={(event) =>
                          setAdoptMode(event.target.value as AdoptMode)
                        }
                      >
                        <option value="replace">替换现有描述</option>
                        <option value="append">追加到现有描述</option>
                      </Select>
                    </Field>
                  ) : null}

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
                      <span>
                        生成预览
                        {output && !streaming ? "（可直接修改）" : ""}
                      </span>
                      {output ? <span>{output.length} 字</span> : null}
                    </div>
                    {output && !streaming ? (
                      <textarea
                        value={output}
                        onChange={(event) => setOutput(event.target.value)}
                        aria-label="生成预览，可直接修改"
                        className="min-h-[120px] w-full resize-y bg-transparent text-[13px] leading-6 text-zinc-800 outline-none"
                      />
                    ) : (
                      <div className="min-h-[120px] whitespace-pre-wrap text-[13px] leading-6 text-zinc-800">
                        {output ||
                          (streaming
                            ? "AI 正在构思…"
                            : "填写关键词后点击生成")}
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

                  {confirmOverwrite ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                      <p>
                        {section === "summary"
                          ? "个人简介已有内容，采用后会覆盖原文。"
                          : `该条${SECTION_LABELS[section]}已有描述，采用后会覆盖原文。`}
                      </p>
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
                只发送本面板内容与当前板块文本，不发送姓名、电话、邮箱或整份简历。
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
