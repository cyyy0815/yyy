/**
 * 批量导入岗位：把一段粘贴文本拆成多条「公司 / 岗位 / JD」。
 *
 * 约定：
 * - 用一行 `---`（3 个及以上短横线或等号）分隔多条；
 * - 每段第一行写「公司 | 岗位」，也可以只写岗位名；
 * - 其余内容都是 JD 正文。
 *
 * 不在这里做匹配打分，只负责把文本收敛成结构化数据。
 */

export type ParsedJobLead = {
  company: string;
  role: string;
  jd: string;
};

export type ParseJobLeadsResult = {
  leads: ParsedJobLead[];
  /** 没有正文而被跳过的段数 */
  skipped: number;
  /** 超出单次导入上限、被丢弃的段数 */
  truncated: number;
  error?: string;
};

export const MAX_LEADS_PER_IMPORT = 50;
export const MAX_LEAD_JD_CHARS = 8000;
const MAX_TITLE_CHARS = 100;
const SEPARATOR = /^\s*(?:-{3,}|={3,})\s*$/m;

function asTitle(value: string): string {
  return value.trim().slice(0, MAX_TITLE_CHARS);
}

export function parseJobLeads(text: string): ParseJobLeadsResult {
  const source = text.replace(/\r\n/g, "\n").trim();
  if (!source) {
    return { leads: [], skipped: 0, truncated: 0, error: "请先粘贴岗位描述" };
  }

  const blocks = source.split(SEPARATOR);
  const leads: ParsedJobLead[] = [];
  let skipped = 0;
  let truncated = 0;

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trimEnd());
    while (lines.length > 0 && !lines[0].trim()) lines.shift();
    while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();
    if (lines.length === 0) continue;

    let company = "";
    let role = "";
    let bodyLines = lines;

    const header = lines[0].trim();
    if (header.includes("|")) {
      const [companyPart, ...rest] = header.split("|");
      company = asTitle(companyPart);
      role = asTitle(rest.join("|"));
      bodyLines = lines.slice(1);
    } else if (lines.length > 1 && header.length <= 40) {
      // 没写「公司 | 岗位」时，把短的首行当作岗位名
      role = asTitle(header);
      bodyLines = lines.slice(1);
    }

    const jd = bodyLines.join("\n").trim().slice(0, MAX_LEAD_JD_CHARS);
    if (!jd) {
      skipped += 1;
      continue;
    }

    if (leads.length >= MAX_LEADS_PER_IMPORT) {
      truncated += 1;
      continue;
    }

    leads.push({ company, role, jd });
  }

  if (leads.length === 0) {
    return {
      leads,
      skipped,
      truncated,
      error: skipped > 0 ? "没有解析到 JD 正文，检查一下分隔线或空段" : "没有解析到可导入的岗位",
    };
  }

  return { leads, skipped, truncated };
}

/**
 * 把结构化岗位拼回可再次导入的文本。
 * 浏览器扩展把抓到的 JD 交给待投清单时用它，保证「发送 → 预览 → 导入」走同一条解析链路。
 */
export function formatJobLeads(leads: ParsedJobLead[]): string {
  return leads
    .map((lead) => {
      const header = [lead.company.trim(), lead.role.trim()]
        .filter(Boolean)
        .join(" | ");
      return [header, lead.jd.trim()].filter(Boolean).join("\n");
    })
    .join("\n---\n");
}

