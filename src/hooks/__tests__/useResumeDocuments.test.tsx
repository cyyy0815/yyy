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
  hasUnsavedChanges = false,
) {
  return renderHook(() =>
    useResumeDocuments({
      resume,
      template: "modern",
      isSample,
      hasUnsavedChanges,
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

describe("useResumeDocuments 多标签页身份同步", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  function seedLibrary(library: ResumeLibrary) {
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  }

  function fireLibraryEvent(library: ResumeLibrary) {
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: LIBRARY_KEY,
          newValue: JSON.stringify(library),
        }),
      );
    });
  }

  it("另一个标签页新增文档时，本页列表同步出现", () => {
    seedLibrary({ activeId: "a", activeTitle: "A 的简历", others: [] });
    const { result } = renderDocuments(false, makeResume("简历 A"));

    fireLibraryEvent({
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
    });

    expect(result.current.documents.map((document) => document.id)).toContain(
      "b",
    );
  });

  it("没有未保存修改时，跟随另一个标签页切换当前文档", () => {
    seedLibrary({
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
    });
    const { result } = renderDocuments(false, makeResume("简历 A"));

    fireLibraryEvent({
      activeId: "b",
      activeTitle: "B 的简历",
      others: [
        {
          id: "a",
          title: "A 的简历",
          template: "modern",
          resume: makeResume("简历 A"),
        },
      ],
    });

    expect(result.current.activeId).toBe("b");
    expect(result.current.currentTitle).toBe("B 的简历");
  });

  it("本页有未保存修改时，不跟随对方切换当前文档", () => {
    seedLibrary({ activeId: "a", activeTitle: "A 的简历", others: [] });
    const { result } = renderDocuments(false, makeResume("简历 A"), true);

    fireLibraryEvent({
      activeId: "b",
      activeTitle: "B 的简历",
      others: [
        {
          id: "a",
          title: "A 的简历",
          template: "modern",
          resume: makeResume("简历 A"),
        },
      ],
    });

    expect(result.current.activeId).toBe("a");
    expect(result.current.currentTitle).toBe("A 的简历");
  });

  it("写入前会合并另一个标签页新加的文档，不把它覆盖掉", () => {
    seedLibrary({ activeId: "a", activeTitle: "A 的简历", others: [] });
    const { result } = renderDocuments(false, makeResume("简历 A"));

    // 模拟另一个标签页在本页不知情时追加了文档 C（没有触发 storage 事件）
    seedLibrary({
      activeId: "a",
      activeTitle: "A 的简历",
      others: [
        {
          id: "c",
          title: "C 的简历",
          template: "modern",
          resume: makeResume("简历 C"),
        },
      ],
    });

    act(() => {
      result.current.appendDocument(makeResume("简历 D"), "D 的简历");
    });

    const library = readLibrary();
    const ids = library.others.map((document) => document.id);
    expect(ids).toContain("c");
    expect(
      library.others.some((document) => document.title === "D 的简历"),
    ).toBe(true);
  });
});
