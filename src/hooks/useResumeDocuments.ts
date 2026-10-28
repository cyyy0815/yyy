"use client";

import { useState } from "react";
import {
  deriveResumeTitle,
  loadResumeLibrary,
  saveResumeLibrary,
  uniqueTitle,
  type ResumeLibrary,
  type StoredDocument,
} from "@/lib/documents";
import { saveResume } from "@/lib/storage";
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

  const commit = (library: ResumeLibrary): boolean => {
    if (!saveResumeLibrary(library)) return false;
    setState({
      library,
      activeTitle: library.activeTitle.trim() || null,
    });
    return true;
  };

  const switchTo = (id: string): boolean => {
    if (id === activeId) return true;
    const target = others.find((document) => document.id === id);
    if (!target) return false;

    // 先把目标文档同步写入 v1，防止切页后刷新仍读回上一份简历。
    if (!saveResume(target.resume)) return false;
    const nextOthers = isSample
      ? others.filter((document) => document.id !== target.id)
      : others.map((document) =>
          document.id === target.id ? currentDocument() : document,
        );
    const library: ResumeLibrary = {
      activeId: target.id,
      activeTitle: target.title,
      others: nextOthers,
    };
    if (!saveResumeLibrary(library)) {
      saveResume(resume);
      return false;
    }

    setState({ library, activeTitle: target.title });
    replaceResume(target.resume);
    setTemplate(target.template);
    return true;
  };

  const createBlank = (): boolean => {
    const nextResume = createEmptyResume();
    if (!saveResume(nextResume)) return false;

    const nextId = newId();
    const title = uniqueTitle("新简历", titles);
    const library: ResumeLibrary = {
      activeId: nextId,
      activeTitle: title,
      others: isSample ? others : [currentDocument(), ...others],
    };
    if (!saveResumeLibrary(library)) {
      saveResume(resume);
      return false;
    }

    setState({ library, activeTitle: title });
    replaceResume(nextResume);
    setTemplate("modern");
    return true;
  };

  const duplicateCurrent = (): boolean => {
    const copy = cloneResume(resume);
    if (!saveResume(copy)) return false;

    const nextId = newId();
    const title = uniqueTitle(`${currentTitle} 副本`, titles);
    const library: ResumeLibrary = {
      activeId: nextId,
      activeTitle: title,
      others: isSample ? others : [currentDocument(), ...others],
    };
    if (!saveResumeLibrary(library)) {
      saveResume(resume);
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
    if (!saveResume(nextResume)) return null;

    const nextId = newId();
    const title = uniqueTitle(baseTitle.trim() || "AI 生成简历", titles);
    const library: ResumeLibrary = {
      activeId: nextId,
      activeTitle: title,
      others: isSample ? others : [currentDocument(), ...others],
    };
    if (!saveResumeLibrary(library)) {
      saveResume(resume);
      return null;
    }

    setState({ library, activeTitle: title });
    replaceResume(nextResume);
    setTemplate(nextTemplate);
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
    if (!saveResumeLibrary(library)) return false;
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
    if (!saveResume(target.resume)) return false;

    const library: ResumeLibrary = {
      activeId: target.id,
      activeTitle: target.title,
      others: remapped.filter((document) => document.id !== target.id),
    };
    if (!saveResumeLibrary(library)) {
      saveResume(resume);
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
    if (!saveResume(next.resume)) return false;

    const library: ResumeLibrary = {
      activeId: next.id,
      activeTitle: next.title,
      others: rest,
    };
    if (!saveResumeLibrary(library)) {
      saveResume(resume);
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
    duplicateCurrent,
    deleteActive,
    renameActive,
    collectAll,
    importLibrary,
    mergeLibrary,
  };
}
