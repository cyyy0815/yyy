import { describe, expect, it } from "vitest";
import {
  validateDateRange,
  validateEmail,
  validateName,
  validatePhone,
  validateSalary,
  validateUrl,
} from "../validate";

describe("validateDateRange", () => {
  it("允许空值、至今与常见月份格式", () => {
    expect(validateDateRange("", "")).toBe("");
    expect(validateDateRange("2023.05", "")).toBe("");
    expect(validateDateRange("2023-05", "至今")).toBe("");
    expect(validateDateRange("2023年5月", "2024/06")).toBe("");
    expect(validateDateRange("2023.05", "present")).toBe("");
  });

  it("拒绝非法月份与倒置区间", () => {
    expect(validateDateRange("2023.13", "2024.01")).toContain("开始时间格式");
    expect(validateDateRange("2023.05", "2024.13")).toContain("结束时间格式");
    expect(validateDateRange("2024.01", "2023.12")).toBe(
      "开始时间不能晚于结束时间",
    );
  });
});

describe("validateEmail / validatePhone", () => {
  it("空值不报错", () => {
    expect(validateEmail("")).toBe("");
    expect(validatePhone(" ")).toBe("");
  });

  it("校验邮箱格式", () => {
    expect(validateEmail("you@example.com")).toBe("");
    expect(validateEmail("you@example")).toContain("邮箱格式不正确");
    expect(validateEmail("you example.com")).toContain("邮箱格式不正确");
  });

  it("校验电话字符与位数", () => {
    expect(validatePhone("+86 138-0000-0000")).toBe("");
    expect(validatePhone("(021) 12345678")).toBe("");
    expect(validatePhone("1380000abcd")).toContain("只能包含数字");
    expect(validatePhone("123")).toContain("位数不正确");
    expect(validatePhone("1234567890123456")).toContain("位数不正确");
  });
});

describe("validateUrl", () => {
  it("允许省略协议", () => {
    expect(validateUrl("github.com/you")).toBe("");
    expect(validateUrl("https://example.com/a")).toBe("");
    expect(validateUrl("http://localhost:3000")).toBe("");
  });

  it("拒绝空格与无域名输入", () => {
    expect(validateUrl("github.com/you name")).toContain("不能包含空格");
    expect(validateUrl("not-a-url")).toContain("链接格式不正确");
    expect(validateUrl("https://")).toContain("链接格式不正确");
  });
});

describe("validateSalary", () => {
  it("空值与合法区间不报错", () => {
    expect(validateSalary("", "")).toEqual({});
    expect(validateSalary("20", "30")).toEqual({});
    expect(validateSalary("20", "")).toEqual({});
  });

  it("拒绝非数字与倒置区间", () => {
    expect(validateSalary("二十", "30")).toEqual({
      min: "请输入数字，单位 K",
    });
    expect(validateSalary("20", "abc")).toEqual({
      max: "请输入数字，单位 K",
    });
    expect(validateSalary("30", "20")).toEqual({
      max: "最高月薪不能低于最低月薪",
    });
  });
});

describe("validateName", () => {
  it("姓名必填", () => {
    expect(validateName("林一")).toBe("");
    expect(validateName("  ")).toContain("请填写姓名");
  });
});
