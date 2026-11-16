import { beforeEach, describe, expect, it } from "vitest";
import {
  ingestJobPool,
  markPoolJobIgnored,
  markPoolJobNew,
  markPoolJobQueued,
  MAX_POOL_JOBS,
  normalizePoolJob,
  poolJobKey,
  readJobPool,
  releasePoolJobByApplication,
  safePoolUrl,
} from "../jobPool";

function makeJob(index = 0, overrides: Record<string, unknown> = {}) {
  return {
    company: `公司 ${index}`,
    role: `岗位 ${index}`,
    city: "上海",
    salary: "20-30K",
    tags: ["React"],
    url: `https://www.zhipin.com/job_detail/${index}.html`,
    source: "boss",
    jdPreview: "熟悉 React 与 TypeScript",
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("normalizePoolJob / poolJobKey", () => {
  it("收敛字段、标签去重并截断", () => {
    const job = normalizePoolJob({
      company: " c ".repeat(100),
      role: "前端",
      tags: ["React", "React", "Vue", "x".repeat(50)],
      url: "https://www.zhipin.com/job_detail/1.html",
      source: "unknown",
      state: "queued",
      applicationId: "app-1",
    });
    expect(job?.company.length).toBe(100);
    expect(job?.tags).toEqual(["React", "Vue", "x".repeat(30)]);
    expect(job?.source).toBe("other");
    expect(job?.state).toBe("queued");
    expect(job?.applicationId).toBe("app-1");
  });

  it("只接受 http(s)，没有公司/岗位/链接时丢弃", () => {
    expect(safePoolUrl("javascript:alert(1)")).toBe("");
    expect(safePoolUrl("data:text/html,x")).toBe("");
    expect(safePoolUrl("https://example.com/job")).toBe("https://example.com/job");
    expect(normalizePoolJob({ company: "", role: "", url: "" })).toBeNull();
  });

  it("同一路径不同跟踪参数视为同一岗位", () => {
    const first = poolJobKey({
      company: "某科技",
      role: "前端",
      city: "上海",
      url: "https://www.zhipin.com/job_detail/1.html?lid=1&securityId=x",
    });
    const second = poolJobKey({
      company: "某科技",
      role: "前端",
      city: "上海",
      url: "https://www.zhipin.com/job_detail/1.html?lid=2",
    });
    expect(first).toBe(second);
    expect(first).toBe("www.zhipin.com/job_detail/1.html");
  });

  it("没有链接时用公司/岗位/城市做键", () => {
    expect(
      poolJobKey({ company: "某科技", role: "前端", city: "上海", url: "" }),
    ).toBe("某科技|前端|上海");
  });
});

describe("ingestJobPool", () => {
  it("新岗位入池，重复采集合并字段并保留处理状态", () => {
    expect(ingestJobPool([makeJob(1, { tags: ["React"], salary: "" })])).toMatchObject({
      added: 1,
      updated: 0,
      total: 1,
      saved: true,
    });
    const first = readJobPool()[0];
    expect(markPoolJobQueued(first.id, "app-1")).toBe(true);

    const result = ingestJobPool([
      makeJob(1, {
        tags: ["Vue"],
        salary: "30-40K",
        url: "https://www.zhipin.com/job_detail/1.html?lid=2",
      }),
    ]);
    expect(result.added).toBe(0);
    expect(result.updated).toBe(1);

    const merged = readJobPool()[0];
    expect(merged.state).toBe("queued");
    expect(merged.applicationId).toBe("app-1");
    expect(merged.salary).toBe("30-40K");
    expect(merged.tags).toEqual(["React", "Vue"]);
  });

  it("超出上限时优先保留已加入待投的岗位", () => {
    const jobs = Array.from({ length: MAX_POOL_JOBS + 5 }, (_, index) =>
      makeJob(index),
    );
    ingestJobPool(jobs);
    const oldest = readJobPool().at(-1);
    expect(oldest).toBeDefined();
    if (oldest) markPoolJobQueued(oldest.id, "app-keep");

    ingestJobPool([makeJob(MAX_POOL_JOBS + 2)]);
    const pool = readJobPool();
    expect(pool).toHaveLength(MAX_POOL_JOBS);
    expect(pool.some((job) => job.applicationId === "app-keep")).toBe(true);
  });
});

describe("岗位池状态", () => {
  it("忽略后可恢复为未处理", () => {
    ingestJobPool([makeJob(1)]);
    const id = readJobPool()[0].id;
    expect(markPoolJobIgnored(id)).toBe(true);
    expect(readJobPool()[0].state).toBe("ignored");
    expect(markPoolJobNew(id)).toBe(true);
    expect(readJobPool()[0].state).toBe("new");
  });

  it("删除投递记录后，对应池条目回到未处理", () => {
    ingestJobPool([makeJob(1)]);
    const id = readJobPool()[0].id;
    markPoolJobQueued(id, "app-2");
    releasePoolJobByApplication("app-2");
    const job = readJobPool()[0];
    expect(job.state).toBe("new");
    expect(job.applicationId).toBeUndefined();
  });
});
