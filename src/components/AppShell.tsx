"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { JobsPanel } from "@/components/jobs/JobsPanel";
import { ResumeDocumentsBar } from "@/components/resume/ResumeDocumentsBar";
import { ResumeForm } from "@/components/resume/ResumeForm";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { ThemePicker } from "@/components/resume/ThemePicker";
import { Button } from "@/components/ui/Button";
import { useResume } from "@/hooks/useResume";
import { useResumeDocuments } from "@/hooks/useResumeDocuments";
import { downloadResumeJSON, parseResumeJSON } from "@/lib/storage";
import { isTemplateId, type Resume, type TemplateId } from "@/lib/types";

const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: "modern", label: "现代" },
  { id: "classic", label: "经典" },
  { id: "compact", label: "紧凑" },
  { id: "sidebar", label: "侧栏" },
  { id: "timeline", label: "时间轴" },
];

const TEMPLATE_KEY = "resume-workshop:template";

type Tab = "edit" | "jobs";
type MobilePane = "form" | "preview";
type Notice = { type: "ok" | "error"; message: string } | null;

const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function readTemplate(): TemplateId {
  try {
    const saved = window.localStorage.getItem(TEMPLATE_KEY);
    if (isTemplateId(saved)) return saved;
  } catch {
    // ignore
  }
  return "modern";
}

function formatClock(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(timestamp);
  } catch {
    return new Date(timestamp).toTimeString().slice(0, 5);
  }
}

function hasResumeContent(resume: Resume): boolean {
  return Boolean(
    resume.basic.name ||
      resume.basic.headline ||
      resume.basic.email ||
      resume.basic.phone ||
      resume.basic.summary ||
      resume.intent.targetRole ||
      resume.experiences.length ||
      resume.projects.length ||
      resume.educations.length ||
      resume.customSections.length ||
      resume.skills.length,
  );
}

/** 只在客户端挂载后渲染工作区，避免 SSR 与 localStorage 数据不一致。 */
export function AppShell() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[13px] text-zinc-400">
        正在载入…
      </div>
    );
  }

  return <ResumeWorkspace />;
}

