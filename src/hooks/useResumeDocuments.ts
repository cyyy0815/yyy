"use client";

import { useEffect, useState } from "react";
import {
  deriveResumeTitle,
  LIBRARY_KEY,
  loadResumeLibrary,
  parseResumeLibrary,
  saveResumeLibrary,
  uniqueTitle,
  type ResumeLibrary,
  type StoredDocument,
} from "@/lib/documents";
import { saveResume, loadResume } from "@/lib/storage";
import {
  createEmptyResume,
  newId,
  type Resume,
  type TemplateId,
} from "@/lib/types";

type Args = {
  resume: Resume;
  template: TemplateId;
  isSample: boolean;
  /** 本页有未保存修改时，不跟随其他标签页切换当前文档，避免内容写到错误的文档。 */
  hasUnsavedChanges: boolean;
  replaceResume: (resume: Resume) => void;
  setTemplate: (template: TemplateId) => void;
};

export type ResumeDocumentOption = {
  id: string;
  title: string;
};

type LibraryState = {
  library: ResumeLibrary | null;
  activeTitle: string | null;
};

function cloneResume(resume: Resume): Resume {
  if (typeof structuredClone === "function") return structuredClone(resume);
  return JSON.parse(JSON.stringify(resume)) as Resume;
}

/**
 * 管理多份简历：当前文档继续用 v1 保存，其他文档作为快照写入 library。
 * 切换前先同步写入目标文档，并保留当前文档快照，避免防抖窗口内刷新丢数据。
 */
