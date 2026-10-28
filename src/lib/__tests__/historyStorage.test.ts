import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearResumeHistory,
  HISTORY_STORAGE_FORMAT,
  HISTORY_STORAGE_KEY,
  HISTORY_STORAGE_VERSION,
  loadResumeHistory,
  packResumeHistory,
  parseResumeHistory,
  saveResumeHistory,
  type StoredResumeHistory,
} from "../historyStorage";
import { RESUME_SCHEMA_VERSION } from "../schema";
import { createEmptyResume, type Resume } from "../types";

function makeResume(name: string, summary = ""): Resume {
  const resume = createEmptyResume();
  resume.basic = { ...resume.basic, name, summary };
  return resume;
}

function makeState(names: string[], futureNames: string[] = []): StoredResumeHistory {
  return {
    past: names.map((name) => ({ resume: makeResume(name), isSample: false })),
    future: futureNames.map((name) => ({
      resume: makeResume(name),
      isSample: true,
    })),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("packResumeHistory / parseResumeHistory", () => {
  it("往返保留两份栈、示例标记与数据版本", () => {
    const text = packResumeHistory(makeState(["旧"], ["新"]), { now: 123 });
    expect(text).not.toBeNull();
    const raw = JSON.parse(text as string);
    expect(raw).toMatchObject({
      format: HISTORY_STORAGE_FORMAT,
      version: HISTORY_STORAGE_VERSION,
      schemaVersion: RESUME_SCHEMA_VERSION,
      savedAt: 123,
    });

    const parsed = parseResumeHistory(text);
    expect(parsed?.past.map((item) => item.resume.basic.name)).toEqual(["旧"]);
    expect(parsed?.future.map((item) => item.resume.basic.name)).toEqual(["新"]);
    expect(parsed?.future[0].isSample).toBe(true);
    expect(parsed?.past[0].resume.schemaVersion).toBe(RESUME_SCHEMA_VERSION);
  });

  it("空历史不写入，损坏或未知格式返回 null", () => {
    expect(packResumeHistory({ past: [], future: [] })).toBeNull();
    expect(parseResumeHistory(null)).toBeNull();
    expect(parseResumeHistory("{oops")).toBeNull();
    expect(parseResumeHistory(JSON.stringify({ format: "other" }))).toBeNull();
    expect(
      parseResumeHistory(
        JSON.stringify({
          format: HISTORY_STORAGE_FORMAT,
          version: HISTORY_STORAGE_VERSION + 1,
          past: [],
          future: [],
        }),
      ),
    ).toBeNull();
  });

  it("按条数上限保留离当前最近的步骤", () => {
    const text = packResumeHistory(makeState(["1", "2", "3", "4", "5"]), {
      limit: 2,
    });
    const parsed = parseResumeHistory(text);
    expect(parsed?.past.map((item) => item.resume.basic.name)).toEqual([
      "4",
      "5",
    ]);
  });

  it("超过字符预算时丢弃最旧步骤，仍保留最新一份", () => {
    const state = makeState(["1", "2", "3", "4"]);
    for (const item of state.past) {
      item.resume.basic.summary = "内容".repeat(300);
    }
    const text = packResumeHistory(state, { maxChars: 2500 });
    const parsed = parseResumeHistory(text);
    expect(parsed).not.toBeNull();
    expect(parsed?.past.length).toBeLessThan(4);
    expect(parsed?.past.at(-1)?.resume.basic.name).toBe("4");
  });

  it("忽略更新 schema 的快照与未来版本载荷", () => {
    const newer = RESUME_SCHEMA_VERSION + 1;
    const mixed = parseResumeHistory(
      JSON.stringify({
        format: HISTORY_STORAGE_FORMAT,
        version: HISTORY_STORAGE_VERSION,
        schemaVersion: RESUME_SCHEMA_VERSION,
        past: [
          { resume: { schemaVersion: newer, basic: { name: "未来" } } },
          { resume: { basic: { name: "旧" } }, isSample: false },
        ],
        future: [],
      }),
    );
    expect(mixed?.past.map((item) => item.resume.basic.name)).toEqual(["旧"]);

    const futurePayload = parseResumeHistory(
      JSON.stringify({
        format: HISTORY_STORAGE_FORMAT,
        version: HISTORY_STORAGE_VERSION,
        schemaVersion: newer,
        past: [{ resume: { basic: { name: "未来" } } }],
        future: [],
      }),
    );
    expect(futurePayload).toBeNull();
  });
});

describe("sessionStorage 封装", () => {
  function stubStorage() {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    vi.stubGlobal("window", { sessionStorage: storage });
    return { values, storage };
  }

  it("保存后可以读取，空历史会删除旧值", () => {
    const { values } = stubStorage();
    expect(saveResumeHistory(makeState(["旧", "新"]))).toBe(true);
    expect(values.has(HISTORY_STORAGE_KEY)).toBe(true);
    expect(loadResumeHistory()?.past).toHaveLength(2);

    expect(saveResumeHistory({ past: [], future: [] })).toBe(true);
    expect(values.has(HISTORY_STORAGE_KEY)).toBe(false);
  });

  it("配额不足时返回 false 且不抛异常", () => {
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
        removeItem: () => {},
      },
    });
    expect(saveResumeHistory(makeState(["旧"]))).toBe(false);
    expect(() => clearResumeHistory()).not.toThrow();
  });
});
