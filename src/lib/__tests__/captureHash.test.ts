import { describe, expect, it } from "vitest";
import { CAPTURE_HASH_PREFIX, readCaptureHash } from "../captureHash";

function makePayload() {
  return {
    jobs: [
      {
        company: "示例科技",
        role: "前端工程师",
        city: "上海",
        salary: "20-30K",
        tags: ["React"],
        url: "https://www.zhipin.com/job_detail/1.html",
        source: "boss",
        jdPreview: "React",
      },
    ],
  };
}

describe("readCaptureHash", () => {
  it("从 hash 中解析采集结果", () => {
    const hash = `${CAPTURE_HASH_PREFIX}${encodeURIComponent(
      JSON.stringify(makePayload()),
    )}`;
    const jobs = readCaptureHash(hash);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].company).toBe("示例科技");
  });

  it("普通 hash、坏 JSON、坏编码都返回空", () => {
    expect(readCaptureHash("#jobs")).toEqual([]);
    expect(readCaptureHash("#agent")).toEqual([]);
    expect(readCaptureHash(`${CAPTURE_HASH_PREFIX}{oops`)).toEqual([]);
    expect(readCaptureHash(`${CAPTURE_HASH_PREFIX}%E0%A4%A`)).toEqual([]);
  });
});