function ResumeWorkspace() {
  const {
    resume,
    updateResume,
    isSample,
    saveState,
    lastSavedAt,
    hasConflict,
    keepLocalVersion,
    clearAll,
    loadSample,
    replaceResume,
  } = useResume();

  const [tab, setTab] = useState<Tab>(() =>
    window.location.hash === "#jobs" ? "jobs" : "edit",
  );
  const [template, setTemplate] = useState<TemplateId>(readTemplate);
  const [mobilePane, setMobilePane] = useState<MobilePane>("form");
  const [notice, setNotice] = useState<Notice>(null);
  const [resumeVersion, setResumeVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documents = useResumeDocuments({
    resume,
    template,
    isSample,
    replaceResume,
    setTemplate,
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(TEMPLATE_KEY, template);
    } catch {
      // ignore
    }
  }, [template]);

  useEffect(() => {
    const nextHash = tab === "jobs" ? "#jobs" : "";
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
    try {
      window.history.replaceState(null, "", nextUrl);
    } catch {
      // ignore
    }
  }, [tab]);

  useEffect(() => {
    const onHashChange = () => {
      setTab(window.location.hash === "#jobs" ? "jobs" : "edit");
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleImport = async (file: File) => {
    const text = await file.text();
    const result = parseResumeJSON(text);
    if (!result.ok) {
      setNotice({ type: "error", message: result.error });
      return;
    }
    if (
      !isSample &&
      hasResumeContent(resume) &&
      !window.confirm(
        "导入会覆盖当前简历，建议先导出 JSON 备份。确定继续导入吗？",
      )
    ) {
      setNotice({ type: "ok", message: "已取消导入" });
      return;
    }
    replaceResume(result.resume);
    if (result.template) setTemplate(result.template);
    setResumeVersion((value) => value + 1);
    setNotice({ type: "ok", message: "简历已导入" });
  };

  const handleAccent = (accent: string) => {
    updateResume((prev) => ({ ...prev, theme: { accent } }));
  };

  const handleConflictReload = () => {
    if (
      !window.confirm(
        "重新载入会丢弃本页尚未保存的修改，并显示另一个标签页的最新版本。确定吗？",
      )
    ) {
      return;
    }
    window.location.reload();
  };

  const handleConflictKeepLocal = () => {
    if (
      !window.confirm(
        "将用本页内容覆盖另一个标签页的修改，确定吗？",
      )
    ) {
      return;
    }
    if (keepLocalVersion()) {
      setNotice({ type: "ok", message: "已保存本页版本" });
      return;
    }
    setNotice({
      type: "error",
      message: "保存失败：浏览器存储不可用或空间已满",
    });
  };

  const handleSwitchDocument = (id: string) => {
    if (documents.switchTo(id)) {
      setResumeVersion((value) => value + 1);
      return;
    }
    setNotice({
      type: "error",
      message: "切换失败：浏览器存储不可用或空间已满",
    });
  };

  const handleCreateDocument = () => {
    if (documents.createBlank()) {
      setResumeVersion((value) => value + 1);
      setNotice({ type: "ok", message: "已新建空白简历" });
      return;
    }
    setNotice({
      type: "error",
      message: "新建失败：浏览器存储不可用或空间已满",
    });
  };

  const handleDuplicateDocument = () => {
    if (documents.duplicateCurrent()) {
      setResumeVersion((value) => value + 1);
      setNotice({ type: "ok", message: "已复制当前简历" });
      return;
    }
    setNotice({
      type: "error",
      message: "复制失败：浏览器存储不可用或空间已满",
    });
  };

  const handleRenameDocument = () => {
    const title = window.prompt("重命名简历", documents.currentTitle);
    if (title === null) return;
    if (!title.trim()) {
      setNotice({ type: "error", message: "简历名称不能为空" });
      return;
    }
    if (documents.renameActive(title)) {
      setNotice({ type: "ok", message: "简历已重命名" });
      return;
    }
    setNotice({
      type: "error",
      message: "重命名失败：浏览器存储不可用或空间已满",
    });
  };

  const handleDeleteDocument = () => {
    if (!documents.canDelete) return;
    if (
      !window.confirm(
        `确定删除当前简历「${documents.currentTitle}」吗？此操作不可撤销，建议先导出 JSON 备份。`,
      )
    ) {
      return;
    }
    if (documents.deleteActive()) {
      setResumeVersion((value) => value + 1);
      setNotice({ type: "ok", message: "已删除当前简历" });
      return;
    }
    setNotice({
      type: "error",
      message: "删除失败：浏览器存储不可用或空间已满",
    });
  };

  const handlePrint = () => {
    setTab("edit");
    setMobilePane("preview");

    const previousTitle = document.title;
    const name = resume.basic.name.trim();
    const headline = resume.basic.headline.trim();
    const rawTitle =
      name && headline
        ? `${name}-${headline}`
        : name || headline || "我的简历";
    const printTitle =
      rawTitle
        .replace(/[\\/:*?"<>|]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80) || "我的简历";

    let restored = false;
    const restoreTitle = () => {
      if (restored) return;
      restored = true;
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    // Chrome 用 document.title 作为「另存为 PDF」的默认文件名
    document.title = printTitle;
    window.addEventListener("afterprint", restoreTitle);

    window.setTimeout(() => {
      window.print();
      // 取消打印或浏览器不触发 afterprint 时兜底恢复
      window.setTimeout(restoreTitle, 1000);
    }, 100);
  };

  const handleClear = () => {
    if (window.confirm("确定清空简历吗？此操作不可撤销，建议先导出 JSON 备份。")) {
      clearAll();
      setResumeVersion((value) => value + 1);
      setNotice({ type: "ok", message: "已清空，可以开始写新简历" });
    }
  };

  const handleLoadSample = () => {
    if (
      !isSample &&
      hasResumeContent(resume) &&
      !window.confirm(
        "载入示例会覆盖当前简历，建议先导出 JSON 备份。确定继续吗？",
      )
    ) {
      return;
    }
    loadSample();
    setResumeVersion((value) => value + 1);
    setNotice({ type: "ok", message: "已载入示例简历" });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="print-hide sticky top-0 z-30 border-b border-zinc-200/70 bg-[#faf9f7]/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setTab("edit")}
            className="flex shrink-0 items-center gap-2.5 text-left"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 font-serif text-[15px] text-white">
              简
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-[14px] font-semibold tracking-tight text-zinc-900">
                简历工坊
              </span>
              <span className="block text-[9.5px] tracking-[0.16em] text-zinc-400">
                RESUME WORKSHOP
              </span>
            </span>
          </button>

          <nav
            className="flex shrink-0 items-center rounded-full border border-zinc-200 bg-white p-0.5"
            aria-label="主功能"
          >
            <button
              type="button"
              onClick={() => setTab("edit")}
              aria-current={tab === "edit" ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12px] font-medium transition sm:px-4 sm:text-[12.5px] ${
                tab === "edit"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <span className="sm:hidden">编辑</span>
              <span className="hidden sm:inline">编辑简历</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("jobs")}
              aria-current={tab === "jobs" ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12px] font-medium transition sm:px-4 sm:text-[12.5px] ${
                tab === "jobs"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <span className="sm:hidden">推荐</span>
              <span className="hidden sm:inline">职位推荐</span>
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImport(file);
                event.target.value = "";
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              aria-label="导入 JSON 简历"
            >
              导入
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadResumeJSON(resume, template)}
            >
              导出
            </Button>
            <Button variant="primary" size="sm" onClick={handlePrint}>
              打印
              <span className="hidden sm:inline"> / PDF</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="print-root mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 lg:px-6">
        {tab === "edit" ? (
          <>
            <div className="print-hide mb-4 flex rounded-xl border border-zinc-200 bg-white p-1 lg:hidden">
              <button
                type="button"
                onClick={() => setMobilePane("form")}
                className={`flex-1 rounded-lg py-2 text-[12.5px] font-medium transition ${
                  mobilePane === "form"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500"
                }`}
              >
                编辑
              </button>
              <button
                type="button"
                onClick={() => setMobilePane("preview")}
                className={`flex-1 rounded-lg py-2 text-[12.5px] font-medium transition ${
                  mobilePane === "preview"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500"
                }`}
              >
                预览
              </button>
            </div>

            <ResumeDocumentsBar
              documents={documents.documents}
              activeId={documents.activeId}
              canDelete={documents.canDelete}
              onSwitch={handleSwitchDocument}
              onCreate={handleCreateDocument}
              onDuplicate={handleDuplicateDocument}
              onRename={handleRenameDocument}
              onDelete={handleDeleteDocument}
            />

            {isSample ? (
              <div className="print-hide mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-4 py-3">
                <p className="text-[12.5px] text-amber-900">
                  当前展示的是示例简历，直接在左侧修改，就会变成你自己的内容。
                </p>
                <Button variant="outline" size="sm" onClick={handleClear}>
                  清空，开始写我的
                </Button>
              </div>
            ) : null}

            {saveState === "error" && !isSample ? (
              <div
                role="alert"
                className="print-hide mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
              >
                <p className="text-[12.5px] text-red-900">
                  保存失败：浏览器存储不可用或空间已满。请立即导出 JSON
                  备份，避免内容丢失。
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadResumeJSON(resume, template)}
                >
                  导出 JSON
                </Button>
              </div>
            ) : null}

            {hasConflict ? (
              <div
                role="alert"
                data-qa="storage-conflict"
                className="print-hide mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <p className="text-[12.5px] leading-6 text-amber-900">
                  另一个标签页修改了这份简历。为避免互相覆盖，本页已暂停保存。
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConflictReload}
                  >
                    重新载入最新版本
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConflictKeepLocal}
                  >
                    保留我的版本
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="resume-grid grid gap-6 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
              <div
                className={`print-hide ${
                  mobilePane === "form" ? "block" : "hidden"
                } lg:block`}
              >
                <ResumeForm
                  key={resumeVersion}
                  resume={resume}
                  onChange={updateResume}
                />
                <p className="mt-4 flex items-center gap-1.5 px-1 text-[11px] text-zinc-400">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSample
                        ? "bg-amber-400"
                        : saveState === "conflict"
                          ? "bg-orange-500"
                          : saveState === "saved"
                            ? "bg-emerald-500"
                            : saveState === "error"
                              ? "bg-red-500"
                              : "animate-pulse bg-amber-400"
                    }`}
                  />
                  {isSample
                    ? "示例数据不会保存，编辑后自动转为你自己的简历"
                    : saveState === "conflict"
                      ? "另一个标签页已修改，本页保存已暂停"
                      : saveState === "saved"
                        ? lastSavedAt
                          ? `已自动保存到本机浏览器 · 最后保存于 ${formatClock(lastSavedAt)}`
                          : "已自动保存到本机浏览器"
                        : saveState === "error"
                          ? "保存失败，请导出 JSON 备份"
                          : "保存中…"}
                </p>
              </div>

              <div
                className={`print:block ${
                  mobilePane === "preview" ? "block" : "hidden"
                } lg:block`}
              >
                <div className="print-hide mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-0.5">
                      {TEMPLATES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTemplate(item.id)}
                          aria-pressed={template === item.id}
                          className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium transition sm:px-3 ${
                            template === item.id
                              ? "bg-zinc-100 text-zinc-900"
                              : "text-zinc-500 hover:text-zinc-900"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <ThemePicker
                      accent={resume.theme.accent}
                      onChange={handleAccent}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadSample}
                    >
                      载入示例
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleClear}>
                      清空
                    </Button>
                  </div>
                </div>

                <div className="resume-scroll rounded-2xl border border-zinc-200/80 bg-[#eceae7] p-4 lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-112px)] lg:overflow-auto">
                  <ResumePreview resume={resume} template={template} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <JobsPanel resume={resume} onGoEdit={() => setTab("edit")} />
        )}
      </main>

      <footer className="print-hide mx-auto w-full max-w-[1500px] px-4 pb-8 text-[11px] text-zinc-400 lg:px-6">
        数据仅保存在本机浏览器 · 导出 JSON 可备份或迁移 · 求职推荐基于本地岗位画像
      </footer>

      {notice ? (
        <div
          role="status"
          className={`print-hide fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-[12px] text-white shadow-lg ${
            notice.type === "error" ? "bg-red-600" : "bg-zinc-900"
          }`}
        >
          {notice.message}
        </div>
      ) : null}
    </div>
  );
}
