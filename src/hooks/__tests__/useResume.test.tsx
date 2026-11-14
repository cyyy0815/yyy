import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useResume } from "../useResume";
import {
  HISTORY_STORAGE_FORMAT,
  HISTORY_STORAGE_KEY,
  HISTORY_STORAGE_VERSION,
  parseResumeHistory,
} from "@/lib/historyStorage";
import { loadResume, saveResume } from "@/lib/storage";
import { RESUME_SCHEMA_VERSION } from "@/lib/schema";
import { createEmptyResume } from "@/lib/types";

function makeResume(name: string) {
  const resume = createEmptyResume();
  resume.basic.name = name;
  return resume;
}

describe("useResume 保存时序", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("pagehide 立即落盘，不依赖 400ms 防抖", () => {
    saveResume(makeResume("林一"));
    const { result } = renderHook(() => useResume());
    expect(result.current.isSample).toBe(false);

    act(() => {
      result.current.updateResume((previous) => ({
        ...previous,
        basic: { ...previous.basic, name: "林一改" },
      }));
    });
    // 防抖窗口内还没写盘。
    expect(loadResume()?.basic.name).toBe("林一");

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(loadResume()?.basic.name).toBe("林一改");
  });

  it("replaceResume 立即写盘，导入后马上刷新也不会回到旧简历", () => {
    saveResume(makeResume("旧简历"));
    const { result } = renderHook(() => useResume());

    act(() => {
      result.current.replaceResume(makeResume("导入的简历"));
    });
    expect(loadResume()?.basic.name).toBe("导入的简历");
  });

  it("clearAll 立即写入空简历，刷新不会退回示例", () => {
    saveResume(makeResume("清空前"));
    const { result } = renderHook(() => useResume());

    act(() => {
      result.current.clearAll();
    });
    expect(loadResume()).not.toBeNull();
    expect(loadResume()?.basic.name).toBe("");
  });

  it("示例快照不会写进会话历史，刷新后撤销不会退回示例", () => {
    saveResume(makeResume("真实简历"));
    const { result } = renderHook(() => useResume());

    act(() => {
      result.current.loadSample();
    });
    act(() => {
      result.current.updateResume((previous) => ({
        ...previous,
        basic: { ...previous.basic, name: "示例改" },
      }));
    });
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });

    const stored = parseResumeHistory(
      window.sessionStorage.getItem(HISTORY_STORAGE_KEY),
    );
    const all = [...(stored?.past ?? []), ...(stored?.future ?? [])];
    expect(all.every((snapshot) => !snapshot.isSample)).toBe(true);
  });

  it("示例数据不会因为 pagehide 被写进本机", () => {
    const { result } = renderHook(() => useResume());
    expect(result.current.isSample).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(loadResume()).toBeNull();
  });

  it("恢复旧会话时忽略示例快照", () => {
    saveResume(makeResume("真实简历"));
    window.sessionStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify({
        format: HISTORY_STORAGE_FORMAT,
        version: HISTORY_STORAGE_VERSION,
        schemaVersion: RESUME_SCHEMA_VERSION,
        savedAt: Date.now(),
        past: [
          { resume: makeResume("更早的简历"), isSample: false },
          { resume: makeResume("示例"), isSample: true },
        ],
        future: [],
      }),
    );

    const { result } = renderHook(() => useResume());
    act(() => {
      result.current.undo();
    });
    expect(result.current.resume.basic.name).toBe("更早的简历");
    expect(result.current.isSample).toBe(false);
  });
});
