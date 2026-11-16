/**
 * 生成「采集本页职位」书签。
 *
 * 书签在招聘站页面执行，读取当前页已渲染的卡片，然后打开简历工坊并
 * 跨窗口 postMessage。这里用一个自包含函数 + toString() 生成代码，
 * 避免维护一长串手写字符串；函数内不能引用模块外的变量。
 */
function bookmarkletMain(appOrigin: string) {
  try {
    const host = location.hostname;
    const sourceByHost: Record<string, string> = {
      "www.zhipin.com": "boss",
      "www.lagou.com": "lagou",
      "www.liepin.com": "liepin",
      "www.zhaopin.com": "zhaopin",
      "sou.zhaopin.com": "zhaopin",
      "we.51job.com": "51job",
      "jobs.51job.com": "51job",
    };

    type Rule = {
      card: string[];
      role: string[];
      company: string[];
      city: string[];
      salary: string[];
      tags: string[];
      link: string[];
    };

    const rulesByHost: Record<string, Rule> = {
      "www.zhipin.com": {
        card: [".job-card-wrapper", ".job-card-box", ".job-list-box .job-card-wrapper"],
        role: [".job-name", ".job-title"],
        company: [
          ".company-name",
          ".company-info .name",
          ".company-info a",
          ".job-card-footer .company-name",
          'a[href*="/gongsi/"]',
          "[class*='company-name']",
          "[class*='companyName']",
        ],
        city: [
          ".job-area",
          ".job-city",
          ".job-area-wrapper",
          "[class*='job-area']",
          "[data-city]",
        ],
        salary: [
          ".salary",
          ".job-pay",
          ".job-salary",
          "[class*='salary']",
          "[class*='pay']",
          "[data-salary]",
        ],
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

    const rule = rulesByHost[host];
    if (!rule) {
      alert("当前站点不在支持列表里。请到 BOSS / 拉勾 / 猎聘 / 智联 / 前程无忧的搜索结果页使用。");
      return;
    }

    const detailPaths: Record<string, RegExp> = {
      "www.zhipin.com": /\/job_detail\//,
      "www.lagou.com": /\/jobs\/\d+\.html/,
      "www.liepin.com": /\/job\/\d+\.shtml/,
      "www.zhaopin.com": /\/jobdetail\//,
      "sou.zhaopin.com": /\/jobdetail\//,
      "we.51job.com": /\/job\//,
      "jobs.51job.com": /\/job\//,
    };
    if (detailPaths[host] && detailPaths[host].test(location.pathname)) {
      alert("这是职位详情页。采集一页职位请回到搜索结果页再点书签。");
      return;
    }

    function textOf(node: Element | null): string {
      if (!node) return "";
      return ((node as HTMLElement).innerText || node.textContent || "").trim();
    }

    function clean(value: string, max: number): string {
      return String(value || "")
        // BOSS 把薪资数字映射到 U+E031..U+E03A：减去 0xE001 就是 0..9。
        .replace(/[\uE031-\uE03A]/g, function (char) {
          return String.fromCharCode(char.charCodeAt(0) - 0xe001);
        })
        // 其余私有区字形没有可靠映射，清掉避免显示方框。
        .replace(/[\uE000-\uF8FF]/g, "")
        .replace(/[□�]/g, "")
        .replace(/\s+/g, " ")
        .replace(/^[\s\-–—·|/]+|[\s\-–—·|/]+$/g, "")
        .trim()
        .slice(0, max);
    }

    function firstText(root: Element, selectors: string[], max: number): string {
      for (let i = 0; i < selectors.length; i += 1) {
        try {
          const value = textOf(root.querySelector(selectors[i]));
          const cleaned = clean(value, max);
          if (cleaned) return cleaned;
        } catch (error) {
          // 某个候选选择器写错时继续尝试下一个
        }
      }
      return "";
    }

    function firstHref(root: Element, selectors: string[]): string {
      for (let i = 0; i < selectors.length; i += 1) {
        try {
          const link = root.querySelector(selectors[i]) as HTMLAnchorElement | null;
          if (!link || !link.getAttribute("href")) continue;
          const url = new URL(link.getAttribute("href") || "", location.href);
          if (url.protocol === "http:" || url.protocol === "https:") return url.href;
        } catch (error) {
          // 继续尝试下一个
        }
      }
      return "";
    }

    function firstAttr(
      root: Element,
      selectors: string[],
      attributes: string[],
      max: number,
    ): string {
      for (let i = 0; i < selectors.length; i += 1) {
        try {
          const node = root.querySelector(selectors[i]);
          if (!node) continue;
          for (let a = 0; a < attributes.length; a += 1) {
            const value = clean(node.getAttribute(attributes[a]) || "", max);
            if (value) return value;
          }
        } catch (error) {
          // ignore
        }
      }
      return "";
    }

    function firstAlt(root: Element, selectors: string[], max: number): string {
      for (let i = 0; i < selectors.length; i += 1) {
        try {
          const node = root.querySelector(selectors[i]);
          const alt = clean(node?.getAttribute("alt") || "", max);
          if (alt && !/logo|icon|头像/i.test(alt)) return alt;
        } catch (error) {
          // ignore
        }
      }
      return "";
    }

    const cards: Element[] = [];
    for (let c = 0; c < rule.card.length; c += 1) {
      try {
        const found = document.querySelectorAll(rule.card[c]);
        for (let f = 0; f < found.length; f += 1) {
          if (cards.indexOf(found[f]) < 0) cards.push(found[f]);
        }
      } catch (error) {
        // ignore
      }
    }

    const jobs: Array<{
      company: string;
      role: string;
      city: string;
      salary: string;
      tags: string[];
      url: string;
      source: string;
      jdPreview: string;
    }> = [];
    const seen: Record<string, boolean> = {};

    for (let i = 0; i < cards.length && jobs.length < 40; i += 1) {
      const card = cards[i];
      const rect = card.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const role = firstText(card, rule.role, 100);
      let company = firstText(card, rule.company, 100);
      if (!company) {
        company = firstAttr(
          card,
          ["[data-company]", "[data-company-name]", "[data-brand]"],
          ["data-company", "data-company-name", "data-brand"],
          100,
        );
      }
      if (!company) company = firstAlt(card, ["img[alt]"], 100);
      const url = firstHref(card, rule.link);
      if (!role && !company && !url) continue;

      let city = firstText(card, rule.city, 50);
      if (!city) {
        city = firstAttr(card, ["[data-city]"], ["data-city"], 50);
      }
      if (!/[\u4e00-\u9fa5A-Za-z]/.test(city)) city = "";
      let salary = firstText(card, rule.salary, 50);
      if (!salary) {
        salary = firstAttr(
          card,
          ["[data-salary]", "[data-pay]", ".salary", ".job-pay"],
          ["data-salary", "data-pay"],
          50,
        );
      }
      // 如果薪资候选里仍有未映射的混淆字符，再从卡片纯文本里找一次。
      if (!salary || !/[0-9]/.test(salary)) {
        const plain = clean(textOf(card), 5000);
        const match = plain.match(
          /\d{1,3}(?:\.\d+)?\s*[-~至]\s*\d{1,3}(?:\.\d+)?\s*[Kk万]/,
        );
        if (match) salary = clean(match[0], 50);
      }
      // 混淆字形被清掉后可能只剩 "K" / "-K"，没有数字就不要展示。
      if (!/[0-9]/.test(salary)) salary = "";
      const tags: string[] = [];
      for (let t = 0; t < rule.tags.length; t += 1) {
        try {
          const tagNodes = card.querySelectorAll(rule.tags[t]);
          for (let n = 0; n < tagNodes.length; n += 1) {
            const tag = clean(textOf(tagNodes[n]), 30);
            if (tag && tags.indexOf(tag) < 0) tags.push(tag);
            if (tags.length >= 8) break;
          }
        } catch (error) {
          // ignore
        }
        if (tags.length >= 8) break;
      }

      let key = "";
      if (url) {
        try {
          const parsed = new URL(url);
          key = parsed.hostname + parsed.pathname.replace(/\/+$/, "");
        } catch (error) {
          key = url;
        }
      } else {
        key = company + "|" + role + "|" + city;
      }
      if (seen[key]) continue;
      seen[key] = true;

      jobs.push({
        company: company,
        role: role,
        city: city,
        salary: salary,
        tags: tags,
        url: url,
        source: sourceByHost[host] || "other",
        jdPreview: tags.join(" ").slice(0, 2000),
      });
    }

    if (jobs.length === 0) {
      alert("当前页没有识别到职位卡片。请确认在搜索结果页，并且职位列表已经加载出来。");
      return;
    }

    const payload = JSON.stringify({ jobs: jobs });

    function fallbackCopy(text: string): boolean {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (error) {
        ok = false;
      }
      area.remove();
      return ok;
    }

    function copyText(text: string): Promise<boolean> {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text).then(
            function () {
              return true;
            },
            function () {
              return fallbackCopy(text);
            },
          );
        }
      } catch (error) {
        // ignore
      }
      return Promise.resolve(fallbackCopy(text));
    }

    function showToast(message: string) {
      const toast = document.createElement("div");
      toast.textContent = message;
      toast.style.cssText = [
        "position:fixed",
        "left:50%",
        "bottom:24px",
        "transform:translateX(-50%)",
        "z-index:2147483000",
        "max-width:min(92vw,520px)",
        "padding:12px 16px",
        "border-radius:12px",
        "background:#18181b",
        "color:#fff",
        "font:500 13px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif",
        "box-shadow:0 12px 30px -10px rgba(0,0,0,.5)",
      ].join(";");
      document.body.appendChild(toast);
      window.setTimeout(function () {
        toast.remove();
      }, 9000);
    }

    copyText(payload).then(function (ok) {
      if (ok) {
        showToast(
          "已复制 " +
            jobs.length +
            " 个岗位。回到简历工坊（" +
            appOrigin +
            "）→ 职位推荐 → 点「粘贴采集结果」。",
        );
      } else {
        window.prompt(
          "复制失败：请按 Ctrl+C 复制下面的内容，再回到简历工坊点「粘贴采集结果」。",
          payload,
        );
      }
    });
  } catch (error) {
    alert("采集失败：" + String(error));
  }
}

/** 生成可直接拖到书签栏的 javascript: 书签。 */
export function buildBookmarklet(appOrigin: string): string {
  const origin = appOrigin.replace(/\/+$/, "");
  const code = bookmarkletMain.toString().replace(/\s+/g, " ");
  return `javascript:(${code})(${JSON.stringify(origin)})`;
}
