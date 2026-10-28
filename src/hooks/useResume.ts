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
import { createHistory, type History } from "@/lib/history";
import {
  clearResumeHistory,
  loadResumeHistory,
  saveResumeHistory,
} from "@/lib/historyStorage";
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
  /** 撤销 / 重做简历内容；切换或导入简历会清空历史。 */
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

type HistorySnapshot = {
  resume: Resume;
  isSample: boolean;
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

  // 事件处理里需要同步读取最新值，state 在同一个事件中不会立即更新。
  const resumeRef = useRef(resume);
  const isSampleRef = useRef(isSample);
  useEffect(() => {
    resumeRef.current = resume;
  }, [resume]);
  useEffect(() => {
    isSampleRef.current = isSample;
  }, [isSample]);

  // 撤销栈保存简历快照（按引用），切换 / 导入简历时整体清空。
  // 刷新后从 sessionStorage 恢复；示例简历不读取，避免套用别的文档的历史。
  const [history] = useState<History<HistorySnapshot>>(() => {
    const created = createHistory<HistorySnapshot>();
    if (initial.isSample) {
      clearResumeHistory();
    } else {
      const persisted = loadResumeHistory();
      if (persisted) created.importState(persisted);
    }
    return created;
  });
  // 撤销栈本身不是渲染数据，只把按钮需要的两个布尔值同步到 state。
  const [historyFlags, setHistoryFlags] = useState(() => ({
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
  }));
  const syncHistoryFlags = useCallback(() => {
    setHistoryFlags((previous) => {
      const next = {
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      };
      return previous.canUndo === next.canUndo &&
        previous.canRedo === next.canRedo
        ? previous
        : next;
    });
  }, [history]);

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
        // 只持久化与已保存内容对应的历史，避免刷新后撤销到未落盘的状态。
        saveResumeHistory(history.exportState());
      } else {
        setSaveState("error");
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [resume, isSample, hasConflict, history]);

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
      const previous = resumeRef.current;
      const next =
        typeof action === "function"
          ? (action as (current: Resume) => Resume)(previous)
          : action;
      if (Object.is(next, previous)) return;

      const previousIsSample = isSampleRef.current;
      // 连续输入合并为一步；结构性修改由 700ms 空闲自然分段。
      history.record(
        { resume: previous, isSample: previousIsSample },
        true,
      );
      syncHistoryFlags();

      resumeRef.current = next;
      isSampleRef.current = false;
      setIsSample(false);
      // 冲突期间保存被暂停，不要让状态又回到「保存中」。
      setSaveState(hasConflict ? "conflict" : "saving");
      setResume(next);
    },
    [hasConflict, history, syncHistoryFlags],
  );

  const clearAll = useCallback(() => {
    history.record(
      { resume: resumeRef.current, isSample: isSampleRef.current },
      false,
    );
    syncHistoryFlags();
    clearResume();
    const empty = createEmptyResume();
    resumeRef.current = empty;
    isSampleRef.current = false;
    lastWrittenRef.current = readStoredResumeRaw();
    setResume(empty);
    setIsSample(false);
    setSaveState("saved");
    setLastSavedAt(null);
    setHasConflict(false);
  }, [history, syncHistoryFlags]);

  const loadSample = useCallback(() => {
    history.record(
      { resume: resumeRef.current, isSample: isSampleRef.current },
      false,
    );
    syncHistoryFlags();
    const sample = createSampleResume();
    resumeRef.current = sample;
    isSampleRef.current = true;
    setResume(sample);
    setIsSample(true);
    setSaveState("saved");
    setLastSavedAt(null);
    setHasConflict(false);
  }, [history, syncHistoryFlags]);

  const replaceResume = useCallback(
    (next: Resume) => {
      // 切换 / 导入简历是文档级操作，不进入当前文档的撤销栈。
      history.reset();
      clearResumeHistory();
      syncHistoryFlags();
      // 多份简历切换 / 导入会先写 storage 或即将写入；以当前 storage 为新基线，
      // 这样随后由本 hook 触发的自动保存不会被误判成跨标签页冲突。
      lastWrittenRef.current = readStoredResumeRaw();
      resumeRef.current = next;
      isSampleRef.current = false;
      setResume(next);
      setIsSample(false);
      setSaveState("saving");
      setLastSavedAt(readLastSavedAt());
      setHasConflict(false);
    },
    [history, syncHistoryFlags],
  );

  const applySnapshot = useCallback(
    (snapshot: HistorySnapshot) => {
      resumeRef.current = snapshot.resume;
      isSampleRef.current = snapshot.isSample;
      setResume(snapshot.resume);
      setIsSample(snapshot.isSample);
      setSaveState(
        hasConflict ? "conflict" : snapshot.isSample ? "saved" : "saving",
      );
    },
    [hasConflict],
  );

  const undo = useCallback(() => {
    const previous = history.undo({
      resume: resumeRef.current,
      isSample: isSampleRef.current,
    });
    if (previous) applySnapshot(previous);
    syncHistoryFlags();
  }, [applySnapshot, history, syncHistoryFlags]);

  const redo = useCallback(() => {
    const next = history.redo({
      resume: resumeRef.current,
      isSample: isSampleRef.current,
    });
    if (next) applySnapshot(next);
    syncHistoryFlags();
  }, [applySnapshot, history, syncHistoryFlags]);

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
    undo,
    redo,
    canUndo: historyFlags.canUndo,
    canRedo: historyFlags.canRedo,
  };
}
