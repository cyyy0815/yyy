import { describe, expect, it } from "vitest";
import { displayUrl, toSafeHref } from "../links";

describe("toSafeHref", () => {
  it("允许 http(s) 并自动补全协议", () => {
    expect(toSafeHref("github.com/you")).toBe("https://github.com/you");
    expect(toSafeHref("https://example.com/a")).toBe(
      "https://example.com/a",
    );
    expect(toSafeHref("http://localhost:3000")).toBe(
      "http://localhost:3000/",
    );
    expect(toSafeHref("  www.example.com  ")).toBe(
      "https://www.example.com/",
    );
  });

  it("拒绝危险协议、无域名与含空格的值", () => {
    for (const value of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "ftp://example.com",
      "file:///C:/secret.txt",
      "not a url",
      "https://",
      "https://intranet",
      "",
    ]) {
      expect(toSafeHref(value)).toBeNull();
    }
  });
});

describe("displayUrl", () => {
  it("去掉协议与末尾斜杠", () => {
    expect(displayUrl("https://github.com/you/")).toBe("github.com/you");
    expect(displayUrl("http://example.com")).toBe("example.com");
    expect(displayUrl("github.com/you")).toBe("github.com/you");
  });

  it("非法值只作为文本展示", () => {
    expect(displayUrl("javascript:alert(1)")).toBe("javascript:alert(1)");
    expect(displayUrl("  not a url  ")).toBe("not a url");
  });
});
