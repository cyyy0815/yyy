import { describe, expect, it } from "vitest";
import {
  APPLICATION_STATUSES,
  applicationStatusLabel,
  createEmptyApplication,
  normalizeApplication,
  normalizeApplicationDate,
  normalizeApplications,
  sortApplications,
  type JobApplication,
} from "../applications";

function validApplication(
  patch: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: "app-1",
    company: " 某某科技 ",
    role: " 前端工程师 ",
    city: " 上海 ",
    status: "interview",
    jd: " 熟悉 React ",
    coverLetter: " 尊敬的招聘负责人： ",
    note: " 周三面试 ",
    resumeTitle: " 前端主简历 ",
    appliedAt: "2026-10-01",
    nextActionAt: "2026-10-08",
    createdAt: 1000,
    updatedAt: 2000,
    ...patch,
  };
}

describe("normalizeApplication", () => {
  it("收敛文本、日期与时间戳", () => {
    const application = normalizeApplication(validApplication());
    expect(application).toMatchObject({
      id: "app-1",
      company: "某某科技",
      role: "前端工程师",
      city: "上海",
      status: "interview",
      jd: "熟悉 React",
      coverLetter: "尊敬的招聘负责人：",
      note: "周三面试",
      resumeTitle: "前端主简历",
      appliedAt: "2026-10-01",
      nextActionAt: "2026-10-08",
      createdAt: 1000,
      updatedAt: 2000,
    });
  });

  it("非法状态回退为想投，非法日期清空", () => {
    const application = normalizeApplication(
      validApplication({
        status: "unknown",
        appliedAt: "2026-02-30",
        nextActionAt: "10/08/2026",
      }),
    );
    expect(application?.status).toBe("wishlist");
    expect(application?.appliedAt).toBe("");
    expect(application?.nextActionAt).toBe("");
  });

  it("丢弃完全空白的记录与非对象", () => {
    expect(normalizeApplication(null)).toBeNull();
    expect(normalizeApplication("x")).toBeNull();
    expect(
      normalizeApplication({
        company: "",
        role: "",
        jd: "",
        coverLetter: "",
        note: "",
      }),
    ).toBeNull();
  });

  it("缺少 id 或时间时补齐", () => {
    const application = normalizeApplication({
      company: "某公司",
      status: "applied",
      createdAt: "bad",
    });
    expect(application?.id).toBeTruthy();
    expect(application?.role).toBe("");
    expect(application?.appliedAt).toBe("");
    expect(application?.createdAt).toBeGreaterThan(0);
    expect(application?.updatedAt).toBe(application?.createdAt);
  });
});

describe("normalizeApplications", () => {
  it("非数组输入返回空列表，重复 id 会重新生成", () => {
    expect(normalizeApplications(null)).toEqual([]);
    expect(normalizeApplications({ company: "x" })).toEqual([]);

    const list = normalizeApplications([
      validApplication(),
      validApplication({ company: "另一家" }),
    ]);
    expect(list).toHaveLength(2);
    expect(list[0].id).not.toBe(list[1].id);
  });

  it("按更新时间倒序排列，不改动原数组", () => {
    const list = normalizeApplications([
      validApplication({ id: "old", updatedAt: 1000 }),
      validApplication({ id: "new", updatedAt: 3000 }),
    ]);
    const sorted = sortApplications(list);
    expect(sorted.map((item) => item.id)).toEqual(["new", "old"]);
    expect(list.map((item) => item.id)).toEqual(["old", "new"]);
  });
});

describe("application helpers", () => {
  it("状态常量与标签一一对应", () => {
    for (const status of APPLICATION_STATUSES) {
      expect(applicationStatusLabel(status.id)).toBe(status.label);
    }
  });

  it("空白投递默认为想投并带入简历标题", () => {
    const application: JobApplication = createEmptyApplication(" 主简历 ", 123);
    expect(application.status).toBe("wishlist");
    expect(application.resumeTitle).toBe("主简历");
    expect(application.createdAt).toBe(123);
    expect(application.updatedAt).toBe(123);
    expect(application.jd).toBe("");
  });

  it("日期严格校验闰年与月末", () => {
    expect(normalizeApplicationDate("2024-02-29")).toBe("2024-02-29");
    expect(normalizeApplicationDate("2025-02-29")).toBe("");
    expect(normalizeApplicationDate("2026-04-31")).toBe("");
    expect(normalizeApplicationDate(" 2026-10-28 ")).toBe("2026-10-28");
  });
});
