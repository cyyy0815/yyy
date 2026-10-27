"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createSampleResume } from "@/lib/defaultResume";
import {
  clearResume,
  loadResume,
  readLastSavedAt,
  readStoredResumeRaw,
  saveResume,
  STORAGE_KEY,
} from "@/lib/storage";
import { createEmptyResume, type Resume } from "@/lib/types";

export type SaveState = "saved" | "saving" | "error" | "conflict";

export type UseResume = {
  resume: Resume;
  updateResume: Dispatch<SetStateAction<Resume>>;
  isSample: boolean;
  saveState: SaveState;
  /** 最近一次成功写入本机的时间戳；示例数据为 null。 */
  lastSavedAt: number | null;
  /** 另一个标签页改过 storage，本页暂停写入，等用户选择保留哪一份。 */
  hasConflict: boolean;
  keepLocalVersion: () => boolean;
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
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(readLastSavedAt);
  const [hasConflict, setHasConflict] = useState(false);

  // 本页最后一次读到 / 写入的原始 JSON。保存前与实际 storage 比对，
  // 若被其他标签页改过就不写，避免后保存的整份覆盖前一份。
  const [initialStored] = useState(readStoredResumeRaw);
  const lastWrittenRef = useRef<string | null>(initialStored);
  const resumeJsonRef = useRef(JSON.stringify(initial.resume));
  useEffect(() => {
    resumeJsonRef.current = JSON.stringify(resume);
  }, [resume]);

  // 示例数据不落盘：用户真正开始编辑后才保存，避免下次访问被当成他自己的简历
  useEffect(() => {
    if (isSample || hasConflict) return;
    const timer = window.setTimeout(() => {
      const stored = readStoredResumeRaw();
      const next = JSON.stringify(resume);
      if (stored !== lastWrittenRef.current && stored !== next) {
        setHasConflict(true);
        setSaveState("conflict");
        return;
      }
      if (saveResume(resume)) {
        lastWrittenRef.current = next;
        setLastSavedAt(Date.now());
        setSaveState("saved");
      } else {
        setSaveState("error");
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [resume, isSample, hasConflict]);

  // storage 事件只在其他标签页写入时触发；本页写入不会触发自己。
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (event.newValue === lastWrittenRef.current) return;
      // 其他标签页写入的内容恰好与本页一致，不算冲突，只更新基线。
      if (event.newValue === resumeJsonRef.current) {
        lastWrittenRef.current = event.newValue;
        return;
      }
      setHasConflict(true);
      setSaveState("conflict");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateResume: Dispatch<SetStateAction<Resume>> = useCallback(
    (action) => {
      setIsSample(false);
      // 冲突期间保存被暂停，不要让状态又回到「保存中」。
      setSaveState(hasConflict ? "conflict" : "saving");
      setResume(action);
    },
    [hasConflict],
  );

  const clearAll = useCallback(() => {
    clearResume();
    lastWrittenRef.current = readStoredResumeRaw();
    setResume(createEmptyResume());
    setIsSample(false);
    setSaveState("saved");
    setLastSavedAt(null);
    setHasConflict(false);
  }, []);

  const loadSample = useCallback(() => {
    setResume(createSampleResume());
    setIsSample(true);
    setSaveState("saved");
    setLastSavedAt(null);
    setHasConflict(false);
  }, []);

  const replaceResume = useCallback((next: Resume) => {
    // 多份简历切换 / 导入会先写 storage 或即将写入；以当前 storage 为新基线，
    // 这样随后由本 hook 触发的自动保存不会被误判成跨标签页冲突。
    lastWrittenRef.current = readStoredResumeRaw();
    setResume(next);
    setIsSample(false);
    setSaveState("saving");
    setLastSavedAt(readLastSavedAt());
    setHasConflict(false);
  }, []);

  const keepLocalVersion = useCallback(() => {
    if (!saveResume(resume)) {
      setSaveState("error");
      return false;
    }
    lastWrittenRef.current = JSON.stringify(resume);
    setLastSavedAt(Date.now());
    setHasConflict(false);
    setSaveState("saved");
    return true;
  }, [resume]);

  return {
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
  };
}
