/**
 * 招聘网站侧的提取脚本：尽力从页面抓「公司 / 岗位 / JD」。
 *
 * 各平台 DOM 经常改，所以这里是「多候选选择器 + JSON-LD + 通用兜底」三层：
 * 抓不到就让用户在弹出的面板里改，宁可少抓也不要抓错。
 */
const MAX_JD_CHARS = 8000;

const SITE_RULES = {
  "www.zhipin.com": {
    role: [".job-banner .name h1", ".job-name", ".job-banner h1", "h1"],
    // 注意：不要用 .company-name —— 详情页里它命中的是「相似职位」卡片的公司，
    // 真实公司名在 <title> 的「岗位招聘_公司名招聘-BOSS直聘」里。
    company: [
      ".company-info .name",
      ".job-banner .company-info a",
      ".sider-company .name",
    ],
    jd: [
      ".job-sec-text",
      ".job-detail-section",
      ".job-detail .text",
      ".job-detail",
    ],
  },
  "www.lagou.com": {
    role: [".position-head .name", ".position-name", "h1"],
    company: [".company", ".company-name", ".job_company .name"],
    jd: [".job_bt", ".job-detail", ".position-content"],
  },
  "www.liepin.com": {
    role: [".name-box .name", ".job-title", "h1"],
    // .company-name 在详情页有 26 处（推荐企业），不能用来取当前公司
    company: [".company-info .name", ".company-box .name"],
    jd: [".job-intro-container", ".describtion", ".job-description"],
  },
  // 智联新版详情页：标题在 summary-planes__title，公司名是 companydetail 链接，
  // 正文没有稳定的类名，交给下面的「按标题文字找正文」兜底。
  "www.zhaopin.com": {
    role: [".summary-planes__title", ".summary-plane__title", ".job-title", "h1"],
    company: ['a[href*="/companydetail/"]', ".company-name"],
    jd: [".descript__detail", ".job-detail"],
  },
  "sou.zhaopin.com": {
    role: [".summary-planes__title", ".summary-plane__title", ".job-title", "h1"],
    company: ['a[href*="/companydetail/"]', ".company-name"],
    jd: [".descript__detail", ".job-detail"],
  },
  "we.51job.com": {
    role: [".tHeader h1", ".job-title", "h1"],
    company: [".cname", ".company-name"],
    jd: [".job_msg", ".job-detail", ".bmsg"],
  },
  "jobs.51job.com": {
    role: [".tHeader h1", ".job-title", "h1"],
    company: [".cname", ".company-name"],
    jd: [".job_msg", ".job-detail", ".bmsg"],
  },
};

function textOf(node) {
  return node ? (node.innerText || node.textContent || "").trim() : "";
}

function firstText(selectors) {
  if (!Array.isArray(selectors)) return "";
  for (const selector of selectors) {
    try {
      const value = textOf(document.querySelector(selector));
      if (value) return value;
    } catch {
      // 选择器写错不影响其它候选
    }
  }
  return "";
}

function metaContent(names) {
  for (const name of names) {
    const node = document.querySelector(
      `meta[property="${name}"], meta[name="${name}"]`,
    );
    const value = node ? (node.getAttribute("content") || "").trim() : "";
    if (value) return value;
  }
  return "";
}

function clean(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fromJsonLd() {
  const nodes = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  );
  for (const node of nodes) {
    let parsed;
    try {
      parsed = JSON.parse(node.textContent || "null");
    } catch {
      continue;
    }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) {
      const type = item && item["@type"];
      const isJobPosting =
        type === "JobPosting" ||
        (Array.isArray(type) && type.includes("JobPosting"));
      if (!isJobPosting) continue;
      const description = String(item.description || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return {
        company: clean(item.hiringOrganization && item.hiringOrganization.name),
        role: clean(item.title),
        jd: clean(description),
      };
    }
  }
  return null;
}

const DESC_HEADING = /职位描述|岗位职责|工作内容|工作职责|职位详情|岗位说明/;

/**
 * 按「职位描述」这类标题文字定位正文：平台改版时类名会变，标题文案通常不变。
 * 从标题往上找 3 层，取第一个比标题多出一大段文字的容器，再去掉标题本身。
 */
