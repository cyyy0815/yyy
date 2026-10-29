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
    company: [
      ".company-info .name",
      ".job-banner .company-info a",
      ".company-name",
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
    company: [".company-name", ".company-info .name", ".company-box .name"],
    jd: [".job-intro-container", ".describtion", ".job-description"],
  },
  "www.zhaopin.com": {
    role: [".summary-plane__title", ".job-title", "h1"],
    company: [".company__title", ".company-name"],
    jd: [".descript__detail", ".job-detail", ".describtion"],
  },
  "sou.zhaopin.com": {
    role: [".summary-plane__title", ".job-title", "h1"],
    company: [".company__title", ".company-name"],
    jd: [".descript__detail", ".job-detail", ".describtion"],
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

function extract() {
  const rule = SITE_RULES[location.hostname] || {};
  const structured = fromJsonLd();

  let company = firstText(rule.company);
  let role = firstText(rule.role);
  let jd = firstText(rule.jd);

  if (structured) {
    company = company || structured.company;
    role = role || structured.role;
    jd = jd || structured.jd;
  }

  if (!company) {
    company = firstText(['[class*="company-name"]', '[class*="companyName"]']);
  }
  if (!role) {
    role = metaContent(["og:title", "twitter:title"]) || firstText(["h1"]);
  }

  // 结构化内容太短时，用正文区域兜底，避免只抓到一句职责标题。
  if (!jd || jd.length < 120) {
    const fallback = textOf(document.querySelector("article, main"));
    if (fallback.length > jd.length) jd = fallback;
  }

  return {
    company: clean(company).slice(0, 100),
    role: clean(role).slice(0, 100),
    jd: clean(jd).slice(0, MAX_JD_CHARS),
    url: location.href,
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
      sendResponse({ ok: true, lead: extract() });
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
