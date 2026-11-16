import { describe, expect, it } from "vitest";
import {
  capturedJobKey,
  mergeCapturedJobs,
  normalizeCapturedJob,
  parseCapturedJobs,
} from "../capturedJobs";

function makeJob(index = 0, overrides: Record<string, unknown> = {}) {
  return {
    company: `公司 ${index}`,
    role: `岗位 ${index}`,
    city: "上海",
    salary: "20-30K",
    tags: ["React"],
    url: `https://www.zhipin.com/job_detail/${index}.html`,
    source: "boss",
    jdPreview: "React TypeScript",
    ...overrides,
  };
}

describe("normalizeCapturedJob", () => {
  it("收敛字段、标签去重并拒绝非 http(s) 链接", () => {
    const job = normalizeCapturedJob({
      company: " c ".repeat(100),
      role: "前端",
      tags: ["React", "React", "Vue"],
      url: "javascript:alert(1)",
      source: "unknown",
    });
    expect(job?.company).toHaveLength(100);
    expect(job?.tags).toEqual(["React", "Vue"]);
    expect(job?.url).toBe("");
    expect(job?.source).toBe("other");
  });

  it("没有公司/岗位/链接时丢弃", () => {
    expect(normalizeCapturedJob({ company: "", role: "", url: "" })).toBeNull();
  });
});

describe("parseCapturedJobs", () => {
  it("同一路径不同跟踪参数只保留一条", () => {
    const jobs = parseCapturedJobs({
      jobs: [
        makeJob(1, { url: "https://www.zhipin.com/job_detail/1.html?lid=1" }),
        makeJob(1, { url: "https://www.zhipin.com/job_detail/1.html?lid=2" }),
        makeJob(2),
      ],
    });
    expect(jobs).toHaveLength(2);
  });

  it("非对象/非数组返回空，最多 50 条", () => {
    expect(parseCapturedJobs(null)).toEqual([]);
    expect(parseCapturedJobs({ jobs: "x" })).toEqual([]);
    const jobs = parseCapturedJobs({
      jobs: Array.from({ length: 60 }, (_, index) => makeJob(index)),
    });
    expect(jobs).toHaveLength(50);
  });
});

describe("mergeCapturedJobs", () => {
  it("重复采集按 key 合并标签与更长描述", () => {
    const first = normalizeCapturedJob(makeJob(1));
    const second = normalizeCapturedJob(
      makeJob(1, {
        tags: ["Vue"],
        jdPreview: "React TypeScript Vue",
        url: "https://www.zhipin.com/job_detail/1.html?lid=2",
      }),
    );
    expect(first && second).toBeTruthy();
    if (!first || !second) return;
    const merged = mergeCapturedJobs([first], [second]);
    expect(merged).toHaveLength(1);
    expect(merged[0].tags).toEqual(["React", "Vue"]);
    expect(merged[0].jdPreview).toContain("Vue");
    expect(capturedJobKey(merged[0])).toBe("www.zhipin.com/job_detail/1.html");
  });
});