function extractByHeading() {
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, p, div"));
  const heading = headings.find((node) => {
    const text = textOf(node);
    return text.length > 0 && text.length <= 12 && DESC_HEADING.test(text);
  });
  if (!heading) return "";

  let container = heading.parentElement;
  for (let depth = 0; depth < 3 && container; depth += 1) {
    const text = textOf(container);
    if (text.length > textOf(heading).length + 80) {
      return text.replace(textOf(heading), "").trim();
    }
    container = container.parentElement;
  }
  return "";
}

// 链接文案是这些通用词时不能当公司名（BOSS 列表卡片上就有“公司”这种占位）
const GENERIC_COMPANY_LABELS =
  /^(公司|企业|公司主页|查看公司|更多|首页|全部|招聘|公司介绍|企业主页|查看详情|立即沟通)$/;

/** 公司名兜底：详情页里指向公司主页的链接文案通常就是公司全称。 */
function extractCompanyFromLink() {
  const anchors = Array.from(
    document.querySelectorAll(
      'a[href*="/companydetail/"], a[href*="/company/"], a[href*="/gongsi/"]',
    ),
  );
  for (const anchor of anchors) {
    const text = textOf(anchor).split("\n")[0].trim();
    if (text.length < 2 || text.length > 60) continue;
    if (GENERIC_COMPANY_LABELS.test(text)) continue;
    return text;
  }
  return "";
}

/**
 * 公司名校验：列表卡片的「职位名 + 薪资」很容易被当成公司名，
 * 这里挡掉换行、薪资、占位词这类明显不是公司全称的值。
 */
function isLikelyCompany(value) {
  const text = String(value || "").trim();
  if (text.length < 2 || text.length > 40) return false;
  if (text.includes("\n")) return false;
  if (/元\/天|元\/月|K\/月|薪|面议|\d+\s*人|急招/.test(text)) return false;
  if (GENERIC_COMPANY_LABELS.test(text)) return false;
  return true;
}

