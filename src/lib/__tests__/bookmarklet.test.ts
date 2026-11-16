import { describe, expect, it } from "vitest";
import { buildBookmarklet } from "../bookmarklet";

describe("buildBookmarklet", () => {
  it("生成可直接拖到书签栏的 javascript: 链接", () => {
    const code = buildBookmarklet("https://yyy-sandy.vercel.app/");
    expect(code.startsWith("javascript:")).toBe(true);
    expect(code).toContain('"https://yyy-sandy.vercel.app"');
    expect(code).toContain("capture=");
    expect(code).toContain("jobs");
    expect(code).not.toContain("\n");
  });

  it("保留 localhost 协议与端口", () => {
    const code = buildBookmarklet("http://localhost:3000");
    expect(code).toContain('"http://localhost:3000"');
  });
});
