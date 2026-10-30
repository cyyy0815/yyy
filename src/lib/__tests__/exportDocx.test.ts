import { describe, expect, it } from "vitest";
import { createSampleResume } from "../defaultResume";
import { buildResumeDocx, safeFileName } from "../export/docx";

describe("buildResumeDocx", () => {
  it("生成合法的 docx（zip 头 + 非空）", async () => {
    const blob = await buildResumeDocx(createSampleResume());
    const bytes = new Uint8Array(await blob.arrayBuffer());
    // .docx 是 zip 容器，前两个字节固定是 PK
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe("PK");
    expect(bytes.length).toBeGreaterThan(2000);
  });

  it("可以导出空简历而不报错", async () => {
    const empty = { ...createSampleResume() };
    empty.basic = { ...empty.basic, name: "", summary: "" };
    empty.experiences = [];
    empty.projects = [];
    empty.educations = [];
    empty.skills = [];
    const blob = await buildResumeDocx(empty);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(500);
  });
});

describe("safeFileName", () => {
  it("去掉路径与非法字符", () => {
    expect(safeFileName('前端/后端:简历*?"<>|')).toBe("前端 后端 简历");
  });

  it("空标题回退到默认名", () => {
    expect(safeFileName("   ")).toBe("简历");
    expect(safeFileName("", "未命名")).toBe("未命名");
  });
});