/** 公司名兜底：BOSS / 智联的标题里都带公司全称，格式「岗位招聘_公司名招聘-站点」。 */
function companyFromTitle() {
  const title = (document.title || "").trim();
  const parts = title
    .split(/[_|]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return "";
  const candidate = parts[1]
    .replace(/[-–—]\s*(BOSS直聘|智联招聘|前程无忧|猎聘|拉勾).*$/i, "")
    .replace(/招聘.*$/, "")
    .replace(/^[「【\[]+|[」】\]]+$/g, "")
    .trim();
  if (/^(BOSS直聘|智联招聘|前程无忧|猎聘|拉勾|51job|智联)$/i.test(candidate)) {
    return "";
  }
  return isLikelyCompany(candidate) ? candidate : "";
}

/** 逐个选择器试，命中且通过校验才算数。 */
function pickCompany(selectors, prefix) {
  for (const selector of selectors || []) {
    const value = textOf(document.querySelector(selector)).trim();
    if (isLikelyCompany(value)) return { value, source: `${prefix}:${selector}` };
  }
  return { value: "", source: "" };
}

/** 从标签页标题里取岗位名：「青口物流装卸招聘」_BOSS直聘 → 青口物流装卸 */
function roleFromTitle() {
  const title = (document.title || "").trim();
  if (!title) return "";
  const cleaned = title
    .replace(/[_\-|]\s*(BOSS直聘|拉勾|猎聘|智联招聘|前程无忧|zhipin|lagou|liepin).*$/i, "")
    .replace(/^[「【\[]+|[」】\]]+$/g, "")
    .replace(/招聘.*$/, "")
    .trim();
  return cleaned.length >= 2 && cleaned.length <= 40 ? cleaned : "";
}

/** 逐个选择器试，命中时返回值与来源，便于诊断「哪条规则起作用」。 */
function firstTextWithSource(selectors, prefix) {
  for (const selector of selectors || []) {
    const value = firstText([selector]);
    if (value) return { value, source: `${prefix}:${selector}` };
  }
  return { value: "", source: "" };
}

function extractWithTrace() {
  const host = location.hostname;
  const rule = SITE_RULES[host] || {};
  const structured = fromJsonLd();

  // JSON-LD 里的 JobPosting 是站点给搜索引擎准备的结构化数据，比手写选择器稳定：
  // 有就优先用，选择器退居兜底（猎聘、部分智联页面都带）。
  let company = { value: "", source: "" };
  let role = { value: "", source: "" };
  let jd = { value: "", source: "" };

  if (structured) {
    if (structured.company && isLikelyCompany(structured.company)) {
      company = { value: structured.company, source: "jsonld" };
    }
    if (structured.role) role = { value: structured.role, source: "jsonld" };
    if (structured.jd && structured.jd.length >= 40) {
      jd = { value: structured.jd, source: "jsonld" };
    }
  }

  if (!company.value) company = pickCompany(rule.company, "site");
  if (!role.value) role = firstTextWithSource(rule.role, "site");
  if (!jd.value) jd = firstTextWithSource(rule.jd, "site");

  if (!company.value) {
    const byTitle = companyFromTitle();
    if (byTitle) company = { value: byTitle, source: "fallback:title" };
  }
  if (!company.value) {
    const byClass = pickCompany(
      ['[class*="company-name"]', '[class*="companyName"]'],
      "fallback",
    );
    if (byClass.value) company = byClass;
  }
  if (!company.value) {
    const byLink = extractCompanyFromLink();
    company = { value: byLink, source: byLink ? "fallback:companyLink" : "" };
  }

  if (!role.value) {
    const meta = metaContent(["og:title", "twitter:title"]);
    if (meta) {
      role = { value: meta, source: "fallback:meta" };
    } else {
      const h1 = firstText(["h1"]);
      role = { value: h1, source: h1 ? "fallback:h1" : "" };
    }
  }
  if (!role.value) {
    const fromTitle = roleFromTitle();
    if (fromTitle) role = { value: fromTitle, source: "fallback:title" };
  }

  // 结构化内容太短时，用「按标题找正文」和正文区域兜底，避免只抓到一句职责标题。
  if (!jd.value || jd.value.length < 120) {
    const byHeading = extractByHeading();
    if (byHeading.length > (jd.value || "").length) {
      jd = { value: byHeading, source: "fallback:heading" };
    }
  }
  if (!jd.value || jd.value.length < 120) {
    const fallback = textOf(document.querySelector("article, main"));
    if (fallback.length > (jd.value || "").length) {
      jd = { value: fallback, source: "fallback:article" };
    }
  }

  return {
    lead: {
      company: clean(company.value).slice(0, 100),
      role: clean(role.value).slice(0, 100),
      // 智联等站点会在正文末尾插「登录查看完整内容」，清掉这行噪声
      jd: clean(jd.value)
        .replace(/登录(后)?查看完整内容/g, "")
        .trim()
        .slice(0, MAX_JD_CHARS),
      url: location.href,
    },
    trace: {
      host,
      hasRule: Boolean(SITE_RULES[host]),
      jsonLd: Boolean(structured),
      sources: { company: company.source, role: role.source, jd: jd.source },
    },
  };
}


/** 页面类型判断：一个页面出现多个职位标题时，通常还在列表页或列表弹层。 */
function pageKindInfo() {
  return {
    cardCount: document.querySelectorAll(".job-name, [class*='job-card']").length,
    isDetailUrl: /\/(job_detail|jobdetail|jobs?\/\d)/.test(location.pathname),
    title: document.title,
  };
}

/**
 * 诊断：不改变页面，只回报「哪条选择器命中、哪些候选存在」。
 * 用户在登录态下点一次，把结果贴回来即可按真实 DOM 精确修正。
 */
/** 诊断用：JSON-LD 里到底解析出了什么（只截断展示，不参与提取）。 */
function structuredPreview() {
  const structured = fromJsonLd();
  if (!structured) return null;
  return {
    company: structured.company,
    role: structured.role,
    jdLength: structured.jd.length,
  };
}

function diagnose() {
  const { lead, trace } = extractWithTrace();
  const rule = SITE_RULES[location.hostname] || {};
  const selectors = [
    ...(rule.role || []),
    ...(rule.company || []),
    ...(rule.jd || []),
    "h1",
    "article",
    "main",
  ].filter((value, index, list) => list.indexOf(value) === index);

  return {
    ok: true,
    url: location.href,
    trace: { ...trace, jsonLdValues: structuredPreview() },
    lead: {
      company: lead.company,
      role: lead.role,
      jdLength: lead.jd.length,
      jdPreview: lead.jd.slice(0, 60),
    },
    selectorHits: selectors.map((selector) => ({
      selector,
      count: document.querySelectorAll(selector).length,
    })),
    pageKind: pageKindInfo(),
    headings: Array.from(document.querySelectorAll("h1, h2"))
      .map((node) => textOf(node).slice(0, 24))
      .filter(Boolean)
      .slice(0, 10),
    textLength: document.body ? document.body.innerText.length : 0,
  };
}

/* ------------------------------ 表单填充 ------------------------------ */

const PROFILE_FIELDS = [
  { key: "name", label: "姓名", match: [/姓名/, /真实姓名/, /^name$/i, /名字/] },
  { key: "phone", label: "手机", match: [/手机/, /电话/, /phone/i, /mobile/i] },
  { key: "email", label: "邮箱", match: [/邮箱/, /邮件/, /e-?mail/i] },
  { key: "city", label: "城市", match: [/期望城市/, /所在城市/, /所在地/, /居住地/, /城市/] },
  { key: "role", label: "应聘岗位", match: [/应聘岗位/, /期望岗位/, /应聘职位/, /岗位/, /职位/] },
  { key: "summary", label: "自我介绍", match: [/自我介绍/, /个人简介/, /个人优势/, /个人评价/] },
];

// 这些字段即使标签匹配也不填：属于敏感信息，交给用户在平台上自己决定。
const SENSITIVE_HINTS = [
  /身份证/,
  /证件号/,
  /银行卡/,
  /密码/,
  /验证码/,
  /passport/i,
  /社保/,
];

function isFillable(element) {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    return false;
  }
  if (element.disabled || element.readOnly) return false;
  if (element instanceof HTMLInputElement) {
    const type = (element.type || "text").toLowerCase();
    if (!["text", "tel", "email", "search", "url", ""].includes(type)) return false;
  }
  const style = element.offsetParent !== null || element.getClientRects().length > 0;
  return style;
}

