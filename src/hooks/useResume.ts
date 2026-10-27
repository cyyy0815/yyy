"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { createSampleResume } from "@/lib/defaultResume";
import { clearResume, loadResume, saveResume } from "@/lib/storage";
import { createEmptyResume, type Resume } from "@/lib/types";

export type SaveState = "saved" | "saving";

export type UseResume = {
  resume: Resume;
  updateResume: Dispatch<SetStateAction<Resume>>;
  isSample: boolean;
  saveState: SaveState;
  clearAll: () => void;
  loadSample: () => void;
  replaceResume: (resume: Resume) => void;
};

function loadInitial(): { resume: Resume; isSample: boolean } {
  const stored = loadResume();
  if (stored) return { resume: stored, isSample: false };
  return { resume: createSampleResume(), isSample: true };
}

/**
 * 该 hook 只应在客户端挂载后使用（AppShell 用 useSyncExternalStore 做了门控），
 * 因此可以在 useState 初始化时安全读取 localStorage，不需要在 effect 里补数据。
 */
export function useResume(): UseResume {
  const [initial] = useState(loadInitial);
  const [resume, setResume] = useState<Resume>(initial.resume);
  const [isSample, setIsSample] = useState(initial.isSample);
  const [saveState, setSaveState] = useState<SaveState>("saved");

  // 示例数据不落盘：用户真正开始编辑后才保存，避免下次访问被当成他自己的简历
  useEffect(() => {
    if (isSample) return;
    const timer = window.setTimeout(() => {
      saveResume(resume);
      setSaveState("saved");
    }, 400);
    return () => window.clearTimeout(timer);
  }, [resume, isSample]);

  const updateResume: Dispatch<SetStateAction<Resume>> = useCallback((action) => {
    setIsSample(false);
    setSaveState("saving");
    setResume(action);
  }, []);

  const clearAll = useCallback(() => {
    clearResume();
    setResume(createEmptyResume());
    setIsSample(false);
    setSaveState("saved");
  }, []);

  const loadSample = useCallback(() => {
    setResume(createSampleResume());
    setIsSample(true);
    setSaveState("saved");
  }, []);

  const replaceResume = useCallback((next: Resume) => {
    setResume(next);
    setIsSample(false);
    setSaveState("saving");
  }, []);

  return {
    resume,
    updateResume,
    isSample,
    saveState,
    clearAll,
    loadSample,
    replaceResume,
  };
}
