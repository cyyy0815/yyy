import { describe, expect, it } from "vitest";
import { MAX_LEAD_JD_CHARS, formatJobLeads, parseJobLeads } from "../jobLeads";

describe("parseJobLeads", () => {
  it("单条：短首行当岗位名，其余是 JD", () => {
    const result = parseJobLeads(
      "高级前端工程师\n负责中后台系统开发，熟悉 React 与 TypeScript。",
    );
    expect(result.error).toBeUndefined();
    expect(result.leads).toHaveLength(1);
    expect(result.leads[0].role).toBe("高级前端工程师");
    expect(result.leads[0].company).toBe("");
    expect(result.leads[0].jd).toContain("React");
  });

  it("识别「公司 | 岗位」表头", () => {
    const result = parseJobLeads(
      "某科技 | Java 后端\n负责交易系统开发，熟悉 Spring Boot 与 MySQL。",
    );
    expect(result.leads[0]).toMatchObject({ company: "某科技", role: "Java 后端" });
    expect(result.leads[0].jd.startsWith("负责交易系统")).toBe(true);
  });

  it("用 --- 或 === 分隔多条", () => {
    const text = [
      "A 公司 | 前端",
      "熟悉 React。",
      "---",
      "B 公司 | 后端",
      "熟悉 Go。",
      "===",
      "C 公司 | 测试",
      "熟悉接口测试。",
    ].join("\n");
    const result = parseJobLeads(text);
    expect(result.leads.map((lead) => lead.company)).toEqual(["A 公司", "B 公司", "C 公司"]);
    expect(result.leads).toHaveLength(3);
  });

  it("没有正文的段会被跳过", () => {
    const result = parseJobLeads("A 公司 | 前端\n---\nB 公司 | 后端\n熟悉 Go。");
    expect(result.leads).toHaveLength(1);
    expect(result.leads[0].company).toBe("B 公司");
    expect(result.skipped).toBe(1);
  });

  it("长首行不当岗位名，整段算 JD", () => {
    const long = "这是一段没有换行的很长很长的岗位描述，包含了大量要求和职责说明。";
    const result = parseJobLeads(long);
    expect(result.leads).toHaveLength(1);
    expect(result.leads[0].role).toBe("");
    expect(result.leads[0].jd).toBe(long);
  });

  it("单条 JD 的超长内容会被截断", () => {
    const result = parseJobLeads(`岗位\n${"要".repeat(MAX_LEAD_JD_CHARS + 500)}`);
    expect(result.leads[0].jd).toHaveLength(MAX_LEAD_JD_CHARS);
  });

  it("超过 50 条时截断并计数", () => {
    const blocks = Array.from(
      { length: 55 },
      (_, index) => `公司${index} | 岗位${index}\nJD 正文 ${index}`,
    );
    const result = parseJobLeads(blocks.join("\n---\n"));
    expect(result.leads).toHaveLength(50);
    expect(result.truncated).toBe(5);
  });

  it("空输入给出错误提示", () => {
    const result = parseJobLeads("   \n  ");
    expect(result.leads).toHaveLength(0);
    expect(result.error).toContain("粘贴");
  });

  it("只有表头没有正文时给出可操作的错误", () => {
    const result = parseJobLeads("A 公司 | 前端\n---\nB 公司 | 后端");
    expect(result.leads).toHaveLength(0);
    expect(result.error).toContain("JD 正文");
  });
});

describe("formatJobLeads", () => {
  it("拼回可再次导入的文本", () => {
    const text = formatJobLeads([
      { company: "某科技", role: "前端", jd: "熟悉 React。" },
      { company: "", role: "后端", jd: "熟悉 Go。" },
    ]);
    expect(text).toBe("某科技 | 前端\n熟悉 React。\n---\n后端\n熟悉 Go。");
  });

  it("格式化后再解析，数据保持一致", () => {
    const leads = [
      { company: "A 公司", role: "前端", jd: "熟悉 React。\n熟悉 TypeScript。" },
      { company: "B 公司", role: "后端", jd: "熟悉 Java。" },
    ];
    const parsed = parseJobLeads(formatJobLeads(leads));
    expect(parsed.error).toBeUndefined();
    expect(parsed.leads).toEqual(leads);
  });
});