export function useResumeDocuments({
  resume,
  template,
  isSample,
  hasUnsavedChanges,
  replaceResume,
  setTemplate,
}: Args) {
  const [state, setState] = useState<LibraryState>(() => {
    const library = loadResumeLibrary();
    return {
      library,
      activeTitle: library?.activeTitle.trim() || null,
    };
  });

  const others = state.library?.others ?? [];
  const activeId = state.library?.activeId ?? "default";
  const currentTitle =
    state.activeTitle || deriveResumeTitle(resume, isSample) || "我的简历";
  const documents: ResumeDocumentOption[] = [
    { id: activeId, title: currentTitle },
    ...others.map((document) => ({
      id: document.id,
      title: document.title,
    })),
  ];
  const titles = documents.map((document) => document.title);

  const currentDocument = (): StoredDocument => ({
    id: activeId,
    title: currentTitle,
    template,
    resume,
  });

  /**
   * 写入文档列表前先和最新存储合并：另一个标签页新增的文档不会被本次写入覆盖。
   * 如果对方已经切换了当前文档（activeId 不同），本页基于过期身份的操作直接失败。
   */
  const persistLibrary = (
    next: ResumeLibrary,
    options?: { replace?: boolean },
  ): boolean => {
    if (options?.replace) return saveResumeLibrary(next);
    const stored = loadResumeLibrary();
    if (!stored) return saveResumeLibrary(next);
    if (stored.activeId !== activeId) return false;
    const known = new Set(next.others.map((document) => document.id));
    const extras = stored.others.filter(
      (document) => !known.has(document.id) && document.id !== next.activeId,
    );
    return saveResumeLibrary(
      extras.length > 0
        ? { ...next, others: [...next.others, ...extras] }
        : next,
    );
  };

  // 其他标签页改文档列表：新增 / 重命名直接同步；切换当前文档时，
  // 只有本页没有未保存修改才跟随，避免把本地内容写到别的文档槽位。
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LIBRARY_KEY) return;
      const incoming = parseResumeLibrary(event.newValue);
      if (!incoming) return;
      setState((current) => {
        const currentId = current.library?.activeId ?? "default";
        if (incoming.activeId !== currentId && hasUnsavedChanges) {
          return current;
        }
        return {
          library: incoming,
          activeTitle: incoming.activeTitle.trim() || null,
        };
      });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hasUnsavedChanges]);

  const commit = (library: ResumeLibrary): boolean => {
    if (!persistLibrary(library)) return false;
    setState({
      library,
      activeTitle: library.activeTitle.trim() || null,
    });
    return true;
  };

  /**
   * 载入示例时，当前文档的真实内容还留在 v1 里，只是 UI 暂时显示示例。
   * 文档级操作（切换 / 新建 / 复制）会改写 v1，所以动手前先把 v1 里的真实文档
   * 快照出来，否则它会从文档列表里被永久丢弃（载入示例 → 切到另一份即触发）。
   */
  const sampleBackdropDocument = (): StoredDocument | null => {
    if (!isSample) return null;
    const stored = loadResume();
    if (!stored) return null;
    return {
      id: activeId,
      title:
        (state.activeTitle ?? "").trim() ||
        deriveResumeTitle(stored, false) ||
        "我的简历",
      template,
      resume: stored,
    };
  };

  const switchTo = (id: string): boolean => {
    if (id === activeId) return true;
    const target = others.find((document) => document.id === id);
    if (!target) return false;

    const backdrop = sampleBackdropDocument();
    // 先把目标文档同步写入 v1，防止切页后刷新仍读回上一份简历。
    if (!saveResume(target.resume)) return false;
    const nextOthers = isSample
      ? [
          ...(backdrop ? [backdrop] : []),
          ...others.filter((document) => document.id !== target.id),
        ]
      : others.map((document) =>
          document.id === target.id ? currentDocument() : document,
        );
    const library: ResumeLibrary = {
      activeId: target.id,
      activeTitle: target.title,
      others: nextOthers,
    };
    if (!persistLibrary(library)) {
      saveResume(backdrop ? backdrop.resume : resume);
      return false;
    }

    setState({ library, activeTitle: target.title });
    replaceResume(target.resume);
    setTemplate(target.template);
    return true;
  };

  const createBlank = (): boolean => {
    const nextResume = createEmptyResume();
    const backdrop = sampleBackdropDocument();
    if (!saveResume(nextResume)) return false;

    const nextId = newId();
    const title = uniqueTitle("新简历", titles);
    const library: ResumeLibrary = {
      activeId: nextId,
      activeTitle: title,
      others: isSample
        ? [...(backdrop ? [backdrop] : []), ...others]
        : [currentDocument(), ...others],
    };
    if (!persistLibrary(library)) {
      saveResume(backdrop ? backdrop.resume : resume);
      return false;
    }

    setState({ library, activeTitle: title });
    replaceResume(nextResume);
    setTemplate("modern");
    return true;
  };

  const duplicateCurrent = (): boolean => {
    const copy = cloneResume(resume);
    const backdrop = sampleBackdropDocument();
    if (!saveResume(copy)) return false;

    const nextId = newId();
    const title = uniqueTitle(`${currentTitle} 副本`, titles);
    const library: ResumeLibrary = {
      activeId: nextId,
      activeTitle: title,
      others: isSample
        ? [...(backdrop ? [backdrop] : []), ...others]
        : [currentDocument(), ...others],
    };
    if (!persistLibrary(library)) {
      saveResume(backdrop ? backdrop.resume : resume);
      return false;
    }

    setState({ library, activeTitle: title });
    replaceResume(copy);
    setTemplate(template);
    return true;
  };

  /** 用外部生成 / 导入的内容新建一份简历，当前简历作为快照保留；返回新简历标题。 */
  const createFromResume = (
    nextResume: Resume,
    baseTitle: string,
    nextTemplate: TemplateId = template,
  ): string | null => {
    const backdrop = sampleBackdropDocument();
    if (!saveResume(nextResume)) return null;

    const nextId = newId();
    const title = uniqueTitle(baseTitle.trim() || "AI 生成简历", titles);
    const library: ResumeLibrary = {
      activeId: nextId,
      activeTitle: title,
      others: isSample
        ? [...(backdrop ? [backdrop] : []), ...others]
        : [currentDocument(), ...others],
    };
    if (!persistLibrary(library)) {
      saveResume(backdrop ? backdrop.resume : resume);
      return null;
    }

    setState({ library, activeTitle: title });
    replaceResume(nextResume);
    setTemplate(nextTemplate);
    return title;
  };

  /**
   * 合并导入单份简历：追加成新文档，但**不切换**当前文档。
   * 与「合并整库」保持一致——导入是「加一份」，不该把用户正在写的那份切走。
   */
  const appendDocument = (
    nextResume: Resume,
    baseTitle: string,
    nextTemplate: TemplateId = template,
  ): string | null => {
    const title = uniqueTitle(baseTitle.trim() || "导入简历", titles);
    const library: ResumeLibrary = {
      activeId,
      activeTitle: currentTitle,
      others: [
        ...others,
        { id: newId(), title, template: nextTemplate, resume: nextResume },
      ],
    };
    if (!persistLibrary(library)) return null;
    setState({ library, activeTitle: currentTitle });
    return title;
  };

  /** 合并导入：保留当前简历与已有文档，把备份中的简历追加为副本。 */
  const mergeLibrary = (imported: StoredDocument[]): boolean => {
    if (imported.length === 0) return false;
    const usedTitles = [...titles];
    const remapped = imported.map((document) => {
      const title = uniqueTitle(document.title, usedTitles);
      usedTitles.push(title);
      return { ...document, id: newId(), title };
    });
    // 当前文档仍是 active，不该再写进 others，否则标题会重复出现。
    const library: ResumeLibrary = {
      activeId,
      activeTitle: currentTitle,
      others: [...others, ...remapped],
    };
    if (!persistLibrary(library)) return false;
    setState({ library, activeTitle: currentTitle });
    return true;
  };

  /** 当前文档 + 其他快照，用于整库导出。 */
  const collectAll = (): {
    activeId: string;
    documents: StoredDocument[];
  } => ({
    activeId,
    documents: [currentDocument(), ...others],
  });

  /** 用备份文件替换全部简历；当前文档仍写入 v1。 */
  const importLibrary = (
    imported: StoredDocument[],
    nextActiveId: string,
  ): boolean => {
    if (imported.length === 0) return false;
    const usedTitles: string[] = [];
    const remapped = imported.map((document) => {
      const title = uniqueTitle(document.title, usedTitles);
      usedTitles.push(title);
      return { ...document, id: newId(), title };
    });
    const target =
      remapped.find((_, index) => imported[index].id === nextActiveId) ??
      remapped[0];
    // 失败回滚时 v1 已被目标文档覆盖，先留一份原来的内容。
    const previousStored = loadResume();
    if (!saveResume(target.resume)) return false;

    const library: ResumeLibrary = {
      activeId: target.id,
      activeTitle: target.title,
      others: remapped.filter((document) => document.id !== target.id),
    };
    if (!persistLibrary(library, { replace: true })) {
      saveResume(previousStored ?? resume);
      return false;
    }

    setState({ library, activeTitle: target.title });
    replaceResume(target.resume);
    setTemplate(target.template);
    return true;
  };

  const deleteActive = (): boolean => {
    if (others.length === 0) return false;
    const [next, ...rest] = others;
    const previousStored = loadResume();
    if (!saveResume(next.resume)) return false;

    const library: ResumeLibrary = {
      activeId: next.id,
      activeTitle: next.title,
      others: rest,
    };
    if (!persistLibrary(library)) {
      saveResume(previousStored ?? resume);
      return false;
    }

    setState({ library, activeTitle: next.title });
    replaceResume(next.resume);
    setTemplate(next.template);
    return true;
  };

  const renameActive = (title: string): boolean => {
    const normalized = title.trim().slice(0, 60);
    if (!normalized) return false;
    return commit({
      activeId,
      activeTitle: normalized,
      others,
    });
  };

  return {
    documents,
    activeId,
    currentTitle,
    canDelete: others.length > 0,
    switchTo,
    createBlank,
    createFromResume,
    appendDocument,
    duplicateCurrent,
    deleteActive,
    renameActive,
    collectAll,
    importLibrary,
    mergeLibrary,
  };
}
