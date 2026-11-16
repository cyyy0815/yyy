/**
 * 招聘网站搜索结果页：采集「当前页已渲染的职位卡片」。
 *
 * 只读 DOM，不翻页、不自动滚动、不发起额外请求；用户点按钮才发到后台，
 * 再由后台转交给简历工坊页面。站点改版时优先改 SITE_RULES。
 */
(() => {
  const MAX_JOBS = 40;

  const SOURCE_BY_HOST = {
    "www.zhipin.com": "boss",
    "www.lagou.com": "lagou",
    "www.liepin.com": "liepin",
    "www.zhaopin.com": "zhaopin",
    "sou.zhaopin.com": "zhaopin",
    "we.51job.com": "51job",
    "jobs.51job.com": "51job",
  };

  const SITE_RULES = {
    "www.zhipin.com": {
      card: [".job-card-wrapper", ".job-card-box", ".job-list-box .job-card-wrapper"],
      role: [".job-name", ".job-title"],
      company: [".company-name", ".company-info .name"],
      city: [".job-area", ".job-city"],
      salary: [".salary", ".job-salary"],
      tags: [".tag-list li", ".job-card-footer .tag-list li", ".job-tags span"],
      link: ['a[href*="/job_detail/"]', "a[href]"],
    },
    "www.lagou.com": {
      card: [".positionListItem", ".item__10RTO", ".list_item"],
      role: [".positionLink", ".position-name", ".name"],
      company: [".companyName", ".company-name"],
      city: [".jobCity", ".city"],
      salary: [".salary"],
      tags: [".labels span", ".label"],
      link: ["a.positionLink", 'a[href*="/jobs/"]', "a[href]"],
    },
    "www.liepin.com": {
      card: [".job-list-item", ".job-card-pc-container", ".job-card"],
      role: [".job-title-box", ".job-title", ".name-box .name"],
      company: [".company-name", ".company-box .name"],
      city: [".job-dq-box", ".job-area", ".area"],
      salary: [".job-salary", ".salary"],
      tags: [".job-labels-box span", ".labels span", ".tag"],
      link: ['a[href*="/job/"]', "a[href]"],
    },
    "www.zhaopin.com": {
      card: [".joblist-box__item", ".job-list-box .item"],
      role: [".iteminfo__line1__jobname", ".jobname"],
      company: [".iteminfo__line1__compname", ".companyname"],
      city: [".iteminfo__line2__jobdesc", ".jobarea"],
      salary: [".iteminfo__line2__jobdesc__salary"],
      tags: [".iteminfo__line2__jobdesc span", ".tag"],
      link: ['a[href*="/jobdetail/"]', "a[href]"],
    },
    "sou.zhaopin.com": {
      card: [".joblist-box__item", ".job-list-box .item"],
      role: [".iteminfo__line1__jobname", ".jobname"],
      company: [".iteminfo__line1__compname", ".companyname"],
      city: [".iteminfo__line2__jobdesc", ".jobarea"],
      salary: [".iteminfo__line2__jobdesc__salary"],
      tags: [".iteminfo__line2__jobdesc span", ".tag"],
      link: ['a[href*="/jobdetail/"]', "a[href]"],
    },
    "we.51job.com": {
      card: [".j_joblist .e", ".joblist .e", ".j_joblist .el"],
      role: [".jname", ".job-name"],
      company: [".cname", ".company-name"],
      city: [".d", ".area"],
      salary: [".sal", ".salary"],
      tags: [".tags span", ".tag"],
      link: ['a[href*="/job/"]', "a[href]"],
    },
    "jobs.51job.com": {
      card: [".j_joblist .e", ".joblist .e"],
      role: [".jname", ".job-name"],
      company: [".cname", ".company-name"],
      city: [".d", ".area"],
      salary: [".sal", ".salary"],
      tags: [".tags span", ".tag"],
      link: ['a[href*="/job/"]', "a[href]"],
    },
  };

  const host = location.hostname;
  const source = SOURCE_BY_HOST[host] || "other";
  const rules = SITE_RULES[host];
  if (!rules) return;

  // 详情页也有「相似职位」卡片，避免在详情页误显示采集按钮。
  const DETAIL_PATHS = {
    "www.zhipin.com": /\/job_detail\//,
    "www.lagou.com": /\/jobs\/\d+\.html/,
    "www.liepin.com": /\/job\/\d+\.shtml/,
    "www.zhaopin.com": /\/jobdetail\//,
    "sou.zhaopin.com": /\/jobdetail\//,
    "we.51job.com": /\/job\//,
    "jobs.51job.com": /\/job\//,
  };
  if (DETAIL_PATHS[host]?.test(location.pathname)) return;

  function textOf(node) {
    return node ? (node.innerText || node.textContent || "").trim() : "";
  }

  function clean(value, max = 100) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);
  }

  function firstText(root, selectors, max) {
    if (!Array.isArray(selectors)) return "";
    for (const selector of selectors) {
      try {
        const value = textOf(root.querySelector(selector));
        if (value) return clean(value, max);
      } catch {
        // 选择器写错不影响其他候选
      }
    }
    return "";
  }

  function firstHref(root, selectors) {
    for (const selector of selectors) {
      try {
        const link = root.querySelector(selector);
        if (!link || !link.href) continue;
        const url = new URL(link.href, location.href);
        if (url.protocol === "http:" || url.protocol === "https:") return url.href;
      } catch {
        // ignore
      }
    }
    return "";
  }

  function extractJobs() {
    const cards = [];
    for (const selector of rules.card) {
      try {
        for (const node of document.querySelectorAll(selector)) {
          if (!cards.includes(node)) cards.push(node);
        }
      } catch {
        // ignore
      }
    }

    const jobs = [];
    const seen = new Set();
    for (const card of cards.slice(0, MAX_JOBS)) {
      const rect = card.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const role = firstText(card, rules.role, 100);
      const company = firstText(card, rules.company, 100);
      const url = firstHref(card, rules.link);
      if (!role && !company && !url) continue;

      const city = firstText(card, rules.city, 50);
      const salary = firstText(card, rules.salary, 50);
      const tags = [];
      for (const selector of rules.tags) {
        try {
          for (const node of card.querySelectorAll(selector)) {
            const tag = clean(textOf(node), 30);
            if (tag && !tags.includes(tag)) tags.push(tag);
            if (tags.length >= 8) break;
          }
        } catch {
          // ignore
        }
        if (tags.length >= 8) break;
      }

      const key = url || `${company}|${role}|${city}`;
      if (seen.has(key)) continue;
      seen.add(key);

      jobs.push({
        company,
        role,
        city,
        salary,
        tags,
        url,
        source,
        jdPreview: tags.join(" ").slice(0, 2000),
      });
      if (jobs.length >= MAX_JOBS) break;
    }
    return jobs;
  }

  function sendJobs() {
    const jobs = extractJobs();
    if (jobs.length === 0) {
      return Promise.resolve({ ok: false, error: "当前页没有识别到职位卡片" });
    }
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "send-job-list", jobs }, (response) => {
        const error = chrome.runtime.lastError;
        resolve(
          error
            ? { ok: false, error: "扩展后台未响应，请重新加载扩展" }
            : response || { ok: false, error: "发送失败" },
        );
      });
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "collect-list") {
      sendJobs().then(sendResponse);
      return true;
    }
    if (message?.type === "collect-preview") {
      sendResponse({ ok: true, count: extractJobs().length });
      return false;
    }
    return false;
  });

  // 浮动按钮：只在识别到卡片时出现，随 DOM 变化更新数量。
  let button = null;
  let timer = 0;

  function ensureButton() {
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.setAttribute("data-resume-workshop-collect", "true");
      button.style.cssText = [
        "position:fixed",
        "right:20px",
        "bottom:20px",
        "z-index:2147483000",
        "border:0",
        "border-radius:999px",
        "padding:10px 16px",
        "background:#18181b",
        "color:#fff",
        "font:500 12.5px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif",
        "box-shadow:0 10px 24px -8px rgba(0,0,0,.45)",
        "cursor:pointer",
      ].join(";");
      button.addEventListener("click", async () => {
        const original = button.textContent;
        button.disabled = true;
        button.textContent = "发送中…";
        const result = await sendJobs();
        button.disabled = false;
        button.textContent = result.ok
          ? `已发送 ${result.count ?? ""} 个岗位`
          : result.error || "发送失败";
        window.setTimeout(() => {
          if (button) button.textContent = original;
          updateButton();
        }, 2200);
      });
      document.body.appendChild(button);
    }

    const count = extractJobs().length;
    button.style.display = count > 0 ? "block" : "none";
    if (count > 0 && !button.disabled) {
      button.textContent = `采集本页职位（${count}）`;
    }
  }

  function updateButton() {
    window.clearTimeout(timer);
    timer = window.setTimeout(ensureButton, 600);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureButton, { once: true });
  } else {
    ensureButton();
  }

  const observer = new MutationObserver(updateButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
