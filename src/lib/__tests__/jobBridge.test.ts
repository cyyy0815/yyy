import { afterEach, describe, expect, it, vi } from "vitest";
import {
  installJobBridge,
  JOB_BRIDGE_SOURCE,
  parseBridgeJobs,
  parseBridgeLead,
  subscribeJobBridge,
  takePendingJobs,
  takePendingLeads,
} from "../jobBridge";

function postLead(
  payload: unknown,
  source: string = JOB_BRIDGE_SOURCE,
  origin: string = window.location.origin,
) {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: { source, type: "lead", payload },
      source: window,
      origin,
    }),
  );
}

function postJobs(jobs: unknown[], origin: string = window.location.origin) {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        source: JOB_BRIDGE_SOURCE,
        type: "job-list",
        payload: { jobs },
      },
      source: window,
      origin,
    }),
  );
}

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  takePendingLeads();
  takePendingJobs();
});

describe("parseBridgeLead", () => {
  it("收下合法岗位并去掉首尾空格", () => {
    expect(
      parseBridgeLead({ company: " 某科技 ", role: " 前端 ", jd: " 熟悉 React。 " }),
    ).toEqual({ company: "某科技", role: "前端", jd: "熟悉 React。" });
  });

  it("没有 JD 时丢弃", () => {
    expect(parseBridgeLead({ company: "某科技", role: "前端", jd: "   " })).toBeNull();
    expect(parseBridgeLead({})).toBeNull();
    expect(parseBridgeLead(null)).toBeNull();
    expect(parseBridgeLead("jd")).toBeNull();
  });

  it("超长字段会被截断", () => {
    const lead = parseBridgeLead({ jd: "x".repeat(9000), company: "c".repeat(200) });
    expect(lead?.jd).toHaveLength(8000);
    expect(lead?.company).toHaveLength(100);
  });
});

describe("installJobBridge", () => {
  it("收到扩展消息后入队并通知订阅者", () => {
    const listener = vi.fn();
    cleanups.push(installJobBridge());
    cleanups.push(subscribeJobBridge(listener));

    postLead({ company: "某科技", role: "前端", jd: "熟悉 React。" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(takePendingLeads()).toEqual([
      { company: "某科技", role: "前端", jd: "熟悉 React。" },
    ]);
    // 取走之后队列为空
    expect(takePendingLeads()).toEqual([]);
  });

  it("忽略来源不对或类型不对的消息", () => {
    const listener = vi.fn();
    cleanups.push(installJobBridge());
    cleanups.push(subscribeJobBridge(listener));

    postLead({ jd: "熟悉 React。" }, "other-extension");
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { source: JOB_BRIDGE_SOURCE, type: "something-else", payload: { jd: "x" } },
        source: window,
        origin: window.location.origin,
      }),
    );

    expect(listener).not.toHaveBeenCalled();
    expect(takePendingLeads()).toEqual([]);
  });

  it("同一页的岗位只保留一条，并按池条目入队", () => {
    const listener = vi.fn();
    cleanups.push(installJobBridge());
    cleanups.push(subscribeJobBridge(listener));

    postJobs([
      {
        company: "某科技",
        role: "前端",
        url: "https://www.zhipin.com/job_detail/1.html?lid=1",
        tags: ["React", "React", "TypeScript"],
      },
      {
        company: "某科技",
        role: "前端",
        url: "https://www.zhipin.com/job_detail/1.html?lid=2",
      },
    ]);

    expect(listener).toHaveBeenCalledTimes(1);
    const jobs = takePendingJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].tags).toEqual(["React", "TypeScript"]);
    expect(takePendingJobs()).toEqual([]);
  });

  it("忽略不同源或没有岗位的消息", () => {
    const listener = vi.fn();
    cleanups.push(installJobBridge());
    cleanups.push(subscribeJobBridge(listener));

    postJobs([{ company: "某科技", role: "前端" }], "https://evil.example");
    postJobs([]);

    expect(listener).not.toHaveBeenCalled();
    expect(takePendingJobs()).toEqual([]);
  });
});

describe("parseBridgeJobs", () => {
  it("过滤非法条目并限制字段长度", () => {
    const jobs = parseBridgeJobs({
      jobs: [
        { company: "c".repeat(200), role: "前端", url: "javascript:alert(1)" },
        { company: "", role: "", url: "" },
        { company: "某科技", role: "后端", url: "https://example.com/job/1" },
      ],
    });
    expect(jobs).toHaveLength(2);
    expect(jobs[0].company).toHaveLength(100);
    expect(jobs[0].url).toBe("");
    expect(jobs[1].company).toBe("某科技");
    expect(jobs[1].url).toBe("https://example.com/job/1");
  });

  it("非对象或非数组返回空", () => {
    expect(parseBridgeJobs(null)).toEqual([]);
    expect(parseBridgeJobs({})).toEqual([]);
    expect(parseBridgeJobs({ jobs: "x" })).toEqual([]);
  });
});
