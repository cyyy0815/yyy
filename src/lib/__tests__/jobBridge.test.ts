import { afterEach, describe, expect, it, vi } from "vitest";
import {
  installJobBridge,
  JOB_BRIDGE_SOURCE,
  parseBridgeLead,
  subscribeJobBridge,
  takePendingLeads,
} from "../jobBridge";

function postLead(payload: unknown, source: string = JOB_BRIDGE_SOURCE) {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: { source, type: "lead", payload },
      source: window,
    }),
  );
}

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  takePendingLeads();
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
      }),
    );

    expect(listener).not.toHaveBeenCalled();
    expect(takePendingLeads()).toEqual([]);
  });
});