function hintOf(element) {
  const parts = [
    element.getAttribute("aria-label"),
    element.getAttribute("placeholder"),
    element.getAttribute("name"),
    element.id,
  ];
  const wrappingLabel = element.closest("label");
  if (wrappingLabel) parts.push(wrappingLabel.innerText);
  if (element.id) {
    try {
      const explicit = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (explicit) parts.push(explicit.innerText);
    } catch {
      // id 里有特殊字符时忽略
    }
  }
  const previous = element.parentElement && element.parentElement.previousElementSibling;
  if (previous) parts.push(previous.innerText);
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function findField(field, used) {
  const candidates = Array.from(document.querySelectorAll("input, textarea"));
  for (const element of candidates) {
    if (used.has(element) || !isFillable(element)) continue;
    if (element.value && element.value.trim()) continue; // 不覆盖用户已填内容
    const hint = hintOf(element);
    if (!hint) continue;
    if (SENSITIVE_HINTS.some((pattern) => pattern.test(hint))) continue;
    if (field.match.some((pattern) => pattern.test(hint))) return element;
  }
  return null;
}

function setNativeValue(element, value) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, value);
  // React / Vue 等框架依赖这些事件同步内部状态
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function highlight(element) {
  const previous = element.style.outline;
  element.style.outline = "2px solid #2563eb";
  element.style.outlineOffset = "1px";
  window.setTimeout(() => {
    element.style.outline = previous;
    element.style.outlineOffset = "";
  }, 2500);
}

function fillProfile(profile) {
  const used = new Set();
  const filled = [];
  const missing = [];

  for (const field of PROFILE_FIELDS) {
    const value = String(profile[field.key] || "").trim();
    if (!value) continue;
    const element = findField(field, used);
    if (!element) {
      missing.push(field.label);
      continue;
    }
    setNativeValue(element, value);
    highlight(element);
    used.add(element);
    filled.push(field.label);
  }

  if (filled.length === 0) {
    return {
      ok: false,
      error: "没有找到可填充的字段：确认当前页是投递表单，或手动粘贴",
      filled,
      missing,
    };
  }
  return { ok: true, filled, missing };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message) return false;

  if (message.type === "extract") {
    try {
      const { lead, trace } = extractWithTrace();
      sendResponse({ ok: true, lead, trace, pageKind: pageKindInfo() });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
    return false;
  }

  if (message.type === "diagnose") {
    try {
      sendResponse(diagnose());
    } catch (error) {
      sendResponse({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
    return false;
  }

  if (message.type === "fill") {
    try {
      sendResponse(fillProfile(message.profile || {}));
    } catch (error) {
      sendResponse({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
    return false;
  }

  return false;
});
