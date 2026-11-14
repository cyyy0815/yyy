import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useResumeDocuments } from "../useResumeDocuments";
import { LIBRARY_KEY, type ResumeLibrary } from "@/lib/documents";
import { loadResume, saveResume } from "@/lib/storage";
import { createEmptyResume } from "@/lib/types";

function makeResume(name: string) {
  const resume = createEmptyResume();
  resume.basic.name = name;
  return resume;
}

function readLibrary(): ResumeLibrary {
  return JSON.parse(
    window.localStorage.getItem(LIBRARY_KEY) ?? "{}",
  ) as ResumeLibrary;
}

function renderDocuments(
  isSample: boolean,
  resume = makeResume("示例内容"),
) {
  return renderHook(() =>
    useResumeDocuments({
      resume,
      template: "modern",
      isSample,
      replaceResume: vi.fn(),
      setTemplate: vi.fn(),
    }),
  );
}

describe("useResumeDocuments 载入示例后的文档操作", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("载入示例后切到另一份简历，原来的当前简历仍保留在列表里", () => {
    saveResume(makeResume("简历 A"));
    window.localStorage.setItem(
      LIBRARY_KEY,
      JSON.stringify({
        activeId: "a",
        activeTitle: "A 的简历",
        others: [
          {
            id: "b",
            title: "B 的简历",
            template: "modern",
            resume: makeResume("简历 B"),
          },
        ],
      }),
    );

    const { result } = renderDocuments(true);
    act(() => {
      expect(result.current.switchTo("b")).toBe(true);
    });

    const library = readLibrary();
    expect(library.activeId).toBe("b");
    expect(library.others.map((document) => document.id)).toContain("a");
    expect(
      library.others.find((document) => document.id === "a")?.resume.basic.name,
    ).toBe("简历 A");
    expect(loadResume()?.basic.name).toBe("简历 B");
  });

  it("载入示例后新建简历，也会先保存原来的当前简历", () => {
    saveResume(makeResume("简历 A"));
    window.localStorage.setItem(
      LIBRARY_KEY,
      JSON.stringify({
        activeId: "a",
        activeTitle: "A 的简历",
        others: [],
      }),
    );

    const { result } = renderDocuments(true);
    act(() => {
      expect(result.current.createBlank()).toBe(true);
    });

    const library = readLibrary();
    expect(library.others.map((document) => document.id)).toContain("a");
    expect(
      library.others.find((document) => document.id === "a")?.resume.basic.name,
    ).toBe("简历 A");
  });

  it("没载入示例时切换文档走原有快照逻辑", () => {
    saveResume(makeResume("简历 A"));
    window.localStorage.setItem(
      LIBRARY_KEY,
      JSON.stringify({
        activeId: "a",
        activeTitle: "A 的简历",
        others: [
          {
            id: "b",
            title: "B 的简历",
            template: "modern",
            resume: makeResume("简历 B"),
          },
        ],
      }),
    );

    const { result } = renderDocuments(false, makeResume("简历 A"));
    act(() => {
      expect(result.current.switchTo("b")).toBe(true);
    });

    const library = readLibrary();
    expect(library.activeId).toBe("b");
    expect(
      library.others.find((document) => document.id === "a")?.resume.basic.name,
    ).toBe("简历 A");
  });
});
