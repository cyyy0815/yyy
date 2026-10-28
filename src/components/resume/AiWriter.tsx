"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FactCheckPanel } from "@/components/ui/FactCheckPanel";
import { Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { streamFullResume, streamGenerate } from "@/lib/ai/client";
import {
  checkFullResumeFacts,
  checkGeneratedText,
} from "@/lib/ai/factCheck";
import {
  parseFullResumeOutput,
  type FullResumeStats,
} from "@/lib/ai/fullResume";
import { cleanAiText } from "@/lib/ai/prompt";
import {
  type AiMode,
  type AiSection,
  type AiStatus,
  type AiTone,
} from "@/lib/ai/types";
import { JD_MAX_LENGTH, readSavedJd } from "@/lib/jdStorage";
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
  cover: "求职信",
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
type AiTab = AiSection | "full";

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
  onCreateDocument: (resume: Resume, title: string) => boolean;
};

export function AiWriter({ resume, onChange, onCreateDocument }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [section, setSection] = useState<AiSection>("summary");
  const [fullMode, setFullMode] = useState(false);
  const [targetId, setTargetId] = useState("new");
  const [adoptMode, setAdoptMode] = useState<AdoptMode>("replace");

  const [role, setRole] = useState("");
  const [years, setYears] = useState("");
  const [keywords, setKeywords] = useState("");
  const [jd, setJd] = useState("");
  const [jdFromSaved, setJdFromSaved] = useState(false);
  const [tone, setTone] = useState<AiTone>("professional");
  const [mode, setMode] = useState<AiMode>("draft");

  const [output, setOutput] = useState("");
  const [brief, setBrief] = useState("");
  const [fullRaw, setFullRaw] = useState("");
  const [fullDraft, setFullDraft] = useState<Resume | null>(null);
  const [fullStats, setFullStats] = useState<FullResumeStats | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [undo, setUndo] = useState<UndoState | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const fullRawRef = useRef("");
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

  const canGenerate = fullMode
    ? Boolean(brief.trim())
    : Boolean(keywords.trim()) ||
      (mode === "polish" && Boolean(currentText.trim()));

  // JD 是岗位要求，不是求职者的事实，因此不进入事实核对来源。
  const singleWarnings = useMemo(() => {
    if (!output.trim() || streaming) return [];
    return checkGeneratedText(cleanAiText(output, section), [
      role,
      years,
      keywords,
      currentText,
    ].join("\n"));
  }, [output, streaming, section, role, years, keywords, currentText]);

  const fullWarnings = useMemo(
    () =>
      fullDraft && !streaming ? checkFullResumeFacts(fullDraft, brief) : [],
    [fullDraft, streaming, brief],
  );

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
    const savedJd = readSavedJd().trim().slice(0, JD_MAX_LENGTH);
    setJd(savedJd);
    setJdFromSaved(Boolean(savedJd));
    setError(null);
    setConfirmOverwrite(false);
    setOpen(true);
    if (!status && !statusLoading && !statusError) void checkStatus();
  };

  const handleTabChange = (next: AiTab) => {
    if (next === "full") {
      setFullMode(true);
      setTargetId("new");
      setAdoptMode("replace");
      setMode("draft");
      setOutput("");
      setFullRaw("");
      setFullDraft(null);
      setFullStats(null);
      setError(null);
      setConfirmOverwrite(false);
      return;
    }

    setFullMode(false);
    setSection(next);
    setTargetId("new");
    setAdoptMode("replace");
    setMode("draft");
    setOutput("");
    setFullRaw("");
    setFullDraft(null);
    setFullStats(null);
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
    const currentForPolish = currentText.trim();
    if (!trimmedKeywords && !(mode === "polish" && currentForPolish)) {
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

    await streamGenerate(
      {
        section,
        mode,
        tone,
        role: role.trim(),
        years: years.trim(),
        keywords: trimmedKeywords,
        // 新写不发送现有文本，减少数据暴露。
        current: mode === "polish" ? currentForPolish || undefined : undefined,
        jd: jd.trim() || undefined,
      },
      controller.signal,
      {
        onDelta: (text) => setOutput((previous) => previous + text),
        onDone: () => setStreaming(false),
        onError: (_code, message) => {
          setError(message);
          setStreaming(false);
        },
      },
    );

    if (abortRef.current === controller) abortRef.current = null;
    setStreaming(false);
  };

  /** 流式接收完整 JSON 后一次性解析；解析失败时保留错误提示。 */
  const finishFullGeneration = (raw: string) => {
    const parsed = parseFullResumeOutput(raw);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setFullDraft(parsed.resume);
    setFullStats(parsed.stats);
  };

  const handleGenerateFull = async () => {
    const trimmedBrief = brief.trim();
    if (!trimmedBrief) {
      setError("请先写一段个人经历自述");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fullRawRef.current = "";
    setStreaming(true);
    setFullRaw("");
    setFullDraft(null);
    setFullStats(null);
    setError(null);
    setConfirmOverwrite(false);

    await streamFullResume(
      {
        brief: trimmedBrief,
        role: role.trim(),
        years: years.trim(),
        jd: jd.trim() || undefined,
        tone,
      },
      controller.signal,
      {
        onDelta: (text) => {
          fullRawRef.current += text;
          setFullRaw(fullRawRef.current);
        },
        onDone: () => {
          setStreaming(false);
          finishFullGeneration(fullRawRef.current);
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
            {
              id,
              name: "",
              role: "",
              start: "",
              end: "",
              description: text,
              link: "",
            },
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

  const applyFullAdopt = () => {
    if (!fullDraft) return;

    const title =
      fullDraft.basic.headline.trim() ||
      fullDraft.intent.targetRole.trim() ||
      role.trim() ||
      "AI 生成简历";

    if (!onCreateDocument(fullDraft, title)) {
      setError("新建简历失败：浏览器存储不可用或空间已满");
      return;
    }

    fullRawRef.current = "";
    setFullRaw("");
    setFullDraft(null);
    setFullStats(null);
    setError(null);
    setConfirmOverwrite(false);
    setOpen(false);
  };

  const handleAdopt = () => {
    if (streaming) return;

    if (fullMode) {
      if (!fullDraft) return;
      applyFullAdopt();
      return;
    }

    if (!output.trim()) return;

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
            生成单板块草稿，或用一段个人经历直接生成整份简历。
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
        <Dialog
          title="AI 帮我写"
          description={`${fullMode ? "整份简历" : SECTION_LABELS[section]} · 内容会发送到 DeepSeek`}
          size="md"
          dataQa="ai-writer-dialog"
          closeDataQa="ai-writer-close"
          onClose={closeDialog}
          footer={
            <>
              <p className="text-[11px] leading-4 text-zinc-400">
                {fullMode
                  ? "只发送这段自述、目标岗位与参考 JD，不发送姓名、电话、邮箱或任何已有简历内容。"
                  : `只发送本面板内容、当前板块文本${
                      jd.trim() ? "与参考 JD" : ""
                    }，不发送姓名、电话、邮箱或整份简历。`}
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
                    disabled={
                      streaming || (fullMode ? !fullDraft : !output.trim())
                    }
                  >
                    {fullMode ? "生成新简历" : "采用到简历"}
                  </Button>
                ) : null}
              </div>
            </>
          }
        >
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
                    {SECTIONS.map((item) => {
                      const active = !fullMode && section === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => handleTabChange(item.value)}
                          aria-pressed={active}
                          className={`flex-1 rounded-md px-1.5 py-1.5 text-[11.5px] font-medium transition sm:text-[12px] ${
                            active
                              ? "bg-white text-zinc-900 shadow-sm"
                              : "text-zinc-500 hover:text-zinc-900"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => handleTabChange("full")}
                      aria-pressed={fullMode}
                      className={`flex-1 rounded-md px-1.5 py-1.5 text-[11.5px] font-medium transition sm:text-[12px] ${
                        fullMode
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      整份简历
                    </button>
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

                  {!fullMode &&
                  (section === "experience" || section === "project") ? (
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

                  {fullMode ? (
                    <Field
                      label="个人经历自述"
                      hint={`${brief.length}/4000 · 没提到的字段会留空`}
                    >
                      <TextArea
                        autoFocus
                        data-qa="ai-resume-brief"
                        value={brief}
                        onChange={(event) => setBrief(event.target.value)}
                        maxLength={4000}
                        className="min-h-[140px]"
                        placeholder={
                          "用自己的话写，例如：\n2021 年本科毕业，计算机专业；在 A 公司做前端 3 年，负责中后台系统，用 React/TS，带过 2 人小组；做过数据看板项目；熟悉 Node。"
                        }
                      />
                    </Field>
                  ) : (
                    <Field
                      label="关键词 / 成果"
                      hint={`${keywords.length}/2000${
                        mode === "polish" ? " · 优化模式可只传现有内容" : ""
                      }`}
                    >
                      <TextArea
                        autoFocus
                        data-qa="ai-keywords"
                        value={keywords}
                        onChange={(event) => setKeywords(event.target.value)}
                        maxLength={2000}
                        className="min-h-[96px]"
                        placeholder="一条一行，如：主导中后台重构；首屏性能提升 40%；带过 3 人小组"
                      />
                    </Field>
                  )}

                  <Field
                    label="参考 JD"
                    hint={`${jd.length}/${JD_MAX_LENGTH}${
                      jdFromSaved ? " · 已读取 JD 匹配页" : " · 选填"
                    }`}
                  >
                    <TextArea
                      data-qa="ai-jd"
                      value={jd}
                      onChange={(event) => {
                        setJd(event.target.value);
                        setJdFromSaved(false);
                      }}
                      maxLength={JD_MAX_LENGTH}
                      className="min-h-[72px]"
                      placeholder="选填：粘贴目标岗位 JD，AI 会按 JD 调整表述重点，但不会编造你没写过的经历"
                    />
                  </Field>

                  <div
                    className={
                      fullMode ? "" : "grid gap-3 sm:grid-cols-2"
                    }
                  >
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
                    {fullMode ? null : (
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
                    )}
                  </div>

                  {!fullMode &&
                  (section === "experience" || section === "project") &&
                  targetId !== "new" ? (
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

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        void (fullMode ? handleGenerateFull() : handleGenerate())
                      }
                      disabled={streaming || !canGenerate}
                    >
                      {fullMode
                        ? fullDraft
                          ? "重新生成整份"
                          : "生成整份简历"
                        : output
                          ? "重新生成"
                          : "生成"}
                    </Button>
                    {streaming ? (
                      <Button variant="ghost" size="sm" onClick={handleStop}>
                        停止
                      </Button>
                    ) : null}
                    {status?.model ? (
                      <span className="ml-auto text-[11px] text-zinc-400">
                        {fullMode ? "一次生成，约 10–20 秒" : status.model}
                      </span>
                    ) : null}
                  </div>

                  {fullMode ? (
                    <div data-qa="ai-full-preview" className="space-y-2">
                      {fullDraft ? (
                        <>
                          <FullResumePreview
                            draft={fullDraft}
                            stats={fullStats}
                          />
                          <FactCheckPanel
                            warnings={fullWarnings}
                            sourceLabel="自述"
                          />
                          <p className="text-[10.5px] leading-4 text-zinc-400">
                            采用后会新建一份简历并切换过去，当前简历保留在顶部列表里。
                          </p>
                        </>
                      ) : (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-[13px] leading-6 text-zinc-500">
                          {streaming
                            ? `AI 正在整理整份简历…（已接收 ${fullRaw.length} 字）`
                            : fullRaw
                              ? "生成已停止或返回内容不完整，请重新生成。"
                              : "写一段个人经历后点击生成；没提到的公司、时间、技能会留空。"}
                          {streaming ? (
                            <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-zinc-900 align-middle" />
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : (
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
                  )}

                  {!fullMode && output && !streaming ? (
                    <FactCheckPanel warnings={singleWarnings} />
                  ) : null}

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
        </Dialog>
      ) : null}
    </>
  );
}

function joinMeta(parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" · ");
}

function dateRange(start: string, end: string): string {
  return [start, end].filter(Boolean).join(" – ");
}

function PreviewCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
      <p className="mb-1.5 text-[11px] text-zinc-400">
        {title}
        {empty ? " · 未提及" : ""}
      </p>
      <div className="space-y-1.5 text-[13px] leading-6 text-zinc-800">
        {empty ? <span className="text-zinc-400">待补充</span> : children}
      </div>
    </div>
  );
}

/** 整份生成的只读预览：按简历板块展示，缺失字段明确标为待补充。 */
function FullResumePreview({
  draft,
  stats,
}: {
  draft: Resume;
  stats: FullResumeStats | null;
}) {
  return (
    <div className="space-y-2">
      <PreviewCard title="个人简介" empty={!draft.basic.summary}>
        <p className="whitespace-pre-wrap">{draft.basic.summary}</p>
      </PreviewCard>

      <PreviewCard
        title={`教育经历 · ${draft.educations.length} 条`}
        empty={draft.educations.length === 0}
      >
        {draft.educations.map((item) => (
          <div key={item.id}>
            <p className="font-medium">
              {joinMeta([
                item.school || "学校待补充",
                item.major,
                item.degree,
              ])}
            </p>
            {dateRange(item.start, item.end) ? (
              <p className="text-[11px] text-zinc-400">
                {dateRange(item.start, item.end)}
              </p>
            ) : null}
            {item.gpa || item.ranking ? (
              <p className="text-[12px]">
                {joinMeta([
                  item.gpa && `GPA ${item.gpa}`,
                  item.ranking && `排名 ${item.ranking}`,
                ])}
              </p>
            ) : null}
            {item.courses ? (
              <p className="text-[12px]">主修：{item.courses}</p>
            ) : null}
            {item.honors ? (
              <p className="text-[12px]">荣誉：{item.honors}</p>
            ) : null}
          </div>
        ))}
      </PreviewCard>

      <PreviewCard
        title={`工作经历 · ${draft.experiences.length} 条`}
        empty={draft.experiences.length === 0}
      >
        {draft.experiences.map((item) => (
          <div key={item.id}>
            <p className="font-medium">
              {joinMeta([item.company || "公司待补充", item.role])}
            </p>
            {dateRange(item.start, item.end) ? (
              <p className="text-[11px] text-zinc-400">
                {dateRange(item.start, item.end)}
              </p>
            ) : null}
            {item.description ? (
              <p className="whitespace-pre-wrap">{item.description}</p>
            ) : (
              <p className="text-[12px] text-zinc-400">工作内容待补充</p>
            )}
          </div>
        ))}
      </PreviewCard>

      <PreviewCard
        title={`项目经历 · ${draft.projects.length} 条`}
        empty={draft.projects.length === 0}
      >
        {draft.projects.map((item) => (
          <div key={item.id}>
            <p className="font-medium">
              {joinMeta([item.name || "项目名待补充", item.role])}
            </p>
            {dateRange(item.start, item.end) ? (
              <p className="text-[11px] text-zinc-400">
                {dateRange(item.start, item.end)}
              </p>
            ) : null}
            {item.description ? (
              <p className="whitespace-pre-wrap">{item.description}</p>
            ) : (
              <p className="text-[12px] text-zinc-400">项目内容待补充</p>
            )}
          </div>
        ))}
      </PreviewCard>

      <PreviewCard
        title={`技能 · ${draft.skills.length} 项`}
        empty={draft.skills.length === 0}
      >
        <div className="flex flex-wrap gap-1">
          {draft.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-white px-2 py-0.5 text-[11px] text-zinc-600 ring-1 ring-zinc-200"
            >
              {skill}
            </span>
          ))}
        </div>
      </PreviewCard>

      {stats?.missing.length ? (
        <p className="text-[10.5px] leading-4 text-amber-600">
          自述里没提到、已留空：{stats.missing.join("、")}
          。采用后可在表单里补充。
        </p>
      ) : null}
    </div>
  );
}
