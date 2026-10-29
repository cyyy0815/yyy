import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
const BASE = process.env.QA_BASE ?? "http://localhost:3000";

if (!CHROME) {
  console.error(
    "未找到 Chrome。请安装 Chrome，或通过 CHROME_PATH 指定可执行文件。",
  );
  process.exit(1);
}
const OUT = path.join(process.cwd(), ".screenshots");
const failures = [];

mkdirSync(OUT, { recursive: true });

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function expect(label, condition, detail = "") {
  if (condition) {
    console.log(`qa-check: ${label} ok`);
    return;
  }
  const message = `qa-check: ${label} FAILED${detail ? ` (${detail})` : ""}`;
  console.error(message);
  failures.push(message);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

async function open({ width = 1440, height = 1000, mobile = false } = {}) {
  const page = await browser.newPage();
  page.qaErrors = [];
  page.on("pageerror", (error) => {
    page.qaErrors.push(`PAGE ERROR: ${error.message}`);
    console.log("PAGE ERROR:", error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      page.qaErrors.push(`CONSOLE ERROR: ${message.text()}`);
      console.log("CONSOLE ERROR:", message.text());
    }
  });
  await page.setViewport({
    width,
    height,
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
  });
  return page;
}

/** 按可见标签写入值并失焦，用于触发格式校验提示。 */
async function setFieldByLabel(page, labelText, value, index = 0) {
  return page.evaluate(
    ({ label, nextValue, labelIndex }) => {
      const labels = [...document.querySelectorAll("label")].filter(
        (node) =>
          node.querySelector("span span")?.textContent?.trim() === label,
      );
      const target = labels[labelIndex];
      const input = target?.querySelector("input, textarea");
      if (!input) return false;
      const proto =
        input instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(
        input,
        nextValue,
      );
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
      input.blur();
      return true;
    },
    { label: labelText, nextValue: value, labelIndex: index },
  );
}

async function labelText(page, labelText, index = 0) {
  return page.evaluate(
    ({ label, labelIndex }) => {
      const labels = [...document.querySelectorAll("label")].filter(
        (node) =>
          node.querySelector("span span")?.textContent?.trim() === label,
      );
      return labels[labelIndex]?.textContent?.trim() ?? "";
    },
    { label: labelText, labelIndex: index },
  );
}

async function clickText(page, text, scope = "body") {
  const found = await page.evaluate(
    ({ label, root }) => {
      const container = document.querySelector(root) ?? document;
      const button = [...container.querySelectorAll("button")].find(
        (item) => item.textContent?.trim() === label,
      );
      if (!button) return false;
      button.click();
      return true;
    },
    { label: text, root: scope },
  );
  if (!found) throw new Error(`button not found: ${text}`);
}

/** 按 data-qa 写入输入框 / 文本域，触发 React 的 onChange。 */
async function setQaValue(page, selector, value) {
  return page.evaluate(
    ({ target, nextValue }) => {
      const element = document.querySelector(target);
      if (!element) return false;
      const proto =
        element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(
        element,
        nextValue,
      );
      element.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    },
    { target: selector, nextValue: value },
  );
}

/** 按选项文案切换 select，触发 React 的 onChange。 */
async function selectByOptionText(page, optionText, scope = "body") {
  const found = await page.evaluate(
    ({ label, root }) => {
      const container = document.querySelector(root) ?? document;
      const select = [...container.querySelectorAll("select")].find((item) =>
        [...item.options].some((option) =>
          option.textContent?.includes(label),
        ),
      );
      if (!select) return false;
      const option = [...select.options].find((item) =>
        item.textContent?.includes(label),
      );
      if (!option) return false;
      Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      )?.set?.call(select, option.value);
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    { label: optionText, root: scope },
  );
  if (!found) throw new Error(`select option not found: ${optionText}`);
}

/** 按板块序号填写自定义条目，触发表单的 React onChange。 */
async function fillCustomItem(page, sectionIndex, values) {
  return page.evaluate(
    ({ index, fields }) => {
      const section = document.querySelectorAll(
        '[data-custom-section="true"]',
      )[index];
      const item = section?.querySelector('[data-custom-item="true"]');
      if (!section || !item) return false;
      const labels = [...item.querySelectorAll("label")];
      const set = (labelText, value) => {
        const label = labels.find((node) =>
          node.querySelector("span")?.textContent?.includes(labelText),
        );
        const input = label?.querySelector("input, textarea");
        if (!input) return false;
        const proto =
          input instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(
          input,
          value,
        );
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      };
      return (
        set("名称", fields.name) &&
        set("机构 / 角色", fields.subtitle) &&
        set("时间", fields.date) &&
        set("链接", fields.link) &&
        set("补充说明", fields.description)
      );
    },
    { index: sectionIndex, fields: values },
  );
}

/** 拦截 AI 接口，用固定 SSE 验证前端闭环，不消耗真实额度。 */
async function interceptAi(
  page,
  { configured = true, text = "", fullText = text } = {},
) {
  page.aiPayloads = [];
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/api/ai/status")) {
      void request.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ configured, model: "mock" }),
      });
      return;
    }
    if (url.includes("/api/ai/generate") || url.includes("/api/ai/full")) {
      let payload = {};
      try {
        payload = JSON.parse(request.postData() ?? "{}");
      } catch {
        // 保持空对象，按默认文本返回。
      }
      page.aiPayloads.push(payload);
      const source = url.includes("/api/ai/full") ? fullText : text;
      const resolved = typeof source === "function" ? source(payload) : source;
      const split = Math.max(1, Math.floor(resolved.length / 2));
      const body = [
        { event: "delta", data: { text: resolved.slice(0, split) } },
        { event: "delta", data: { text: resolved.slice(split) } },
        {
          event: "done",
          data: {
            usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
          },
        },
      ]
        .map(({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        .join("");
      void request.respond({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
        body,
      });
      return;
    }
    void request.continue();
  });
}

async function checkOverflow(page, label) {
  const result = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  console.log(
    `${label}: viewport=${result.viewport} scrollWidth=${result.scrollWidth} ${
      result.scrollWidth > result.viewport ? "⚠ OVERFLOW" : "ok"
    }`,
  );
}

async function shot(name, options = {}) {
  const page = await open(options);
  if (options.template) {
    await page.goto(BASE, { waitUntil: "networkidle0" });
    await page.evaluate(
      (template) =>
        localStorage.setItem("resume-workshop:template", template),
      options.template,
    );
  }
  await page.goto(options.url ?? BASE, { waitUntil: "networkidle0" });
  await new Promise((resolve) => setTimeout(resolve, 900));
  await checkOverflow(page, name);
  const paperPages = await page.evaluate(() => {
    const paper = document.querySelector(".resume-paper");
    return paper ? paper.scrollHeight / 1123 : 0;
  });
  if (paperPages > 0) {
    console.log(`${name}: paper pages≈${paperPages.toFixed(2)}`);
  }
  await page.screenshot({
    path: `${OUT}/${name}.png`,
    fullPage: Boolean(options.fullPage),
  });
  await page.close();
}

await shot("qa-desktop", { width: 1440, height: 1000 });
await shot("qa-mobile", {
  width: 390,
  height: 844,
  mobile: true,
  fullPage: true,
});
await shot("qa-template-classic", {
  width: 1440,
  height: 1100,
  template: "classic",
});
await shot("qa-template-compact", {
  width: 1440,
  height: 1100,
  template: "compact",
});
await shot("qa-template-sidebar", {
  width: 1440,
  height: 1200,
  template: "sidebar",
});
await shot("qa-template-timeline", {
  width: 1440,
  height: 1200,
  template: "timeline",
});
await shot("qa-template-minimal", {
  width: 1440,
  height: 1100,
  template: "minimal",
});
await shot("qa-template-academic", {
  width: 1440,
  height: 1100,
  template: "academic",
});
await shot("qa-template-card", {
  width: 1440,
  height: 1100,
  template: "card",
});
await shot("qa-jobs-mobile", {
  url: `${BASE}/#jobs`,
  width: 390,
  height: 844,
  mobile: true,
  fullPage: true,
});

// 手机端必须有导入入口，且头部不能把页面撑宽
const mobileImportPage = await open({
  width: 390,
  height: 844,
  mobile: true,
});
await mobileImportPage.goto(BASE, { waitUntil: "networkidle0" });
await pause(500);
const mobileImport = await mobileImportPage.evaluate(() => {
  const button = [...document.querySelectorAll("button")].find(
    (item) => item.textContent?.trim() === "导入",
  );
  return {
    visible: Boolean(button?.offsetParent),
    viewport: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
  };
});
expect(
  "手机端有导入入口且无横向溢出",
  mobileImport.visible && mobileImport.pageWidth <= mobileImport.viewport,
  JSON.stringify(mobileImport),
);
await mobileImportPage.close();

// JD 匹配：填入一段真实JD并检查结果
const jdPage = await open({ width: 1440, height: 1000 });
await jdPage.goto(`${BASE}/#jobs`, { waitUntil: "networkidle0" });
await new Promise((resolve) => setTimeout(resolve, 900));
await jdPage.type(
  "textarea",
  "岗位职责：负责 Web 前端开发，使用 React、TypeScript 构建页面。\n" +
    "任职要求：3年以上经验，本科及以上学历，熟悉 HTML、CSS、JavaScript、Vue、Webpack、Vite。",
);
await jdPage.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((button) => button.innerText.trim() === "分析匹配度")
    ?.click();
});
await new Promise((resolve) => setTimeout(resolve, 700));
const jdSummary = await jdPage.evaluate(() => {
  const text = document.body.innerText;
  return (text.match(/JD 关键词[^\n]*/) ?? [])[0] ?? "no result";
});
console.log("qa-jd:", jdSummary);
const jdSection = await jdPage.$('[data-qa="jd-matcher"]');
if (jdSection) {
  await jdSection.screenshot({ path: `${OUT}/qa-jd-match.png` });
}
await jdPage.close();

// AI 写简历：拦截 status / generate，验证弹窗、采用、撤销与未配置状态
const AI_TEXT =
  "4 年前端开发经验，专注 React 技术栈与性能优化。主导中后台平台重构，首屏加载时间降低 40%。";
const aiPage = await open({ width: 1440, height: 1000 });
await interceptAi(aiPage, { text: AI_TEXT });
await aiPage.goto(BASE, { waitUntil: "networkidle0" });
await pause(500);
const summaryBefore = await aiPage.evaluate(() => {
  const label = [...document.querySelectorAll("label")].find((node) =>
    node.textContent?.includes("个人简介"),
  );
  return label?.querySelector("textarea")?.value ?? "";
});
await aiPage.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((button) => button.textContent?.includes("开始生成"))
    ?.click();
});
await aiPage.waitForSelector('[role="dialog"] textarea', { timeout: 15000 });
await aiPage.$eval('[role="dialog"] textarea', (element) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  setter?.call(element, "中后台平台重构；首屏性能提升 40%");
  element.dispatchEvent(new Event("input", { bubbles: true }));
});
await aiPage.waitForFunction(
  () => {
    const dialog = document.querySelector('[role="dialog"]');
    const generate = [...(dialog?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent?.trim() === "生成",
    );
    return Boolean(generate && !generate.disabled);
  },
  { timeout: 15000 },
);
await clickText(aiPage, "生成", '[role="dialog"]');
await aiPage.waitForSelector('[aria-label="生成预览，可直接修改"]', {
  timeout: 15000,
});
const aiPreview = await aiPage.$eval(
  '[aria-label="生成预览，可直接修改"]',
  (element) => element.value,
);
expect("预览与 mock 文本一致", aiPreview === AI_TEXT, aiPreview);
const aiDialog = await aiPage.$('[role="dialog"]');
if (aiDialog) {
  await aiDialog.screenshot({ path: `${OUT}/qa-ai-dialog.png` });
}

// 事实核对：追加素材之外的技能/数字应实时提示，随后还原预览再采用
await aiPage.waitForSelector('[data-qa="fact-check"]', { timeout: 5000 });
await aiPage.$eval('[aria-label="生成预览，可直接修改"]', (element) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  setter?.call(element, `${element.value}\n使用 Kubernetes 将吞吐量提升 99%。`);
  element.dispatchEvent(new Event("input", { bubbles: true }));
});
await aiPage.waitForFunction(
  () => {
    const panel = document.querySelector('[data-qa="fact-check"]');
    const text = panel?.textContent ?? "";
    return (
      Number(panel?.getAttribute("data-warning-count") ?? 0) >= 2 &&
      text.includes("Kubernetes") &&
      text.includes("99%")
    );
  },
  { timeout: 5000 },
);
const aiFact = await aiPage.$eval('[data-qa="fact-check"]', (element) => ({
  count: Number(element.getAttribute("data-warning-count")),
  text: element.textContent ?? "",
}));
expect(
  "单段事实核对实时标出素材之外的技能与数字",
  aiFact.count >= 2 &&
    aiFact.text.includes("Kubernetes") &&
    aiFact.text.includes("99%"),
  JSON.stringify(aiFact),
);
await aiPage.$eval(
  '[aria-label="生成预览，可直接修改"]',
  (element, text) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    setter?.call(element, text);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  },
  AI_TEXT,
);
await aiPage.waitForFunction(
  (text) =>
    document.querySelector('[aria-label="生成预览，可直接修改"]')?.value ===
    text,
  { timeout: 5000 },
  AI_TEXT,
);

await clickText(aiPage, "采用到简历", '[role="dialog"]');
await pause(300);
const confirmState = await aiPage.evaluate(() => {
  const button = [...document.querySelectorAll('[role="dialog"] button')].find(
    (node) => node.textContent?.trim() === "确认覆盖",
  );
  if (!button) return { shown: false, visible: false };
  const rect = button.getBoundingClientRect();
  return {
    shown: true,
    visible:
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth,
  };
});
const confirmShown = confirmState.shown;
expect(
  "覆盖非空简介需确认",
  summaryBefore.trim() === "" || confirmShown,
  JSON.stringify({ summaryBefore, confirmShown }),
);
expect(
  "覆盖确认按钮无需滚动即可看到",
  summaryBefore.trim() === "" || confirmState.visible,
  JSON.stringify(confirmState),
);
if (confirmShown) {
  await clickText(aiPage, "确认覆盖", '[role="dialog"]');
}
await aiPage.waitForFunction(() => !document.querySelector('[role="dialog"]'));
await pause(1300);
const summaryAfterAdopt = await aiPage.evaluate((key) => {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw).basic.summary : null;
}, "resume-workshop:v1");
expect(
  "采用写入 localStorage",
  summaryAfterAdopt === AI_TEXT,
  String(summaryAfterAdopt),
);

await clickText(aiPage, "撤销");
await pause(1300);
const summaryAfterUndo = await aiPage.evaluate((key) => {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw).basic.summary : null;
}, "resume-workshop:v1");
expect(
  "撤销恢复原文",
  summaryAfterUndo === summaryBefore,
  `${summaryAfterUndo} vs ${summaryBefore}`,
);

await aiPage.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((button) => button.textContent?.includes("开始生成"))
    ?.click();
});
await aiPage.waitForSelector('[role="dialog"]');
const aiReopened = await aiPage.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return { cleared: false, disabled: false };
  const adopt = [...dialog.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === "采用到简历",
  );
  return {
    cleared: !dialog.querySelector('[aria-label="生成预览，可直接修改"]'),
    disabled: Boolean(adopt?.disabled),
  };
});
expect(
  "重开后不残留预览",
  aiReopened.cleared && aiReopened.disabled,
  JSON.stringify(aiReopened),
);
await clickText(aiPage, "取消", '[role="dialog"]');
expect(
  "AI 桌面无控制台错误",
  aiPage.qaErrors.length === 0,
  aiPage.qaErrors.join(" | "),
);
await aiPage.close();

// AI 参考 JD + 优化模式：读取 JD 匹配页内容，允许只传现有文本
const AI_JD =
  "岗位职责：负责 B 端产品规划与需求分析，推动跨团队协作。\n任职要求：3 年以上产品经验，熟悉 PRD、数据分析与项目管理。";
const aiJdPage = await open({ width: 1440, height: 1000 });
const aiJdBodies = [];
await interceptAi(aiJdPage, { text: "优化后的产品经理简介：3 年 B 端产品经验，主导需求分析与跨团队协作。" });
aiJdPage.on("request", (request) => {
  if (!request.url().includes("/api/ai/generate")) return;
  try {
    aiJdBodies.push(JSON.parse(request.postData() ?? "{}"));
  } catch {
    // ignore
  }
});
await aiJdPage.goto(BASE, { waitUntil: "networkidle0" });
await aiJdPage.evaluate(({ jd }) => {
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: {
        name: "林一",
        headline: "产品经理",
        summary: "5 年 B 端产品经验，负责客服工单系统。",
      },
      intent: { targetRole: "产品经理", experience: "3-5年" },
      educations: [],
      experiences: [],
      projects: [],
      skills: ["需求分析"],
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.setItem("resume-workshop:jd", jd);
}, { jd: AI_JD });
await aiJdPage.reload({ waitUntil: "networkidle0" });
await pause(500);
await aiJdPage.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((button) => button.textContent?.includes("开始生成"))
    ?.click();
});
await aiJdPage.waitForSelector('[data-qa="ai-jd"]', { timeout: 15000 });
const jdPrefill = await aiJdPage.$eval(
  '[data-qa="ai-jd"]',
  (element) => element.value,
);
expect("AI 自动读取 JD 匹配页内容", jdPrefill === AI_JD, jdPrefill.slice(0, 40));

await selectByOptionText(aiJdPage, "优化现有个人简介", '[role="dialog"]');
await setQaValue(aiJdPage, '[data-qa="ai-keywords"]', "");
await pause(200);
const polishReady = await aiJdPage.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  const generate = [...(dialog?.querySelectorAll("button") ?? [])].find(
    (button) => button.textContent?.trim() === "生成",
  );
  return Boolean(generate && !generate.disabled);
});
expect("优化模式不填关键词也可生成", polishReady);
await clickText(aiJdPage, "生成", '[role="dialog"]');
await aiJdPage.waitForSelector('[aria-label="生成预览，可直接修改"]', {
  timeout: 15000,
});
await pause(300);
const aiJdRequest = aiJdBodies.at(-1) ?? {};
expect(
  "AI 请求携带 JD 且优化模式可为空关键词",
  aiJdRequest.mode === "polish" &&
    aiJdRequest.keywords === "" &&
    aiJdRequest.jd === AI_JD &&
    String(aiJdRequest.current ?? "").includes("5 年 B 端产品经验"),
  JSON.stringify({
    mode: aiJdRequest.mode,
    keywords: aiJdRequest.keywords,
    jd: String(aiJdRequest.jd ?? "").slice(0, 20),
    current: String(aiJdRequest.current ?? "").slice(0, 20),
  }),
);
expect(
  "AI 参考 JD 页面无控制台错误",
  aiJdPage.qaErrors.length === 0,
  aiJdPage.qaErrors.join(" | "),
);
await aiJdPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.removeItem("resume-workshop:jd");
});
await aiJdPage.close();

// AI 整份简历：一段自述 -> 结构化整份 -> 新建一份简历（旧简历保留）
const FULL_RESUME_JSON = {
  headline: "产品经理",
  city: "上海",
  summary: "3 年 B 端产品经验，主导客服工单系统从 0 到 1 落地。",
  intent: { targetRole: "产品经理", targetCity: "上海", experience: "3-5 年" },
  educations: [
    {
      school: "华东师范大学",
      major: "信息管理与信息系统",
      degree: "本科",
      start: "2017.09",
      end: "2021.06",
      gpa: "",
      ranking: "",
      courses: "",
      honors: "",
    },
  ],
  experiences: [
    {
      company: "星河科技",
      role: "产品经理",
      start: "2021.07",
      end: "至今",
      description:
        "负责客服工单系统需求分析与产品设计。\n推动跨团队协作，交付周期缩短 30%。",
    },
  ],
  projects: [
    {
      name: "工单系统重构",
      role: "产品负责人",
      start: "2022.03",
      end: "2023.06",
      description: "主导工单系统重构，覆盖 12 条业务线。",
      link: "https://example.com/fake",
    },
  ],
  skills: ["需求分析", "Axure", "SQL"],
};
const FULL_RESUME_TEXT = JSON.stringify(FULL_RESUME_JSON);
const aiFullPage = await open({ width: 1440, height: 1100 });
await interceptAi(aiFullPage, { fullText: FULL_RESUME_TEXT });
await aiFullPage.goto(BASE, { waitUntil: "networkidle0" });
await aiFullPage.evaluate(() => {
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: { name: "林一", headline: "产品经理", summary: "旧简介" },
      intent: { targetRole: "产品经理", experience: "3-5年" },
      educations: [],
      experiences: [
        {
          id: "qa-old-e",
          company: "旧公司",
          role: "产品助理",
          start: "2019.01",
          end: "2020.01",
          description: "旧经历",
        },
      ],
      projects: [
        {
          id: "qa-old-p",
          name: "旧项目",
          role: "产品助理",
          start: "2019.01",
          end: "2020.01",
          description: "旧项目描述",
          link: "",
        },
      ],
      skills: ["需求分析"],
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.removeItem("resume-workshop:jd");
  localStorage.removeItem("resume-workshop:library:v1");
});
await aiFullPage.reload({ waitUntil: "networkidle0" });
await pause(500);
await aiFullPage.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((button) => button.textContent?.includes("开始生成"))
    ?.click();
});
await aiFullPage.waitForSelector('[data-qa="ai-keywords"]', { timeout: 15000 });
await clickText(aiFullPage, "整份简历", '[role="dialog"]');
await aiFullPage.waitForSelector('[data-qa="ai-resume-brief"]', {
  timeout: 5000,
});
await setQaValue(
  aiFullPage,
  '[data-qa="ai-resume-brief"]',
  "2021 年本科毕业，信息管理专业；在星河科技做产品经理 3 年，负责客服工单系统；做过工单系统重构项目；会用 Axure 和 SQL。",
);
await clickText(aiFullPage, "生成整份简历", '[role="dialog"]');
await aiFullPage.waitForSelector('[data-qa="ai-full-preview"]', {
  timeout: 20000,
});
await aiFullPage.waitForFunction(
  () =>
    (document.querySelector('[data-qa="ai-full-preview"]')?.textContent ?? "")
      .includes("星河科技"),
  { timeout: 15000 },
);
await pause(300);
const fullPreviewText = await aiFullPage.$eval(
  '[data-qa="ai-full-preview"]',
  (element) => element.textContent ?? "",
);
const fullDialog = await aiFullPage.$('[role="dialog"]');
if (fullDialog) {
  await fullDialog.screenshot({ path: `${OUT}/qa-ai-full.png` });
}
expect(
  "整份预览包含简介/教育/工作/项目/技能",
  ["3 年 B 端产品经验", "华东师范大学", "星河科技", "工单系统重构", "Axure"].every(
    (text) => fullPreviewText.includes(text),
  ),
  fullPreviewText.slice(0, 120),
);
expect(
  "整份生成完成提示写入左侧表单",
  fullPreviewText.includes("内容会写入左侧编辑表单"),
  fullPreviewText.slice(0, 120),
);
const fullReadyVisible = await aiFullPage.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return false;
  return [...dialog.querySelectorAll('[role="status"]')].some((node) => {
    if (!(node.textContent ?? "").includes("已生成完整简历")) return false;
    const rect = node.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  });
});
expect(
  "整份生成完成状态在底栏可见",
  fullReadyVisible,
  String(fullReadyVisible),
);
const fullFact = await aiFullPage.$eval(
  '[data-qa="ai-full-preview"] [data-qa="fact-check"]',
  (element) => ({
    count: Number(element.getAttribute("data-warning-count")),
    text: element.textContent ?? "",
  }),
);
expect(
  "整份事实核对标出自述之外的学校、专业与数字",
  fullFact.count >= 3 &&
    fullFact.text.includes("华东师范大学") &&
    fullFact.text.includes("信息管理与信息系统") &&
    fullFact.text.includes("30%"),
  JSON.stringify({ count: fullFact.count, text: fullFact.text.slice(0, 200) }),
);

await clickText(aiFullPage, "生成新简历", '[role="dialog"]');
await aiFullPage.waitForFunction(
  () => !document.querySelector('[role="dialog"]'),
);
await pause(1300);
const fullAdopted = await aiFullPage.evaluate(() => {
  const data = JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}");
  const library = JSON.parse(
    localStorage.getItem("resume-workshop:library:v1") ?? "{}",
  );
  return {
    name: data.basic?.name ?? "",
    summary: data.basic?.summary,
    headline: data.basic?.headline,
    educations: (data.educations ?? []).length,
    experiences: data.experiences ?? [],
    projects: data.projects ?? [],
    skills: data.skills ?? [],
    activeTitle: library.activeTitle,
    others: (library.others ?? []).map((document) => ({
      title: document.title,
      summary: document.resume?.basic?.summary,
      experiences: (document.resume?.experiences ?? []).length,
    })),
  };
});
expect(
  "整份生成写入新简历",
  fullAdopted.summary === FULL_RESUME_JSON.summary &&
    fullAdopted.headline === "产品经理" &&
    fullAdopted.educations === 1 &&
    fullAdopted.experiences.length === 1 &&
    fullAdopted.experiences[0].company === "星河科技" &&
    fullAdopted.experiences[0].start === "2021.07" &&
    fullAdopted.projects.length === 1 &&
    fullAdopted.projects[0].name === "工单系统重构" &&
    fullAdopted.projects[0].link === "" &&
    fullAdopted.skills.length === 3,
  JSON.stringify({
    summary: fullAdopted.summary,
    experiences: fullAdopted.experiences.length,
    projects: fullAdopted.projects.length,
    skills: fullAdopted.skills.length,
  }),
);
expect(
  "整份生成不写入姓名与联系方式",
  fullAdopted.name === "",
  fullAdopted.name,
);
expect(
  "旧简历保留在文档列表",
  fullAdopted.others.length === 1 &&
    fullAdopted.others[0].summary === "旧简介" &&
    fullAdopted.others[0].experiences === 1 &&
    fullAdopted.activeTitle === "产品经理",
  JSON.stringify(fullAdopted.others),
);
expect(
  "AI 整份简历无控制台错误",
  aiFullPage.qaErrors.length === 0,
  aiFullPage.qaErrors.join(" | "),
);
await aiFullPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.removeItem("resume-workshop:jd");
  localStorage.removeItem("resume-workshop:library:v1");
});
await aiFullPage.close();

// AI 求职信：读取简介/技能/JD、生成、编辑、复制下载入口与隐私字段
const COVER_TEXT = [
  "尊敬的招聘负责人：",
  "",
  "看到贵公司招聘前端工程师，我拥有 4 年前端经验，主导中后台平台重构，首屏性能提升 40%。",
  "",
  "在星野科技期间，我用 React 与 TypeScript 搭建组件库，覆盖 12 条业务线，重复开发工时下降约 30%。",
  "",
  "期待有机会进一步沟通。",
  "",
  "此致",
  "敬礼",
].join("\n");
const COVER_TEXT_EN = [
  "Dear Hiring Manager,",
  "",
  "I am writing to apply for the Frontend Engineer role. I bring 4 years of frontend experience, leading a platform refactor that improved first-paint performance by 40%.",
  "",
  "At Xingye Technology I built a React and TypeScript component library covering 12 business lines, reducing duplicate development effort by about 30%.",
  "",
  "I would welcome the opportunity to discuss how I can contribute.",
  "",
  "Sincerely,",
].join("\n");
const coverResume = {
  basic: {
    name: "林一",
    headline: "前端工程师",
    email: "lin@example.com",
    phone: "13800000000",
    city: "上海",
    website: "linyi.dev",
    github: "",
    summary: "4 年前端经验，主导中后台重构，首屏性能提升 40%。",
    photo: "",
  },
  intent: {
    targetRole: "前端工程师",
    targetCity: "上海",
    salaryMin: "",
    salaryMax: "",
    jobType: "全职",
    experience: "3-5 年",
  },
  educations: [],
  experiences: [
    {
      id: "qa-cover-e",
      company: "星野科技",
      role: "前端工程师",
      start: "2021.07",
      end: "至今",
      description: "主导中后台平台重构。",
    },
  ],
  projects: [],
  customSections: [],
  skills: ["React", "TypeScript"],
  theme: { accent: "#1d4ed8" },
};

const coverPage = await open({ width: 1440, height: 1000 });
await interceptAi(coverPage, {
  text: (payload) => (payload.language === "en" ? COVER_TEXT_EN : COVER_TEXT),
});
await coverPage.goto(`${BASE}/#jobs`, { waitUntil: "networkidle0" });
await coverPage.evaluate((resume) => {
  localStorage.clear();
  localStorage.setItem("resume-workshop:v1", JSON.stringify(resume));
  localStorage.setItem(
    "resume-workshop:jd",
    "任职要求：熟悉 React 与 TypeScript，有性能优化经验。",
  );
}, coverResume);
await coverPage.reload({ waitUntil: "networkidle0" });
await pause(700);
await coverPage.waitForSelector('[data-qa="cover-letter-open"]', {
  timeout: 15000,
});
await coverPage.click('[data-qa="cover-letter-open"]');
await coverPage.waitForSelector('[data-qa="cover-brief"]', { timeout: 15000 });

const coverPrefill = await coverPage.evaluate(() => ({
  role: document.querySelector('[data-qa="cover-role"]')?.value ?? "",
  years: document.querySelector('[data-qa="cover-years"]')?.value ?? "",
  brief: document.querySelector('[data-qa="cover-brief"]')?.value ?? "",
  jd: document.querySelector('[data-qa="cover-jd"]')?.value ?? "",
}));
expect(
  "求职信默认读取岗位、年限、简介/技能与已存 JD",
  coverPrefill.role === "前端工程师" &&
    coverPrefill.years === "3-5 年" &&
    coverPrefill.brief.includes("首屏性能提升 40%") &&
    coverPrefill.brief.includes("React") &&
    coverPrefill.jd.includes("性能优化经验"),
  JSON.stringify(coverPrefill),
);

await clickText(coverPage, "生成求职信", '[role="dialog"]');
await coverPage.waitForFunction(
  () => {
    const element = document.querySelector('[data-qa="cover-output"]');
    return (
      element instanceof HTMLTextAreaElement &&
      element.value.includes("尊敬的招聘负责人")
    );
  },
  { timeout: 20000 },
);
const coverResult = await coverPage.evaluate(() => {
  const output = document.querySelector('[data-qa="cover-output"]');
  return {
    text: output?.value ?? "",
    editable:
      output instanceof HTMLTextAreaElement &&
      !output.readOnly &&
      !output.disabled,
    hasCopy: Boolean(document.querySelector('[data-qa="cover-copy"]')),
    hasDownload: Boolean(document.querySelector('[data-qa="cover-download"]')),
  };
});
const coverFact = await coverPage.$eval(
  '[role="dialog"] [data-qa="fact-check"]',
  (element) => ({
    count: Number(element.getAttribute("data-warning-count")),
    text: element.textContent ?? "",
  }),
);
expect(
  "求职信事实核对标出素材之外的数字",
  coverFact.count >= 2 &&
    coverFact.text.includes("12") &&
    coverFact.text.includes("30%"),
  JSON.stringify({ count: coverFact.count, text: coverFact.text.slice(0, 200) }),
);
expect(
  "求职信可预览、编辑，并提供复制与下载",
  coverResult.text.includes("此致") &&
    coverResult.text.includes("敬礼") &&
    coverResult.editable &&
    coverResult.hasCopy &&
    coverResult.hasDownload,
  JSON.stringify({
    editable: coverResult.editable,
    hasCopy: coverResult.hasCopy,
    hasDownload: coverResult.hasDownload,
    length: coverResult.text.length,
  }),
);

const coverPayload = coverPage.aiPayloads.find(
  (payload) => payload.section === "cover",
);
const coverPayloadRaw = JSON.stringify(coverPayload ?? {});
expect(
  "求职信请求只发送素材、岗位、年限与 JD",
  coverPayload?.section === "cover" &&
    coverPayload?.language === "zh" &&
    coverPayload?.role === "前端工程师" &&
    coverPayload?.years === "3-5 年" &&
    String(coverPayload?.keywords).includes("首屏性能提升 40%") &&
    String(coverPayload?.jd).includes("React") &&
    !coverPayloadRaw.includes("林一") &&
    !coverPayloadRaw.includes("lin@example.com") &&
    !coverPayloadRaw.includes("13800000000"),
  coverPayloadRaw.slice(0, 200),
);

const coverStored = await coverPage.evaluate(() => {
  try {
    return JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}").basic
      ?.summary;
  } catch {
    return null;
  }
});
expect(
  "求职信不会写入简历",
  coverStored === "4 年前端经验，主导中后台重构，首屏性能提升 40%。",
  String(coverStored),
);

// 求职信跟随语言：切到英文后重新生成，输出与请求都应变为英文
await coverPage.evaluate(() => {
  const select = document.querySelector('[data-qa="cover-language"]');
  if (!(select instanceof HTMLSelectElement)) return;
  Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value",
  )?.set?.call(select, "en");
  select.dispatchEvent(new Event("change", { bubbles: true }));
});
await pause(200);
await clickText(coverPage, "重新生成", '[role="dialog"]');
await coverPage.waitForFunction(
  () => {
    const output = document.querySelector('[data-qa="cover-output"]');
    return (
      output instanceof HTMLTextAreaElement &&
      output.value.includes("Dear Hiring Manager") &&
      output.value.includes("Sincerely")
    );
  },
  { timeout: 20000 },
);
const coverEnglish = await coverPage.evaluate(() => ({
  text: document.querySelector('[data-qa="cover-output"]')?.value ?? "",
  language: document.querySelector('[data-qa="cover-language"]')?.value ?? "",
}));
const coverEnglishPayload = coverPage.aiPayloads.at(-1) ?? {};
expect(
  "求职信可切换英文输出并携带 language",
  coverEnglish.language === "en" &&
    coverEnglishPayload.language === "en" &&
    coverEnglish.text.includes("Dear Hiring Manager") &&
    !coverEnglish.text.includes("尊敬的招聘负责人"),
  JSON.stringify({
    language: coverEnglish.language,
    payload: coverEnglishPayload.language,
    length: coverEnglish.text.length,
  }),
);

const coverDialog = await coverPage.$('[role="dialog"]');
if (coverDialog) {
  await coverDialog.screenshot({ path: `${OUT}/qa-cover-letter.png` });
}
await clickText(coverPage, "关闭", '[role="dialog"]');
expect(
  "求职信页面无控制台错误",
  coverPage.qaErrors.length === 0,
  coverPage.qaErrors.join(" | "),
);
await coverPage.close();

// 未配置 Key：求职信显示配置步骤，不渲染生成表单
const coverOff = await open({ width: 1440, height: 1000 });
await interceptAi(coverOff, { configured: false });
await coverOff.goto(`${BASE}/#jobs`, { waitUntil: "networkidle0" });
await coverOff.evaluate((resume) => {
  localStorage.setItem("resume-workshop:v1", JSON.stringify(resume));
}, coverResume);
await coverOff.reload({ waitUntil: "networkidle0" });
await pause(700);
await coverOff.waitForSelector('[data-qa="cover-letter-open"]', {
  timeout: 15000,
});
await coverOff.click('[data-qa="cover-letter-open"]');
await coverOff.waitForFunction(
  () =>
    (document.querySelector('[role="dialog"]')?.textContent ?? "").includes(
      "还没有配置",
    ),
  { timeout: 15000 },
);
const coverOffInfo = await coverOff.evaluate(() => ({
  steps: (document.querySelector('[role="dialog"]')?.textContent ?? "").includes(
    "DEEPSEEK_API_KEY",
  ),
  hasForm: Boolean(document.querySelector('[data-qa="cover-brief"]')),
}));
expect(
  "未配置 Key 时求职信显示配置步骤",
  coverOffInfo.steps && !coverOffInfo.hasForm,
  JSON.stringify(coverOffInfo),
);
expect(
  "未配置求职信页面无控制台错误",
  coverOff.qaErrors.length === 0,
  coverOff.qaErrors.join(" | "),
);
await coverOff.close();

// AI 弹窗 390px 无横向溢出
const aiMobile = await open({ width: 390, height: 844, mobile: true });
await interceptAi(aiMobile, { text: AI_TEXT });
await aiMobile.goto(BASE, { waitUntil: "networkidle0" });
await pause(500);
await aiMobile.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((button) => button.textContent?.includes("开始生成"))
    ?.click();
});
await aiMobile.waitForSelector('[role="dialog"] textarea', { timeout: 15000 });
const aiMobileInfo = await aiMobile.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  return {
    viewport: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    dialogWidth: dialog?.scrollWidth ?? 0,
  };
});
expect(
  "AI 移动端无横向溢出",
  aiMobileInfo.pageWidth <= aiMobileInfo.viewport &&
    aiMobileInfo.dialogWidth <= aiMobileInfo.viewport,
  JSON.stringify(aiMobileInfo),
);
await aiMobile.screenshot({ path: `${OUT}/qa-ai-mobile.png` });
expect(
  "AI 移动端无控制台错误",
  aiMobile.qaErrors.length === 0,
  aiMobile.qaErrors.join(" | "),
);
await aiMobile.close();

// 未配置 Key：显示步骤，不出现生成按钮
const aiOff = await open({ width: 1440, height: 1000 });
await interceptAi(aiOff, { configured: false });
await aiOff.goto(BASE, { waitUntil: "networkidle0" });
await pause(500);
await aiOff.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((button) => button.textContent?.includes("开始生成"))
    ?.click();
});
await aiOff.waitForSelector('[role="dialog"]', { timeout: 15000 });
await aiOff.waitForFunction(
  () =>
    (document.querySelector('[role="dialog"]')?.textContent ?? "").includes(
      "还没有配置",
    ),
  { timeout: 10000 },
);
const aiOffInfo = await aiOff.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  return {
    steps: (dialog?.textContent ?? "").includes(".env.local"),
    generateHidden: ![...dialog.querySelectorAll("button")].some(
      (button) => button.textContent?.trim() === "生成",
    ),
  };
});
expect(
  "未配置 Key 显示步骤",
  aiOffInfo.steps && aiOffInfo.generateHidden,
  JSON.stringify(aiOffInfo),
);
await aiOff.screenshot({ path: `${OUT}/qa-ai-unconfigured.png` });
expect(
  "AI 未配置页无控制台错误",
  aiOff.qaErrors.length === 0,
  aiOff.qaErrors.join(" | "),
);
await aiOff.close();

// 保存失败：localStorage 抛错时不能继续显示「已保存」，要提示导出备份
const saveFailPage = await open({ width: 1440, height: 1000 });
await saveFailPage.goto(BASE, { waitUntil: "networkidle0" });
await pause(500);
const saveEditTriggered = await saveFailPage.evaluate(() => {
  Storage.prototype.setItem = () => {
    throw new DOMException("QuotaExceededError");
  };
  const label = [...document.querySelectorAll("label")].find((node) =>
    node.textContent?.includes("姓名"),
  );
  const input = label?.querySelector("input");
  if (!input) return false;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, "保存失败测试");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
});
expect("保存失败用例可触发编辑", saveEditTriggered);
await saveFailPage.waitForSelector('[role="alert"]', { timeout: 5000 });
const saveFail = await saveFailPage.evaluate(() => ({
  text: (document.querySelector('[role="alert"]')?.textContent ?? "").trim(),
  exportButton: [...document.querySelectorAll("button")].some(
    (button) => button.textContent?.trim() === "导出 JSON",
  ),
  status: (document.body.innerText.match(/保存失败[^\n]*/) ?? [])[0] ?? "",
}));
expect(
  "保存失败提示与备份入口",
  saveFail.text.includes("导出 JSON") && saveFail.exportButton,
  JSON.stringify(saveFail),
);
await saveFailPage.screenshot({ path: `${OUT}/qa-save-error.png` });
await saveFailPage.close();

// 删除撤销 + 载入示例 / 导入覆盖确认
const safetyPage = await open({ width: 1440, height: 1000 });
await safetyPage.goto(BASE, { waitUntil: "networkidle0" });
await safetyPage.evaluate(() => {
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: {
        name: "安全测试",
        headline: "前端工程师",
        email: "",
        phone: "",
        city: "",
        website: "",
        github: "",
        summary: "原始简介",
      },
      intent: {},
      educations: [
        { id: "e1", school: "原学校", major: "", degree: "", start: "", end: "" },
      ],
      experiences: [
        {
          id: "x1",
          company: "原公司",
          role: "前端工程师",
          start: "",
          end: "",
          description: "原描述",
        },
      ],
      projects: [{ id: "p1", name: "原项目", role: "", description: "", link: "" }],
      skills: ["React"],
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.setItem("resume-workshop:template", "modern");
});
await safetyPage.reload({ waitUntil: "networkidle0" });
await pause(700);

const countDeletes = () =>
  safetyPage.$$eval('[aria-label="删除"]', (nodes) => nodes.length);
const beforeDelete = await countDeletes();
await safetyPage.evaluate(() => {
  document.querySelector('[aria-label="删除"]')?.click();
});
await safetyPage.waitForFunction(
  () => document.body.innerText.includes("已删除工作经历"),
  { timeout: 5000 },
);
const afterDelete = await countDeletes();
await safetyPage.evaluate(() => {
  const toast = document.querySelector('[role="status"]');
  [...(toast?.querySelectorAll("button") ?? [])]
    .find((button) => button.textContent?.trim() === "撤销")
    ?.click();
});
await safetyPage.waitForFunction(
  () => !document.body.innerText.includes("已删除工作经历"),
  { timeout: 5000 },
);
const afterUndo = await countDeletes();
const companyBack = await safetyPage.evaluate(() =>
  document.body.innerText.includes("原公司"),
);
expect(
  "删除可撤销并恢复条目",
  beforeDelete === 3 && afterDelete === 2 && afterUndo === 3 && companyBack,
  JSON.stringify({ beforeDelete, afterDelete, afterUndo, companyBack }),
);

const readName = () =>
  safetyPage.evaluate(() => {
    const label = [...document.querySelectorAll("label")].find((node) =>
      node.textContent?.includes("姓名"),
    );
    return label?.querySelector("input")?.value ?? "";
  });

let sampleDialog = "";
safetyPage.once("dialog", async (dialog) => {
  sampleDialog = dialog.message();
  await dialog.dismiss();
});
await safetyPage.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((button) => button.textContent?.trim() === "载入示例")
    ?.click();
});
await pause(700);
const nameAfterSampleCancel = await readName();
expect(
  "载入示例可取消",
  sampleDialog.includes("覆盖") && nameAfterSampleCancel === "安全测试",
  JSON.stringify({ sampleDialog, nameAfterSampleCancel }),
);

safetyPage.once("dialog", async (dialog) => {
  await dialog.accept();
});
await safetyPage.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((button) => button.textContent?.trim() === "载入示例")
    ?.click();
});
await pause(700);
const nameAfterSample = await readName();
expect(
  "载入示例确认后生效",
  nameAfterSample === "林一",
  nameAfterSample,
);

// 改成非示例数据后再测导入确认
await safetyPage.evaluate(() => {
  const label = [...document.querySelectorAll("label")].find((node) =>
    node.textContent?.includes("姓名"),
  );
  const input = label?.querySelector("input");
  if (!input) return;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, "导入前");
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await pause(700);

const importPath = path.join(OUT, "qa-import.json");
await writeFile(
  importPath,
  JSON.stringify({
    basic: { name: "导入测试", summary: "导入的简介" },
    intent: {},
    educations: [
      {
        id: "legacy-e1",
        school: "旧版学校",
        major: "",
        degree: "",
        start: "",
        end: "",
      },
    ],
    experiences: [],
    projects: [
      {
        id: "legacy-p1",
        name: "旧版项目",
        role: "",
        description: "没有起止时间的旧数据",
        link: "",
      },
    ],
    skills: [],
    template: "classic",
  }),
);
const fileInput = await safetyPage.$(
  'input[type="file"][accept*="json"]',
);
if (!fileInput) throw new Error("file input not found");

let importDialog = "";
safetyPage.once("dialog", async (dialog) => {
  importDialog = dialog.message();
  await dialog.dismiss();
});
await fileInput.uploadFile(importPath);
await safetyPage.waitForFunction(
  () => document.body.innerText.includes("已取消导入"),
  { timeout: 5000 },
);
const nameAfterImportCancel = await readName();
expect(
  "导入可取消",
  importDialog.includes("覆盖") && nameAfterImportCancel === "导入前",
  JSON.stringify({ importDialog, nameAfterImportCancel }),
);

safetyPage.once("dialog", async (dialog) => {
  await dialog.accept();
});
await fileInput.uploadFile(importPath);
await safetyPage.waitForFunction(
  () => document.body.innerText.includes("简历已导入"),
  { timeout: 5000 },
);
const nameAfterImport = await readName();
expect("导入确认后生效", nameAfterImport === "导入测试", nameAfterImport);
await pause(300);
const importedTemplate = await safetyPage.evaluate(() => {
  const classic = [...document.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === "经典",
  );
  return {
    pressed: classic?.getAttribute("aria-pressed") === "true",
    stored: localStorage.getItem("resume-workshop:template"),
  };
});
expect(
  "导入恢复模板",
  importedTemplate.pressed && importedTemplate.stored === "classic",
  JSON.stringify(importedTemplate),
);
await safetyPage.waitForFunction(
  () => {
    try {
      const data = JSON.parse(
        localStorage.getItem("resume-workshop:v1") ?? "{}",
      );
      return (
        data.basic?.name === "导入测试" &&
        data.projects?.[0]?.name === "旧版项目" &&
        data.educations?.[0]?.school === "旧版学校"
      );
    } catch {
      return false;
    }
  },
  { timeout: 5000 },
);
const oldJsonCompat = await safetyPage.evaluate(() => {
  const data = JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}");
  return {
    customSections:
      Array.isArray(data.customSections) && data.customSections.length === 0,
    emptyState: document.body.innerText.includes("还没有自定义板块"),
    projectDates:
      data.projects?.[0]?.start === "" && data.projects?.[0]?.end === "",
    educationExtras:
      data.educations?.[0]?.gpa === "" &&
      data.educations?.[0]?.ranking === "" &&
      data.educations?.[0]?.courses === "" &&
      data.educations?.[0]?.honors === "",
    educationDetailsHidden: !["GPA", "主修课程", "荣誉"].some((marker) =>
      document.querySelector(".resume-paper")?.innerText.includes(marker),
    ),
  };
});
expect(
  "旧 JSON 兼容自定义板块、项目时间与教育增强",
  oldJsonCompat.customSections &&
    oldJsonCompat.emptyState &&
    oldJsonCompat.projectDates &&
    oldJsonCompat.educationExtras &&
    oldJsonCompat.educationDetailsHidden,
  JSON.stringify(oldJsonCompat),
);
await safetyPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
});
await safetyPage.close();

// P3 导入校验：结构错误与超大文件应直接拒绝
const importCheckPage = await open({ width: 1440, height: 1000 });
await importCheckPage.goto(BASE, { waitUntil: "networkidle0" });
await importCheckPage.evaluate(() => {
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: { name: "导入校验基线", headline: "", email: "", phone: "" },
      intent: {},
      educations: [],
      experiences: [],
      projects: [],
      customSections: [],
      skills: [],
      theme: { accent: "#1d4ed8" },
    }),
  );
});
await importCheckPage.reload({ waitUntil: "networkidle0" });
await pause(500);

async function uploadBadImport(name, content, expectedText) {
  const filePath = path.join(OUT, name);
  await writeFile(filePath, content);
  const input = await importCheckPage.$(
    'input[type="file"][accept*="json"]',
  );
  if (!input) throw new Error("file input not found");
  await input.uploadFile(filePath);
  await importCheckPage.waitForFunction(
    (text) => document.body.innerText.includes(text),
    { timeout: 5000 },
    expectedText,
  );
}

await uploadBadImport(
  "qa-import-bad-basic.json",
  JSON.stringify({ basic: "not-an-object" }),
  "基本信息（basic）必须是对象",
);
expect("导入拒绝 basic 类型错误", true);

await uploadBadImport(
  "qa-import-empty-basic.json",
  JSON.stringify({ basic: {} }),
  "基本信息（basic）缺少简历字段",
);
expect("导入拒绝空 basic", true);

await uploadBadImport(
  "qa-import-bad-skills.json",
  JSON.stringify({ basic: { name: "x" }, skills: "React" }),
  "技能（skills）必须是数组",
);
expect("导入拒绝 skills 类型错误", true);

await uploadBadImport(
  "qa-import-bad-entry.json",
  JSON.stringify({ basic: { name: "x" }, experiences: [null] }),
  "工作经历（experiences）中存在无效条目",
);
expect("导入拒绝无效条目", true);

await uploadBadImport(
  "qa-import-too-large.json",
  "x".repeat(5 * 1024 * 1024 + 1),
  "文件过大（超过 5 MB）",
);
expect("导入拒绝超大文件", true);

await importCheckPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.removeItem("resume-workshop:last-saved-at");
});
await importCheckPage.close();

// P2 证件照：上传后压缩保存、八套模板展示、JSON 备份包含、可移除
const photoFixture = path.join(OUT, "qa-photo-fixture.svg");
await writeFile(
  photoFixture,
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
    <rect width="600" height="800" fill="#dbeafe"/>
    <circle cx="300" cy="270" r="130" fill="#1d4ed8"/>
    <path d="M70 800c20-190 120-310 230-310s210 120 230 310" fill="#1e40af"/>
  </svg>`,
);
const photoPage = await open({ width: 1440, height: 1000 });
await photoPage.goto(BASE, { waitUntil: "networkidle0" });
await photoPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.setItem("resume-workshop:template", "modern");
});
await photoPage.reload({ waitUntil: "networkidle0" });
await pause(700);
const photoInput = await photoPage.$('input[type="file"][accept="image/*"]');
if (!photoInput) throw new Error("photo input not found");
await photoInput.uploadFile(photoFixture);
await photoPage.waitForFunction(
  () => {
    try {
      const data = JSON.parse(
        localStorage.getItem("resume-workshop:v1") ?? "{}",
      );
      return (
        typeof data.basic?.photo === "string" &&
        data.basic.photo.startsWith("data:image/jpeg;base64,")
      );
    } catch {
      return false;
    }
  },
  { timeout: 10000 },
);
await photoPage.waitForFunction(
  () => {
    const image = document.querySelector('img[alt="证件照预览"]');
    return Boolean(image?.complete && image.naturalWidth);
  },
  { timeout: 5000 },
);
const photoState = await photoPage.evaluate(() => {
  const data = JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}");
  const image = document.querySelector('img[alt="证件照预览"]');
  return {
    prefix: data.basic?.photo?.slice(0, 23) ?? "",
    length: data.basic?.photo?.length ?? 0,
    width: image?.naturalWidth ?? 0,
    height: image?.naturalHeight ?? 0,
  };
});
expect(
  "照片压缩并保存",
  photoState.prefix === "data:image/jpeg;base64," &&
    photoState.length > 0 &&
    photoState.length <= 600000 &&
    photoState.width === 400 &&
    photoState.height === 400,
  JSON.stringify(photoState),
);

const photoTemplates = [
  { label: "现代", id: "modern" },
  { label: "经典", id: "classic" },
  { label: "紧凑", id: "compact" },
  { label: "侧栏", id: "sidebar" },
  { label: "时间轴", id: "timeline" },
  { label: "极简", id: "minimal" },
  { label: "学术", id: "academic" },
  { label: "卡片", id: "card" },
];
const photoLayout = {};
for (const { label, id } of photoTemplates) {
  await clickText(photoPage, label);
  await photoPage.waitForFunction(
    (templateLabel) =>
      [...document.querySelectorAll("button")].some(
        (button) =>
          button.textContent?.trim() === templateLabel &&
          button.getAttribute("aria-pressed") === "true",
      ),
    {},
    label,
  );
  photoLayout[id] = await photoPage.evaluate(() => {
    const image = document.querySelector('[data-resume-photo="true"]');
    const rect = image?.getBoundingClientRect();
    return {
      count: document.querySelectorAll('[data-resume-photo="true"]').length,
      width: Math.round(rect?.width ?? 0),
    };
  });
  const paper = await photoPage.$(".resume-paper");
  await paper?.screenshot({ path: `${OUT}/qa-photo-${id}.png` });
}
expect(
  "八套模板展示证件照",
  Object.values(photoLayout).every(
    (item) => item.count === 1 && item.width > 10,
  ),
  JSON.stringify(photoLayout),
);

await clickText(photoPage, "现代");
await photoPage.evaluate(() => {
  window.__photoExport = null;
  const originalCreate = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    window.__photoExport = blob;
    return originalCreate(blob);
  };
  HTMLAnchorElement.prototype.click = function () {};
});
await clickText(photoPage, "导出");
await photoPage.waitForFunction(() => Boolean(window.__photoExport), {
  timeout: 5000,
});
const photoExport = await photoPage.evaluate(async () => {
  const payload = JSON.parse(await window.__photoExport.text());
  const document = payload.documents?.[0];
  return {
    prefix: document?.resume?.basic?.photo?.slice(0, 23) ?? "",
    length: document?.resume?.basic?.photo?.length ?? 0,
    template: document?.template,
  };
});
expect(
  "JSON 备份包含照片",
  photoExport.prefix === "data:image/jpeg;base64," &&
    photoExport.length > 0 &&
    photoExport.template === "modern",
  JSON.stringify(photoExport),
);

await photoPage.setViewport({
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
await pause(400);
const photoMobile = await photoPage.evaluate(() => ({
  viewport: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  uploader: Boolean(
    [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "更换照片",
    ),
  ),
}));
expect(
  "手机端照片入口无横向溢出",
  photoMobile.uploader && photoMobile.scrollWidth <= photoMobile.viewport,
  JSON.stringify(photoMobile),
);
await photoPage.screenshot({
  path: `${OUT}/qa-photo-mobile.png`,
  fullPage: true,
});

await clickText(photoPage, "移除");
await photoPage.waitForFunction(
  () => {
    try {
      const data = JSON.parse(
        localStorage.getItem("resume-workshop:v1") ?? "{}",
      );
      return data.basic?.photo === "";
    } catch {
      return false;
    }
  },
  { timeout: 5000 },
);
const photosAfterRemove = await photoPage.$$eval(
  '[data-resume-photo="true"]',
  (nodes) => nodes.length,
);
expect("照片可移除", photosAfterRemove === 0, String(photosAfterRemove));
await photoPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.setItem("resume-workshop:template", "modern");
});
await photoPage.close();

// P2 自定义板块：添加、编辑、排序、显隐、删除撤销、八套模板、JSON 备份
const customPage = await open({ width: 1440, height: 1000 });
await customPage.goto(BASE, { waitUntil: "networkidle0" });
await customPage.evaluate(() => {
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: {
        name: "自定义测试",
        headline: "产品经理",
        email: "",
        phone: "",
        city: "上海",
        website: "",
        github: "",
        summary: "负责增长与效率工具，关注可量化的业务结果。",
        photo: "",
      },
      intent: { targetRole: "产品经理" },
      educations: [
        {
          id: "ce1",
          school: "教育测试大学",
          major: "计算机科学",
          degree: "本科",
          start: "2017.09",
          end: "2021.06",
          gpa: "3.8/4.0",
          ranking: "前 10%",
          courses: "数据结构、操作系统",
          honors: "一等奖学金",
        },
      ],
      experiences: [],
      projects: [
        {
          id: "cp1",
          name: "增长项目",
          role: "负责人",
          start: "2023.05",
          end: "2024.06",
          description: "把新用户次留提升 8 个百分点。",
          link: "",
        },
      ],
      customSections: [],
      skills: ["需求分析"],
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.setItem("resume-workshop:template", "modern");
});
await customPage.reload({ waitUntil: "networkidle0" });
await pause(700);

const projectDatePreview = await customPage.evaluate(() =>
  document.querySelector(".resume-paper")?.innerText.includes("2023.05 – 2024.06"),
);
expect("项目起止时间渲染到简历", projectDatePreview);

const projectDateEdited = await customPage.evaluate(() => {
  const startLabel = [...document.querySelectorAll("label")].find((label) =>
    label.querySelector('input[placeholder="2023.05"]'),
  );
  const card = startLabel?.closest("div.rounded-xl");
  const endLabel = [...(card?.querySelectorAll("label") ?? [])].find((label) =>
    label.querySelector("span")?.textContent?.includes("结束时间"),
  );
  const input = endLabel?.querySelector("input");
  if (!input) return false;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
    input,
    "至今",
  );
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
});
expect("项目结束时间可编辑", projectDateEdited);
await customPage.waitForFunction(
  () => {
    try {
      const data = JSON.parse(
        localStorage.getItem("resume-workshop:v1") ?? "{}",
      );
      return (
        data.projects?.[0]?.end === "至今" &&
        document.querySelector(".resume-paper")?.innerText.includes(
          "2023.05 – 至今",
        )
      );
    } catch {
      return false;
    }
  },
  { timeout: 5000 },
);

const educationPreview = await customPage.evaluate(() => {
  const text = document.querySelector(".resume-paper")?.innerText ?? "";
  return (
    text.includes("GPA 3.8/4.0") &&
    text.includes("排名 前 10%") &&
    text.includes("主修课程：数据结构、操作系统") &&
    text.includes("荣誉：一等奖学金")
  );
});
expect("教育增强字段渲染到简历", educationPreview);

const educationEdited = await customPage.evaluate(() => {
  const input = document.querySelector('input[placeholder="3.8/4.0"]');
  if (!input) return false;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
    input,
    "3.9/4.0",
  );
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
});
expect("教育 GPA 可编辑", educationEdited);
await customPage.waitForFunction(
  () => {
    try {
      const data = JSON.parse(
        localStorage.getItem("resume-workshop:v1") ?? "{}",
      );
      return (
        data.educations?.[0]?.gpa === "3.9/4.0" &&
        document.querySelector(".resume-paper")?.innerText.includes(
          "GPA 3.9/4.0",
        )
      );
    } catch {
      return false;
    }
  },
  { timeout: 5000 },
);

await clickText(customPage, "+ 证书");
await customPage.waitForSelector('[data-custom-section="true"]', {
  timeout: 5000,
});
const filledCertificate = await fillCustomItem(customPage, 0, {
  name: "PMP",
  subtitle: "PMI",
  date: "2023.06",
  link: "example.com/pmp",
  description: "项目管理专业人士认证",
});
expect("自定义板块可添加条目", filledCertificate);
await customPage.waitForFunction(
  () => document.querySelector(".resume-paper")?.innerText.includes("PMP"),
  { timeout: 5000 },
);
const certificatePreview = await customPage.evaluate(() =>
  document.querySelector(".resume-paper")?.innerText.includes("证书"),
);
expect("证书板块渲染到简历", certificatePreview);

await clickText(customPage, "+ 语言");
await customPage.waitForFunction(
  () =>
    document.querySelectorAll('[data-custom-section="true"]').length === 2,
  { timeout: 5000 },
);
const filledLanguage = await fillCustomItem(customPage, 1, {
  name: "英语",
  subtitle: "CET-6",
  date: "",
  link: "",
  description: "读写流利，可英文会议沟通",
});
expect("可添加第二个自定义板块", filledLanguage);
await customPage.waitForFunction(
  () => document.querySelector(".resume-paper")?.innerText.includes("CET-6"),
  { timeout: 5000 },
);
const orderBefore = await customPage.evaluate(() => {
  const text = document.querySelector(".resume-paper")?.innerText ?? "";
  return text.indexOf("PMP") < text.indexOf("CET-6");
});
await customPage.click('[aria-label="上移板块 语言"]');
await customPage.waitForFunction(() => {
  const text = document.querySelector(".resume-paper")?.innerText ?? "";
  return text.indexOf("CET-6") < text.indexOf("PMP");
}, { timeout: 5000 });
const sectionOrder = await customPage.$$eval(
  '[data-custom-section="true"] input[aria-label^="板块名称"]',
  (inputs) => inputs.map((input) => input.value),
);
expect(
  "自定义板块可排序",
  orderBefore && sectionOrder.join(",") === "语言,证书",
  JSON.stringify({ orderBefore, sectionOrder }),
);

await customPage.evaluate(() => {
  document.querySelector('[aria-label="隐藏板块 语言"]')?.click();
});
await customPage.waitForFunction(
  () => {
    try {
      const data = JSON.parse(
        localStorage.getItem("resume-workshop:v1") ?? "{}",
      );
      const language = data.customSections?.find(
        (section) => section.title === "语言",
      );
      return (
        language?.visible === false &&
        !document.querySelector(".resume-paper")?.innerText.includes("CET-6")
      );
    } catch {
      return false;
    }
  },
  { timeout: 5000 },
);
const hiddenState = await customPage.evaluate(() => {
  const data = JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}");
  const language = data.customSections?.find(
    (section) => section.title === "语言",
  );
  return {
    visible: language?.visible,
    paper: document.querySelector(".resume-paper")?.innerText ?? "",
  };
});
await customPage.evaluate(() => {
  document.querySelector('[aria-label="显示板块 语言"]')?.click();
});
await customPage.waitForFunction(
  () => document.querySelector(".resume-paper")?.innerText.includes("CET-6"),
  { timeout: 5000 },
);
expect(
  "自定义板块可隐藏并重新显示",
  hiddenState.visible === false && !hiddenState.paper.includes("CET-6"),
  JSON.stringify(hiddenState),
);

await customPage.evaluate(() => {
  const section = [...document.querySelectorAll('[data-custom-section="true"]')].find(
    (node) =>
      node.querySelector('input[aria-label^="板块名称"]')?.value === "证书",
  );
  section?.querySelector('[aria-label="删除自定义条目"]')?.click();
});
await customPage.waitForFunction(
  () =>
    document.body.innerText.includes("已删除自定义条目") &&
    !document.querySelector(".resume-paper")?.innerText.includes("PMP"),
  { timeout: 5000 },
);
await customPage.evaluate(() => {
  [...document.querySelectorAll('[role="status"] button')]
    .find((button) => button.textContent?.trim() === "撤销")
    ?.click();
});
await customPage.waitForFunction(
  () => document.querySelector(".resume-paper")?.innerText.includes("PMP"),
  { timeout: 5000 },
);
expect("自定义条目删除可撤销", true);

await customPage.evaluate(() => {
  document.querySelector('[aria-label="删除板块 语言"]')?.click();
});
await customPage.waitForFunction(
  () =>
    document.body.innerText.includes("已删除自定义板块") &&
    !document.querySelector(".resume-paper")?.innerText.includes("CET-6"),
  { timeout: 5000 },
);
await customPage.evaluate(() => {
  [...document.querySelectorAll('[role="status"] button')]
    .find((button) => button.textContent?.trim() === "撤销")
    ?.click();
});
await customPage.waitForFunction(
  () => document.querySelector(".resume-paper")?.innerText.includes("CET-6"),
  { timeout: 5000 },
);
expect("自定义板块删除可撤销", true);

const customTemplates = [
  { label: "现代", id: "modern" },
  { label: "经典", id: "classic" },
  { label: "紧凑", id: "compact" },
  { label: "侧栏", id: "sidebar" },
  { label: "时间轴", id: "timeline" },
  { label: "极简", id: "minimal" },
  { label: "学术", id: "academic" },
  { label: "卡片", id: "card" },
];
const customTemplateResult = {};
for (const { label, id } of customTemplates) {
  await clickText(customPage, label);
  await customPage.waitForFunction(
    (templateLabel) =>
      [...document.querySelectorAll("button")].some(
        (button) =>
          button.textContent?.trim() === templateLabel &&
          button.getAttribute("aria-pressed") === "true",
      ),
    {},
    label,
  );
  customTemplateResult[id] = await customPage.evaluate(() => {
    const text = document.querySelector(".resume-paper")?.innerText ?? "";
    return {
      certificate: text.includes("PMP") && text.includes("证书"),
      language: text.includes("CET-6") && text.includes("语言"),
      projectDates: text.includes("2023.05 – 至今"),
      education:
        text.includes("GPA 3.9/4.0") &&
        text.includes("排名 前 10%") &&
        text.includes("主修课程：数据结构、操作系统") &&
        text.includes("荣誉：一等奖学金"),
    };
  });
  const paper = await customPage.$(".resume-paper");
  await paper?.screenshot({ path: `${OUT}/qa-custom-${id}.png` });
}
expect(
  "八套模板渲染自定义板块、项目时间与教育增强",
  Object.values(customTemplateResult).every(
    (item) =>
      item.certificate && item.language && item.projectDates && item.education,
  ),
  JSON.stringify(customTemplateResult),
);

const customEditor = await customPage.evaluateHandle(() => {
  const heading = [...document.querySelectorAll("h2")].find(
    (node) => node.textContent?.trim() === "自定义板块",
  );
  return heading?.closest("section") ?? null;
});
if (customEditor.asElement()) {
  await customEditor.asElement().screenshot({
    path: `${OUT}/qa-custom-editor.png`,
  });
}

await customPage.setViewport({
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
await pause(500);
const customMobile = await customPage.evaluate(() => ({
  viewport: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  sections: document.querySelectorAll('[data-custom-section="true"]').length,
  addButton: [...document.querySelectorAll("button")].some(
    (button) => button.textContent?.trim() === "+ 添加条目",
  ),
}));
expect(
  "手机端自定义板块无横向溢出",
  customMobile.sections === 2 &&
    customMobile.addButton &&
    customMobile.scrollWidth <= customMobile.viewport,
  JSON.stringify(customMobile),
);
await customPage.screenshot({
  path: `${OUT}/qa-custom-mobile.png`,
  fullPage: true,
});

await customPage.evaluate(() => {
  window.__customExport = null;
  const originalCreate = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    window.__customExport = blob;
    return originalCreate(blob);
  };
  HTMLAnchorElement.prototype.click = function () {};
});
await clickText(customPage, "导出");
await customPage.waitForFunction(() => Boolean(window.__customExport), {
  timeout: 5000,
});
const customExport = await customPage.evaluate(async () => {
  const payload = JSON.parse(await window.__customExport.text());
  const resume = payload.documents?.[0]?.resume ?? {};
  return {
    count: resume.customSections?.length ?? 0,
    titles: resume.customSections?.map((section) => section.title) ?? [],
    visible: resume.customSections?.map((section) => section.visible) ?? [],
    items: resume.customSections?.map((section) =>
      section.items?.map((item) => item.title),
    ) ?? [],
    projectDates: {
      start: resume.projects?.[0]?.start,
      end: resume.projects?.[0]?.end,
    },
    education: {
      gpa: resume.educations?.[0]?.gpa,
      ranking: resume.educations?.[0]?.ranking,
      courses: resume.educations?.[0]?.courses,
      honors: resume.educations?.[0]?.honors,
    },
  };
});
expect(
  "JSON 备份包含自定义板块、项目时间与教育增强",
  customExport.count === 2 &&
    customExport.titles.join(",") === "语言,证书" &&
    customExport.visible.every(Boolean) &&
    customExport.items.flat().includes("PMP") &&
    customExport.items.flat().includes("英语") &&
    customExport.projectDates.start === "2023.05" &&
    customExport.projectDates.end === "至今" &&
    customExport.education.gpa === "3.9/4.0" &&
    customExport.education.ranking === "前 10%" &&
    customExport.education.courses === "数据结构、操作系统" &&
    customExport.education.honors === "一等奖学金",
  JSON.stringify(customExport),
);
await customPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.setItem("resume-workshop:template", "modern");
});
await customPage.close();

// P2 多份简历：重命名、复制、切换、模板隔离、刷新保留、删除、新建
const multiPage = await open({ width: 1440, height: 1000 });
await multiPage.goto(BASE, { waitUntil: "networkidle0" });
await multiPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:library:v1");
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: {
        name: "多简历测试",
        headline: "前端工程师",
        email: "",
        phone: "",
        city: "上海",
        website: "",
        github: "",
        summary: "用于验证多份简历。",
        photo: "",
      },
      intent: { targetRole: "前端工程师" },
      educations: [],
      experiences: [],
      projects: [],
      customSections: [],
      skills: ["React"],
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.setItem("resume-workshop:template", "classic");
});
await multiPage.reload({ waitUntil: "networkidle0" });
await pause(700);

const initialDocuments = await multiPage.evaluate(() => {
  const select = document.querySelector('select[aria-label="切换简历"]');
  return {
    count: select?.options.length,
    title: select?.selectedOptions[0]?.textContent,
    value: select?.value,
    deleteDisabled: [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "删除",
    )?.disabled,
  };
});
expect(
  "单份简历显示文档栏",
  initialDocuments.count === 1 &&
    initialDocuments.title === "多简历测试" &&
    initialDocuments.deleteDisabled === true,
  JSON.stringify(initialDocuments),
);

let renamePrompt = "";
multiPage.once("dialog", async (dialog) => {
  renamePrompt = dialog.message();
  await dialog.accept("主简历");
});
await clickText(multiPage, "重命名", '[data-resume-documents="true"]');
await multiPage.waitForFunction(
  () => {
    const select = document.querySelector('select[aria-label="切换简历"]');
    try {
      const library = JSON.parse(
        localStorage.getItem("resume-workshop:library:v1") ?? "null",
      );
      return (
        select?.selectedOptions[0]?.textContent === "主简历" &&
        library?.activeTitle === "主简历"
      );
    } catch {
      return false;
    }
  },
  { timeout: 5000 },
);
expect("简历可重命名", renamePrompt.includes("重命名"), renamePrompt);

await clickText(multiPage, "复制", '[data-resume-documents="true"]');
await multiPage.waitForFunction(
  () => {
    const select = document.querySelector('select[aria-label="切换简历"]');
    return (
      select?.options.length === 2 &&
      select.selectedOptions[0]?.textContent === "主简历 副本"
    );
  },
  { timeout: 5000 },
);
const copiedState = await multiPage.evaluate(() => {
  const select = document.querySelector('select[aria-label="切换简历"]');
  const library = JSON.parse(
    localStorage.getItem("resume-workshop:library:v1") ?? "null",
  );
  return {
    count: select?.options.length,
    activeTitle: select?.selectedOptions[0]?.textContent,
    others: (library?.others ?? []).map((document) => ({
      title: document.title,
      name: document.resume?.basic?.name,
      template: document.template,
    })),
    template: localStorage.getItem("resume-workshop:template"),
  };
});
expect(
  "可复制当前简历并保留原文档",
  copiedState.count === 2 &&
    copiedState.activeTitle === "主简历 副本" &&
    copiedState.others.length === 1 &&
    copiedState.others[0].title === "主简历" &&
    copiedState.others[0].name === "多简历测试" &&
    copiedState.others[0].template === "classic",
  JSON.stringify(copiedState),
);

await multiPage.evaluate(() => {
  const label = [...document.querySelectorAll("label")].find((node) =>
    node.textContent?.includes("姓名"),
  );
  const input = label?.querySelector("input");
  if (!input) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
    input,
    "副本简历",
  );
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await multiPage.waitForFunction(
  () => {
    try {
      const data = JSON.parse(
        localStorage.getItem("resume-workshop:v1") ?? "{}",
      );
      return data.basic?.name === "副本简历";
    } catch {
      return false;
    }
  },
  { timeout: 5000 },
);
await clickText(multiPage, "紧凑");
await multiPage.waitForFunction(
  () => {
    const compact = [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "紧凑",
    );
    return (
      compact?.getAttribute("aria-pressed") === "true" &&
      localStorage.getItem("resume-workshop:template") === "compact"
    );
  },
  { timeout: 5000 },
);

const originalId = await multiPage.evaluate(() => {
  const select = document.querySelector('select[aria-label="切换简历"]');
  return [...(select?.options ?? [])].find(
    (option) => option.textContent === "主简历",
  )?.value;
});
expect("复制后可切换到原简历", Boolean(originalId), String(originalId));
await multiPage.select('select[aria-label="切换简历"]', originalId);
await multiPage.waitForFunction(
  () => {
    const select = document.querySelector('select[aria-label="切换简历"]');
    const nameLabel = [...document.querySelectorAll("label")].find((node) =>
      node.textContent?.includes("姓名"),
    );
    const classic = [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "经典",
    );
    return (
      select?.selectedOptions[0]?.textContent === "主简历" &&
      nameLabel?.querySelector("input")?.value === "多简历测试" &&
      classic?.getAttribute("aria-pressed") === "true"
    );
  },
  { timeout: 5000 },
);
const originalState = await multiPage.evaluate(() => {
  const library = JSON.parse(
    localStorage.getItem("resume-workshop:library:v1") ?? "null",
  );
  return {
    activeTitle: library?.activeTitle,
    others: (library?.others ?? []).map((document) => ({
      title: document.title,
      name: document.resume?.basic?.name,
      template: document.template,
    })),
    template: localStorage.getItem("resume-workshop:template"),
  };
});
expect(
  "切换简历恢复各自内容与模板",
  originalState.activeTitle === "主简历" &&
    originalState.template === "classic" &&
    originalState.others.some(
      (document) =>
        document.title === "主简历 副本" &&
        document.name === "副本简历" &&
        document.template === "compact",
    ),
  JSON.stringify(originalState),
);

const duplicateId = await multiPage.evaluate(() => {
  const select = document.querySelector('select[aria-label="切换简历"]');
  return [...(select?.options ?? [])].find(
    (option) => option.textContent === "主简历 副本",
  )?.value;
});
await multiPage.select('select[aria-label="切换简历"]', duplicateId);
await multiPage.waitForFunction(
  () => {
    const nameLabel = [...document.querySelectorAll("label")].find((node) =>
      node.textContent?.includes("姓名"),
    );
    const compact = [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "紧凑",
    );
    return (
      nameLabel?.querySelector("input")?.value === "副本简历" &&
      compact?.getAttribute("aria-pressed") === "true"
    );
  },
  { timeout: 5000 },
);

const documentsBar = await multiPage.$('[data-resume-documents="true"]');
await documentsBar?.screenshot({ path: `${OUT}/qa-documents.png` });

await multiPage.reload({ waitUntil: "networkidle0" });
await pause(700);
const reloadedDocuments = await multiPage.evaluate(() => {
  const select = document.querySelector('select[aria-label="切换简历"]');
  const nameLabel = [...document.querySelectorAll("label")].find((node) =>
    node.textContent?.includes("姓名"),
  );
  const compact = [...document.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === "紧凑",
  );
  return {
    count: select?.options.length,
    activeTitle: select?.selectedOptions[0]?.textContent,
    name: nameLabel?.querySelector("input")?.value,
    compact: compact?.getAttribute("aria-pressed") === "true",
    titles: [...(select?.options ?? [])].map((option) => option.textContent),
  };
});
expect(
  "刷新后保留多份简历与当前文档",
  reloadedDocuments.count === 2 &&
    reloadedDocuments.activeTitle === "主简历 副本" &&
    reloadedDocuments.name === "副本简历" &&
    reloadedDocuments.compact &&
    reloadedDocuments.titles.includes("主简历"),
  JSON.stringify(reloadedDocuments),
);

let deleteConfirm = "";
multiPage.once("dialog", async (dialog) => {
  deleteConfirm = dialog.message();
  await dialog.accept();
});
await clickText(multiPage, "删除", '[data-resume-documents="true"]');
await multiPage.waitForFunction(
  () => {
    const select = document.querySelector('select[aria-label="切换简历"]');
    const nameLabel = [...document.querySelectorAll("label")].find((node) =>
      node.textContent?.includes("姓名"),
    );
    const deleteButton = [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "删除",
    );
    const classic = [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "经典",
    );
    return (
      select?.options.length === 1 &&
      select.selectedOptions[0]?.textContent === "主简历" &&
      nameLabel?.querySelector("input")?.value === "多简历测试" &&
      classic?.getAttribute("aria-pressed") === "true" &&
      deleteButton?.disabled === true
    );
  },
  { timeout: 5000 },
);
expect(
  "可删除当前简历并切回上一份",
  deleteConfirm.includes("删除当前简历"),
  deleteConfirm,
);

await clickText(multiPage, "新建", '[data-resume-documents="true"]');
await multiPage.waitForFunction(
  () => {
    const select = document.querySelector('select[aria-label="切换简历"]');
    const nameLabel = [...document.querySelectorAll("label")].find((node) =>
      node.textContent?.includes("姓名"),
    );
    const modern = [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "现代",
    );
    return (
      select?.options.length === 2 &&
      select.selectedOptions[0]?.textContent === "新简历" &&
      nameLabel?.querySelector("input")?.value === "" &&
      modern?.getAttribute("aria-pressed") === "true"
    );
  },
  { timeout: 5000 },
);
const blankState = await multiPage.evaluate(() => {
  const library = JSON.parse(
    localStorage.getItem("resume-workshop:library:v1") ?? "null",
  );
  return {
    activeTitle: library?.activeTitle,
    others: (library?.others ?? []).map((document) => ({
      title: document.title,
      name: document.resume?.basic?.name,
      template: document.template,
    })),
  };
});
expect(
  "可新建空白简历并保留原文档",
  blankState.activeTitle === "新简历" &&
    blankState.others.some(
      (document) =>
        document.title === "主简历" &&
        document.name === "多简历测试" &&
        document.template === "classic",
    ),
  JSON.stringify(blankState),
);

const restoredOriginalId = await multiPage.evaluate(() => {
  const select = document.querySelector('select[aria-label="切换简历"]');
  return [...(select?.options ?? [])].find(
    (option) => option.textContent === "主简历",
  )?.value;
});
await multiPage.select('select[aria-label="切换简历"]', restoredOriginalId);
await multiPage.waitForFunction(
  () => {
    const nameLabel = [...document.querySelectorAll("label")].find((node) =>
      node.textContent?.includes("姓名"),
    );
    return nameLabel?.querySelector("input")?.value === "多简历测试";
  },
  { timeout: 5000 },
);
const blankRetained = await multiPage.evaluate(() => {
  const library = JSON.parse(
    localStorage.getItem("resume-workshop:library:v1") ?? "null",
  );
  return (library?.others ?? []).some(
    (document) =>
      document.title === "新简历" &&
      document.resume?.basic?.name === "" &&
      document.template === "modern",
  );
});
expect("新建的空白简历可再次切回", blankRetained);

// 导出全部简历：一份备份同时包含当前文档与其他文档
await multiPage.evaluate(() => {
  window.__exportedBlob = null;
  window.__downloadName = "";
  const originalCreate = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    window.__exportedBlob = blob;
    return originalCreate(blob);
  };
  HTMLAnchorElement.prototype.click = function () {
    window.__downloadName = this.download;
  };
});
await clickText(multiPage, "导出");
await multiPage.waitForFunction(() => Boolean(window.__exportedBlob), {
  timeout: 5000,
});
const libraryArchive = await multiPage.evaluate(async () => {
  const payload = JSON.parse(await window.__exportedBlob.text());
  return {
    format: payload.format,
    version: payload.version,
    activeId: payload.activeId,
    downloadName: window.__downloadName,
    documents: (payload.documents ?? []).map((document) => ({
      id: document.id,
      title: document.title,
      name: document.resume?.basic?.name,
      template: document.template,
    })),
    json: JSON.stringify(payload),
  };
});
expect(
  "导出备份包含全部简历",
  libraryArchive.format === "resume-workshop" &&
    libraryArchive.version === 3 &&
    libraryArchive.documents.length === 2 &&
    libraryArchive.downloadName === "主简历-全部简历.json" &&
    libraryArchive.documents.some(
      (document) =>
        document.title === "主简历" &&
        document.name === "多简历测试" &&
        document.template === "classic",
    ) &&
    libraryArchive.documents.some(
      (document) =>
        document.title === "新简历" &&
        document.name === "" &&
        document.template === "modern",
    ),
  JSON.stringify({ ...libraryArchive, json: undefined }),
);
const libraryArchiveJson = libraryArchive.json;

await multiPage.setViewport({
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
await pause(400);
const documentsMobile = await multiPage.evaluate(() => {
  const bar = document.querySelector('[data-resume-documents="true"]');
  const select = document.querySelector('select[aria-label="切换简历"]');
  return {
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    count: select?.options.length,
    actions: [...(bar?.querySelectorAll("button") ?? [])].map((button) =>
      button.textContent?.trim(),
    ),
    buttonsInViewport: [...(bar?.querySelectorAll("button") ?? [])].every(
      (button) => {
        const rect = button.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= window.innerWidth;
      },
    ),
    bar: Boolean(bar),
  };
});
expect(
  "手机端多简历栏无横向溢出",
  documentsMobile.bar &&
    documentsMobile.count === 2 &&
    documentsMobile.actions.join(",") ===
      "新建,复制,重命名,导出当前,合并导入,删除" &&
    documentsMobile.buttonsInViewport &&
    documentsMobile.scrollWidth <= documentsMobile.viewport,
  JSON.stringify(documentsMobile),
);
const mobileDocumentsBar = await multiPage.$(
  '[data-resume-documents="true"]',
);
await mobileDocumentsBar?.screenshot({
  path: `${OUT}/qa-documents-mobile.png`,
});

await multiPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.removeItem("resume-workshop:library:v1");
  localStorage.setItem("resume-workshop:template", "modern");
});
await multiPage.close();

// 整库导入：替换当前全部简历并恢复备份时的当前文档
const archivePath = path.join(OUT, "qa-library.json");
await writeFile(archivePath, libraryArchiveJson, "utf8");
const archivePage = await open({ width: 1440, height: 1000 });
await archivePage.goto(BASE, { waitUntil: "networkidle0" });
await archivePage.evaluate(() => {
  localStorage.removeItem("resume-workshop:library:v1");
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({ basic: { name: "待覆盖" } }),
  );
  localStorage.setItem("resume-workshop:template", "modern");
});
await archivePage.reload({ waitUntil: "networkidle0" });
await pause(600);
const archiveInput = await archivePage.$('input[type="file"]');
archivePage.once("dialog", async (dialog) => {
  await dialog.accept();
});
await archiveInput.uploadFile(archivePath);
await archivePage.waitForFunction(
  () => document.body.innerText.includes("已导入 2 份简历"),
  { timeout: 5000 },
);
const restoredLibrary = await archivePage.evaluate(() => {
  const library = JSON.parse(
    localStorage.getItem("resume-workshop:library:v1") ?? "null",
  );
  const select = document.querySelector('select[aria-label="切换简历"]');
  const nameLabel = [...document.querySelectorAll("label")].find((node) =>
    node.textContent?.includes("姓名"),
  );
  return {
    activeTitle: library?.activeTitle,
    others: (library?.others ?? []).map((document) => ({
      title: document.title,
      name: document.resume?.basic?.name,
      template: document.template,
    })),
    count: select?.options.length,
    selected: select?.selectedOptions[0]?.textContent,
    name: nameLabel?.querySelector("input")?.value,
    template: localStorage.getItem("resume-workshop:template"),
  };
});
expect(
  "整库导入恢复全部简历与当前文档",
  restoredLibrary.activeTitle === "主简历" &&
    restoredLibrary.count === 2 &&
    restoredLibrary.selected === "主简历" &&
    restoredLibrary.name === "多简历测试" &&
    restoredLibrary.template === "classic" &&
    restoredLibrary.others.some(
      (document) =>
        document.title === "新简历" &&
        document.name === "" &&
        document.template === "modern",
    ),
  JSON.stringify(restoredLibrary),
);
await archivePage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.removeItem("resume-workshop:library:v1");
  localStorage.setItem("resume-workshop:template", "modern");
});
await archivePage.close();

// 单份导出与合并导入：单份文件不带其他简历 / 投递记录，合并时不覆盖现有数据
const singlePage = await open({ width: 1440, height: 1000 });
await singlePage.goto(BASE, { waitUntil: "networkidle0" });
await singlePage.evaluate(() => {
  localStorage.clear();
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: { name: "单份导出", summary: "只导出这一份" },
      skills: ["React"],
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.setItem("resume-workshop:template", "classic");
  localStorage.setItem(
    "resume-workshop:applications:v1",
    JSON.stringify([
      {
        company: "本地公司",
        role: "前端",
        status: "applied",
        jd: "本地 JD",
        updatedAt: 1000,
      },
    ]),
  );
});
await singlePage.reload({ waitUntil: "networkidle0" });
await pause(600);
await singlePage.evaluate(() => {
  window.__qaSingleBlob = null;
  window.__qaSingleName = "";
  const original = URL.createObjectURL;
  URL.createObjectURL = (blob) => {
    window.__qaSingleBlob = blob;
    return original.call(URL, blob);
  };
  HTMLAnchorElement.prototype.click = function () {
    window.__qaSingleName = this.download;
  };
});
await clickText(singlePage, "导出当前");
await singlePage.waitForFunction(() => Boolean(window.__qaSingleBlob), {
  timeout: 5000,
});
const singleExport = await singlePage.evaluate(async () => {
  const text = await window.__qaSingleBlob.text();
  const payload = JSON.parse(text);
  return {
    text,
    format: payload.format,
    version: payload.version,
    title: payload.title,
    template: payload.template,
    hasDocuments: Array.isArray(payload.documents),
    hasApplications: Array.isArray(payload.applications),
    name: payload.resume?.basic?.name,
    downloadName: window.__qaSingleName,
  };
});
expect(
  "单份导出只包含当前简历且文件名正确",
  singleExport.format === "resume-workshop-single" &&
    singleExport.version === 1 &&
    singleExport.title === "单份导出" &&
    singleExport.template === "classic" &&
    singleExport.name === "单份导出" &&
    !singleExport.hasDocuments &&
    !singleExport.hasApplications &&
    singleExport.downloadName.endsWith("-简历.json") &&
    !singleExport.downloadName.includes("全部简历"),
  JSON.stringify({ ...singleExport, text: undefined }),
);
const singlePath = path.join(OUT, "qa-single-resume.json");
await writeFile(singlePath, singleExport.text, "utf8");

const singleInput = await singlePage.$('input[type="file"][accept*="json"]');
await singlePage.click('[data-qa="merge-import"]');
await singleInput.uploadFile(singlePath);
await singlePage.waitForFunction(
  () => document.body.innerText.includes("已追加简历"),
  { timeout: 5000 },
);
const afterSingleMerge = await singlePage.evaluate(() => {
  const select = document.querySelector('select[aria-label="切换简历"]');
  const library = JSON.parse(
    localStorage.getItem("resume-workshop:library:v1") ?? "null",
  );
  return {
    count: select?.options.length,
    selected: select?.selectedOptions[0]?.textContent,
    others: (library?.others ?? []).map((document) => document.title),
  };
});
expect(
  "合并导入单份简历会新增副本且不切换当前简历",
  afterSingleMerge.count === 2 &&
    afterSingleMerge.selected === "单份导出" &&
    afterSingleMerge.others.includes("单份导出 2"),
  JSON.stringify(afterSingleMerge),
);

const mergeArchivePath = path.join(OUT, "qa-merge-library.json");
await writeFile(
  mergeArchivePath,
  JSON.stringify({
    format: "resume-workshop",
    version: 3,
    activeId: "merge-doc",
    documents: [
      {
        id: "merge-doc",
        title: "合并简历",
        template: "compact",
        resume: { basic: { name: "合并简历" } },
      },
    ],
    applications: [
      {
        id: "merge-app",
        company: "合并公司",
        role: "后端",
        status: "interview",
        jd: "合并 JD",
        updatedAt: 2000,
      },
    ],
  }),
  "utf8",
);
await singlePage.click('[data-qa="merge-import"]');
await singleInput.uploadFile(mergeArchivePath);
await singlePage.waitForFunction(
  () => document.body.innerText.includes("已合并 1 份简历"),
  { timeout: 5000 },
);
const afterLibraryMerge = await singlePage.evaluate(() => {
  const select = document.querySelector('select[aria-label="切换简历"]');
  const library = JSON.parse(
    localStorage.getItem("resume-workshop:library:v1") ?? "null",
  );
  const applications = JSON.parse(
    localStorage.getItem("resume-workshop:applications:v1") ?? "[]",
  );
  return {
    count: select?.options.length,
    selected: select?.selectedOptions[0]?.textContent,
    activeTitle: library?.activeTitle,
    others: (library?.others ?? []).map((document) => document.title),
    companies: applications.map((application) => application.company),
  };
});
expect(
  "整库合并导入追加简历与投递记录且不覆盖当前简历",
  afterLibraryMerge.count === 3 &&
    afterLibraryMerge.selected === "单份导出" &&
    afterLibraryMerge.activeTitle === "单份导出" &&
    afterLibraryMerge.others.includes("单份导出 2") &&
    afterLibraryMerge.others.includes("合并简历") &&
    afterLibraryMerge.companies.includes("本地公司") &&
    afterLibraryMerge.companies.includes("合并公司"),
  JSON.stringify(afterLibraryMerge),
);
expect(
  "单份导出与合并导入页面无控制台错误",
  singlePage.qaErrors.length === 0,
  singlePage.qaErrors.join(" | "),
);
await singlePage.close();

// P3 输入校验：格式提示只在失焦后出现，不阻止保存
const validationPage = await open({ width: 1440, height: 1000 });
await validationPage.goto(BASE, { waitUntil: "networkidle0" });
await validationPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.removeItem("resume-workshop:library:v1");
  localStorage.removeItem("resume-workshop:last-saved-at");
});
await validationPage.reload({ waitUntil: "networkidle0" });
await pause(600);

await setFieldByLabel(validationPage, "邮箱", "not-an-email");
await pause(150);
const emailInvalid = await labelText(validationPage, "邮箱");
expect(
  "邮箱格式错误有提示",
  emailInvalid.includes("邮箱格式不正确"),
  emailInvalid,
);
await setFieldByLabel(validationPage, "邮箱", "me@example.com");
await pause(150);
const emailValid = await labelText(validationPage, "邮箱");
expect("邮箱改正后提示消失", !emailValid.includes("邮箱格式不正确"), emailValid);

await setFieldByLabel(validationPage, "手机", "abc");
await pause(150);
expect(
  "手机格式错误有提示",
  (await labelText(validationPage, "手机")).includes("电话只能包含"),
);

await setFieldByLabel(validationPage, "期望月薪（最低）", "30");
await setFieldByLabel(validationPage, "期望月薪（最高）", "20");
await pause(150);
const salaryError = await labelText(validationPage, "期望月薪（最高）");
expect(
  "薪资区间倒置有提示",
  salaryError.includes("最高月薪不能低于最低月薪"),
  salaryError,
);

await setFieldByLabel(validationPage, "开始时间", "abc");
await pause(150);
const dateError = await validationPage.evaluate(() =>
  document.body.innerText.includes("开始时间格式建议为 2023.05"),
);
expect("日期格式错误有提示", dateError);

await setFieldByLabel(validationPage, "项目链接", "not-a-url");
await pause(150);
const linkError = await labelText(validationPage, "项目链接");
expect(
  "项目链接格式错误有提示",
  linkError.includes("链接格式不正确"),
  linkError,
);

await setFieldByLabel(validationPage, "姓名", "");
await pause(150);
const nameError = await labelText(validationPage, "姓名");
expect("姓名必填提示", nameError.includes("请填写姓名"), nameError);

await validationPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.removeItem("resume-workshop:library:v1");
  localStorage.removeItem("resume-workshop:last-saved-at");
  localStorage.setItem("resume-workshop:template", "modern");
});
await validationPage.close();

// P3 备份提醒：超过 7 天未导出提示，稍后可暂停 3 天
const backupPage = await open({ width: 1440, height: 1000 });
await backupPage.goto(BASE, { waitUntil: "networkidle0" });
await backupPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:library:v1");
  localStorage.removeItem("resume-workshop:last-export-at");
  localStorage.removeItem("resume-workshop:backup-snooze-at");
  localStorage.setItem(
    "resume-workshop:first-use-at",
    String(Date.now() - 8 * 24 * 60 * 60 * 1000),
  );
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: {
        name: "备份提醒测试",
        headline: "产品经理",
        email: "",
        phone: "",
        city: "杭州",
        website: "",
        github: "",
        summary: "",
        photo: "",
      },
      intent: { targetRole: "产品经理" },
      educations: [],
      experiences: [],
      projects: [],
      customSections: [],
      skills: ["需求分析"],
      theme: { accent: "#1d4ed8" },
    }),
  );
});
await backupPage.reload({ waitUntil: "networkidle0" });
const reminderVisible = await backupPage
  .waitForSelector('[data-qa="backup-reminder"]', {
    visible: true,
    timeout: 5000,
  })
  .then(() => true)
  .catch(() => false);
expect("超过 7 天未导出显示备份提醒", reminderVisible);

await clickText(backupPage, "3 天后再提醒");
await pause(300);
const snoozed = await backupPage.evaluate(() => ({
  banner: Boolean(document.querySelector('[data-qa="backup-reminder"]')),
  snoozeAt: Number(
    localStorage.getItem("resume-workshop:backup-snooze-at") ?? 0,
  ),
}));
expect(
  "备份提醒可暂停",
  !snoozed.banner && snoozed.snoozeAt > 0,
  JSON.stringify(snoozed),
);

await backupPage.reload({ waitUntil: "networkidle0" });
await pause(700);
const snoozeKept = await backupPage.evaluate(
  () => !document.querySelector('[data-qa="backup-reminder"]'),
);
expect("刷新后仍遵守暂停", snoozeKept);

await backupPage.evaluate(() => {
  localStorage.setItem(
    "resume-workshop:backup-snooze-at",
    String(Date.now() - 4 * 24 * 60 * 60 * 1000),
  );
  localStorage.removeItem("resume-workshop:last-export-at");
});
await backupPage.reload({ waitUntil: "networkidle0" });
await backupPage.waitForSelector('[data-qa="backup-reminder"]', {
  visible: true,
  timeout: 5000,
});
await backupPage.evaluate(() => {
  HTMLAnchorElement.prototype.click = function click() {
    window.__downloadClicked = true;
  };
  window.__downloadClicked = false;
});
await clickText(backupPage, "导出 JSON");
await backupPage.waitForFunction(
  () =>
    Boolean(localStorage.getItem("resume-workshop:last-export-at")) &&
    !document.querySelector('[data-qa="backup-reminder"]'),
  { timeout: 5000 },
);
const exportedAt = await backupPage.evaluate(() => ({
  lastExport: Boolean(
    localStorage.getItem("resume-workshop:last-export-at"),
  ),
  clicked: Boolean(window.__downloadClicked),
}));
expect(
  "从提醒导出后记录备份时间",
  exportedAt.lastExport,
  JSON.stringify(exportedAt),
);

await backupPage.evaluate(() => {
  for (const key of [
    "resume-workshop:v1",
    "resume-workshop:library:v1",
    "resume-workshop:first-use-at",
    "resume-workshop:last-export-at",
    "resume-workshop:last-saved-at",
    "resume-workshop:backup-snooze-at",
  ]) {
    localStorage.removeItem(key);
  }
});
await backupPage.close();

// P3 跨标签页：后保存的标签页不得静默覆盖前一份
const crossA = await open({ width: 1440, height: 1000 });
await crossA.goto(BASE, { waitUntil: "networkidle0" });
await crossA.evaluate(() => {
  localStorage.removeItem("resume-workshop:library:v1");
  localStorage.removeItem("resume-workshop:last-saved-at");
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: {
        name: "跨标签基线",
        headline: "前端工程师",
        email: "",
        phone: "",
        city: "上海",
        website: "",
        github: "",
        summary: "",
        photo: "",
      },
      intent: { targetRole: "前端工程师" },
      educations: [],
      experiences: [],
      projects: [],
      customSections: [],
      skills: ["React"],
      theme: { accent: "#1d4ed8" },
    }),
  );
});
await crossA.reload({ waitUntil: "networkidle0" });
await pause(500);

const crossB = await open({ width: 1440, height: 1000 });
await crossB.goto(BASE, { waitUntil: "networkidle0" });
await pause(500);

await crossB.evaluate(() => {
  const label = [...document.querySelectorAll("label")].find((node) =>
    node.textContent?.includes("姓名"),
  );
  const input = label?.querySelector("input");
  if (!input) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
    input,
    "B 的修改",
  );
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await crossB.waitForFunction(
  () => {
    try {
      return (
        JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}").basic
          ?.name === "B 的修改"
      );
    } catch {
      return false;
    }
  },
  { timeout: 5000 },
);

// 没有编辑过的标签页应该跟随最新版本，而不是被弹冲突挡住
const followedName = await crossA
  .waitForFunction(
    () => {
      const label = [...document.querySelectorAll("label")].find((node) =>
        node.textContent?.includes("姓名"),
      );
      return label?.querySelector("input")?.value === "B 的修改";
    },
    { timeout: 5000 },
  )
  .then(() => true)
  .catch(() => false);
const followedConflict = await crossA.$('[data-qa="storage-conflict"]');
expect(
  "未编辑的标签页自动跟随另一标签页的最新版本",
  followedName && followedConflict === null,
  String(followedName),
);

await crossA.evaluate(() => {
  const label = [...document.querySelectorAll("label")].find((node) =>
    node.textContent?.includes("姓名"),
  );
  const input = label?.querySelector("input");
  if (!input) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
    input,
    "A 的修改",
  );
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
// 跟随刚落定就立刻输入，偶尔会和 React 的提交撞车；等一拍再编辑。
await pause(400);
await crossA.waitForFunction(
  () => {
    try {
      return (
        JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}").basic
          ?.name === "A 的修改"
      );
    } catch {
      return false;
    }
  },
  { timeout: 5000 },
);
expect("跟随之后继续编辑可以正常保存", true);

// 两个标签页都编辑过时仍然要停下来：后写方不能覆盖对方
const conflictBanner = await crossB
  .waitForSelector('[data-qa="storage-conflict"]', {
    visible: true,
    timeout: 5000,
  })
  .then(() => true)
  .catch(() => false);
const conflictText = conflictBanner
  ? await crossB.$eval(
      '[data-qa="storage-conflict"]',
      (node) => node.textContent?.trim() ?? "",
    )
  : "";
expect(
  "两个标签页都编辑过时提示冲突",
  conflictBanner && conflictText.includes("本页已暂停保存"),
  conflictText,
);

await crossB.evaluate(() => {
  const label = [...document.querySelectorAll("label")].find((node) =>
    node.textContent?.includes("姓名"),
  );
  const input = label?.querySelector("input");
  if (!input) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
    input,
    "B 再改",
  );
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await pause(1000);
const blockedStored = await crossB.evaluate(
  () =>
    JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}").basic?.name,
);
expect(
  "冲突期间不覆盖另一标签页数据",
  blockedStored === "A 的修改",
  String(blockedStored),
);

crossB.once("dialog", async (dialog) => {
  await dialog.accept();
});
await clickText(crossB, "保留我的版本");
await crossB.waitForFunction(
  () => {
    try {
      return (
        JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}").basic
          ?.name === "B 再改" &&
        !document.querySelector('[data-qa="storage-conflict"]')
      );
    } catch {
      return false;
    }
  },
  { timeout: 5000 },
);
expect("可确认保留本页版本并恢复保存", true);

await crossA.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.removeItem("resume-workshop:last-saved-at");
  localStorage.setItem("resume-workshop:template", "modern");
});
await crossA.close();
await crossB.close();

// 打印前用「姓名-头衔」作 document.title，Chrome 存 PDF 时用作文件名
const pdfNamePage = await open({ width: 1440, height: 1000 });
await pdfNamePage.goto(BASE, { waitUntil: "networkidle0" });
await pause(700);
await pdfNamePage.evaluate(() => {
  window.__printTitle = "";
  window.print = () => {
    window.__printTitle = document.title;
  };
  [...document.querySelectorAll("button")]
    .find((button) => button.textContent?.includes("打印"))
    ?.click();
});
await pdfNamePage.waitForFunction(() => Boolean(window.__printTitle), {
  timeout: 5000,
});
const printTitle = await pdfNamePage.evaluate(() => window.__printTitle);
expect(
  "打印标题用作 PDF 文件名",
  printTitle === "林一-前端工程师",
  printTitle,
);
await pause(1300);
const restoredTitle = await pdfNamePage.evaluate(() => document.title);
expect(
  "打印后标题恢复",
  restoredTitle === "简历工坊 · 简历制作与求职推荐",
  restoredTitle,
);

await pdfNamePage.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((button) => button.textContent?.trim() === "现代")
    ?.click();
});
await pause(300);
await pdfNamePage.evaluate(() => {
  window.__exportedBlob = null;
  window.__downloadName = "";
  const originalCreate = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    window.__exportedBlob = blob;
    return originalCreate(blob);
  };
  HTMLAnchorElement.prototype.click = function () {
    window.__downloadName = this.download;
  };
});
await pdfNamePage.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((button) => button.textContent?.trim() === "导出")
    ?.click();
});
await pdfNamePage.waitForFunction(() => Boolean(window.__exportedBlob), {
  timeout: 5000,
});
const exported = await pdfNamePage.evaluate(async () => {
  const blob = window.__exportedBlob;
  const payload = JSON.parse(await blob.text());
  const document = payload.documents?.[0];
  return {
    format: payload.format,
    version: payload.version,
    count: payload.documents?.length,
    activeId: payload.activeId,
    template: document?.template,
    name: document?.resume?.basic?.name,
    downloadName: window.__downloadName,
  };
});
expect(
  "导出全部简历且文件名正确",
  exported.format === "resume-workshop" &&
    exported.version === 3 &&
    exported.count === 1 &&
    exported.template === "modern" &&
    exported.name === "林一" &&
    exported.downloadName === "示例简历-全部简历.json",
  JSON.stringify(exported),
);
await pdfNamePage.close();

// 打印媒体下的视觉检查
const printPage = await open({ width: 1200, height: 1000 });
await printPage.goto(BASE, { waitUntil: "networkidle0" });
await printPage.evaluate(() =>
  localStorage.setItem("resume-workshop:template", "compact"),
);
await printPage.goto(BASE, { waitUntil: "networkidle0" });
await new Promise((resolve) => setTimeout(resolve, 900));
await printPage.emulateMediaType("print");
await new Promise((resolve) => setTimeout(resolve, 300));
const printContrast = await printPage.evaluate(() => {
  const node = document.querySelector(
    '#resume-print [class*="text-zinc-400"]',
  );
  return node ? getComputedStyle(node).color : "none";
});
expect(
  "打印浅灰文字对比度提高",
  printContrast === "rgb(82, 82, 91)",
  printContrast,
);
await printPage.screenshot({ path: `${OUT}/qa-print.png`, fullPage: true });
await printPage.pdf({
  path: `${OUT}/qa-resume.pdf`,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await printPage.close();

// 主题色：选中「绯红」后应写入 localStorage，并应用到模板
const themePage = await open({ width: 1440, height: 1100 });
await themePage.goto(BASE, { waitUntil: "networkidle0" });
await themePage.evaluate(() => localStorage.removeItem("resume-workshop:v1"));
await themePage.reload({ waitUntil: "networkidle0" });
await new Promise((resolve) => setTimeout(resolve, 700));
await themePage.evaluate(() => {
  const swatch = document.querySelector('button[aria-label="绯红"]');
  swatch?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});
await new Promise((resolve) => setTimeout(resolve, 800));
const themeResult = await themePage.evaluate(() => {
  const stored = JSON.parse(
    localStorage.getItem("resume-workshop:v1") ?? "{}",
  );
  return {
    stored: stored.theme?.accent ?? "none",
    swatches: document.querySelectorAll('[aria-label="主题色"] button').length,
  };
});
console.log(
  `qa-theme: stored=${themeResult.stored} swatches=${themeResult.swatches}`,
);
await themePage.evaluate(() =>
  localStorage.setItem("resume-workshop:template", "timeline"),
);
await themePage.reload({ waitUntil: "networkidle0" });
await new Promise((resolve) => setTimeout(resolve, 900));
const themeInk = await themePage.evaluate(() => {
  const title = document.querySelector(".resume-ink");
  return title ? getComputedStyle(title).color : "none";
});
console.log(`qa-theme-ink: ${themeInk}`);
await themePage.screenshot({ path: `${OUT}/qa-theme-timeline.png` });
await themePage.evaluate(() => localStorage.removeItem("resume-workshop:v1"));
await themePage.close();

// 字体搭配：默认跟随模板、切换后作用于标题/正文、八套模板一致、刷新/撤销/导出保留
const fontPage = await open({ width: 1440, height: 1100 });
await fontPage.goto(BASE, { waitUntil: "networkidle0" });
await fontPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.setItem("resume-workshop:template", "modern");
});
await fontPage.reload({ waitUntil: "networkidle0" });
await pause(700);

const readFontState = () =>
  fontPage.evaluate(() => {
    const group = document.querySelector('[aria-label="简历字体"]');
    const buttons = [...(group?.querySelectorAll("button") ?? [])];
    const paper = document.querySelector(".resume-paper");
    const heading = paper?.querySelector("h1");
    const body = paper?.querySelector("section p");
    return {
      labels: buttons.map((button) => button.textContent?.trim() ?? ""),
      pressed:
        buttons
          .find((button) => button.getAttribute("aria-pressed") === "true")
          ?.textContent?.trim() ?? "",
      stored: (() => {
        try {
          return (
            JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}")
              .font ?? "none"
          );
        } catch {
          return "invalid";
        }
      })(),
      paper: paper ? getComputedStyle(paper).fontFamily : "",
      heading: heading ? getComputedStyle(heading).fontFamily : "",
      body: body ? getComputedStyle(body).fontFamily : "",
    };
  });

const clickFont = async (label) => {
  await fontPage.evaluate((text) => {
    const group = document.querySelector('[aria-label="简历字体"]');
    [...(group?.querySelectorAll("button") ?? [])]
      .find((button) => button.textContent?.trim() === text)
      ?.click();
  }, label);
  await pause(400);
};

const fontDefault = await readFontState();
expect(
  "字体选择器提供五种搭配且默认沿用模板字体",
  fontDefault.labels.join("、") === "默认、无衬线、衬线、报刊、等宽" &&
    fontDefault.pressed === "默认" &&
    /system-ui|ui-sans-serif/.test(fontDefault.heading) &&
    /system-ui|ui-sans-serif/.test(fontDefault.body),
  JSON.stringify(fontDefault),
);

await clickFont("衬线");
await fontPage.waitForFunction(
  () => {
    try {
      return (
        JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}").font ===
        "serif"
      );
    } catch {
      return false;
    }
  },
  { timeout: 5000 },
);
const fontSerif = await readFontState();
expect(
  "选择衬线后标题与正文同时切换并保存",
  fontSerif.stored === "serif" &&
    fontSerif.pressed === "衬线" &&
    /Georgia|Songti/.test(fontSerif.heading) &&
    /Georgia|Songti/.test(fontSerif.body),
  JSON.stringify(fontSerif),
);

await clickFont("报刊");
const fontEditorial = await readFontState();
expect(
  "报刊搭配只让标题使用衬线",
  fontEditorial.stored === "editorial" &&
    /Georgia|Songti/.test(fontEditorial.heading) &&
    /system-ui|ui-sans-serif/.test(fontEditorial.body),
  JSON.stringify(fontEditorial),
);

await clickFont("等宽");
const fontMono = await readFontState();
expect(
  "等宽搭配使用等宽标题与无衬线正文",
  fontMono.stored === "mono" &&
    /mono/i.test(fontMono.heading) &&
    /system-ui|ui-sans-serif/.test(fontMono.body),
  JSON.stringify(fontMono),
);

await clickFont("衬线");
const fontTemplates = [];
for (const label of [
  "现代",
  "经典",
  "紧凑",
  "侧栏",
  "时间轴",
  "极简",
  "学术",
  "卡片",
]) {
  await clickText(fontPage, label);
  await pause(300);
  const state = await fontPage.evaluate(() => {
    const paper = document.querySelector(".resume-paper");
    const heading = paper?.querySelector("h1");
    const body = paper?.querySelector("section p");
    return {
      heading: heading ? getComputedStyle(heading).fontFamily : "",
      body: body ? getComputedStyle(body).fontFamily : "",
      name: paper?.textContent?.includes("林一") ?? false,
    };
  });
  fontTemplates.push({ label, ...state });
}
expect(
  "八套模板都应用所选字体",
  fontTemplates.every(
    (item) =>
      item.name &&
      /Georgia|Songti/.test(item.heading) &&
      /Georgia|Songti/.test(item.body),
  ),
  JSON.stringify(fontTemplates),
);
await clickText(fontPage, "现代");
await pause(300);

await fontPage.reload({ waitUntil: "networkidle0" });
await pause(700);
const fontReloaded = await readFontState();
expect(
  "字体搭配刷新后保留",
  fontReloaded.stored === "serif" &&
    fontReloaded.pressed === "衬线" &&
    /Georgia|Songti/.test(fontReloaded.heading),
  JSON.stringify(fontReloaded),
);

await fontPage.evaluate(() => {
  window.__fontExport = null;
  const originalCreate = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    window.__fontExport = blob;
    return originalCreate(blob);
  };
  HTMLAnchorElement.prototype.click = function () {};
});
await clickText(fontPage, "导出");
await fontPage.waitForFunction(() => Boolean(window.__fontExport), {
  timeout: 5000,
});
const exportedFont = await fontPage.evaluate(async () => {
  const payload = JSON.parse(await window.__fontExport.text());
  return (
    payload.documents?.find((document) => document.id === payload.activeId)
      ?.resume?.font ?? "none"
  );
});
expect("导出 JSON 保留字体搭配", exportedFont === "serif", exportedFont);

await pause(900);
await clickFont("等宽");
const monoBeforeUndo = await readFontState();
await fontPage.evaluate(() => {
  const root = document.querySelector('[data-qa="history-controls"]');
  [...(root?.querySelectorAll("button") ?? [])]
    .find((button) => button.getAttribute("aria-label") === "撤销")
    ?.click();
});
await fontPage.waitForFunction(
  () => {
    try {
      return (
        JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}").font ===
        "serif"
      );
    } catch {
      return false;
    }
  },
  { timeout: 5000 },
);
const fontUndone = await readFontState();
expect(
  "字体切换可撤销",
  monoBeforeUndo.stored === "mono" &&
    fontUndone.stored === "serif" &&
    fontUndone.pressed === "衬线",
  JSON.stringify({ before: monoBeforeUndo.stored, after: fontUndone.stored }),
);

await fontPage.setViewport({
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
await pause(300);
await clickText(fontPage, "预览");
await pause(300);
const fontMobile = await fontPage.evaluate(() => {
  const group = document.querySelector('[aria-label="简历字体"]');
  const templates = document.querySelector('[aria-label="简历模板"]');
  return {
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    fontButtons: group?.querySelectorAll("button").length ?? 0,
    templateButtons: templates?.querySelectorAll("button").length ?? 0,
    paper: Boolean(document.querySelector(".resume-paper")),
  };
});
expect(
  "390px 下八套模板与字体选择器无横向溢出",
  fontMobile.fontButtons === 5 &&
    fontMobile.templateButtons === 8 &&
    fontMobile.paper &&
    fontMobile.scrollWidth <= fontMobile.viewport + 1,
  JSON.stringify(fontMobile),
);
expect(
  "字体选择页面无控制台错误",
  fontPage.qaErrors.length === 0,
  fontPage.qaErrors.join("; "),
);
await fontPage.evaluate(() => localStorage.removeItem("resume-workshop:v1"));
await fontPage.close();

// 简历语言：中文 / 英文 / 双语、英文内容覆盖、跨模板、刷新、撤销与移动端
const languagePage = await open({ width: 1440, height: 1100 });
await languagePage.goto(BASE, { waitUntil: "networkidle0" });
await languagePage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.setItem("resume-workshop:template", "modern");
});
await languagePage.reload({ waitUntil: "networkidle0" });
await pause(700);

const readLanguageState = () =>
  languagePage.evaluate(() => {
    const group = document.querySelector('[aria-label="简历语言"]');
    const buttons = [...(group?.querySelectorAll("button") ?? [])];
    const paper = document.querySelector(".resume-paper");
    return {
      labels: buttons.map((button) => button.textContent?.trim() ?? ""),
      pressed:
        buttons
          .find((button) => button.getAttribute("aria-pressed") === "true")
          ?.textContent?.trim() ?? "",
      stored: (() => {
        try {
          return (
            JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}")
              .language ?? "none"
          );
        } catch {
          return "invalid";
        }
      })(),
      headings: [...(paper?.querySelectorAll("h2") ?? [])].map(
        (heading) => heading.textContent?.trim() ?? "",
      ),
      text: paper?.textContent ?? "",
    };
  });

const clickLanguage = async (label) => {
  await languagePage.evaluate((text) => {
    const group = document.querySelector('[aria-label="简历语言"]');
    [...(group?.querySelectorAll("button") ?? [])]
      .find((button) => button.textContent?.trim() === text)
      ?.click();
  }, label);
  await pause(400);
};

const languageDefault = await readLanguageState();
expect(
  "语言选择器提供中文 / 英文 / 双语且默认中文",
  languageDefault.labels.join("、") === "中文、英文、双语" &&
    languageDefault.pressed === "中文" &&
    languageDefault.headings.includes("个人简介") &&
    languageDefault.headings.includes("工作经历") &&
    languageDefault.text.includes("林一"),
  JSON.stringify({
    labels: languageDefault.labels,
    pressed: languageDefault.pressed,
    headings: languageDefault.headings,
  }),
);

await clickLanguage("英文");
await languagePage.waitForFunction(
  () => {
    try {
      return (
        JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}")
          .language === "en"
      );
    } catch {
      return false;
    }
  },
  { timeout: 5000 },
);
const languageEnglish = await readLanguageState();
expect(
  "切换英文后标题与英文内容生效并保存",
  languageEnglish.pressed === "英文" &&
    languageEnglish.stored === "en" &&
    ["SUMMARY", "EXPERIENCE", "PROJECTS", "EDUCATION", "SKILLS"].every(
      (label) => languageEnglish.headings.includes(label),
    ) &&
    languageEnglish.text.includes("Lin Yi") &&
    languageEnglish.text.includes("Xingye Technology") &&
    languageEnglish.text.includes("Present") &&
    languageEnglish.text.includes("Full-time") &&
    !languageEnglish.text.includes("个人简介"),
  JSON.stringify({
    pressed: languageEnglish.pressed,
    headings: languageEnglish.headings,
  }),
);
const languagePaperEnglish = await languagePage.$(".resume-paper");
if (languagePaperEnglish) {
  await languagePaperEnglish.screenshot({
    path: `${OUT}/qa-language-en.png`,
  });
}

const languageTemplates = [];
for (const label of [
  "现代",
  "经典",
  "紧凑",
  "侧栏",
  "时间轴",
  "极简",
  "学术",
  "卡片",
]) {
  await clickText(languagePage, label);
  await pause(250);
  const state = await languagePage.evaluate(() => {
    const paper = document.querySelector(".resume-paper");
    const headings = [...(paper?.querySelectorAll("h2") ?? [])].map(
      (heading) => heading.textContent?.trim() ?? "",
    );
    return {
      text: paper?.textContent ?? "",
      headings,
    };
  });
  languageTemplates.push({
    label,
    englishHeadings: ["EXPERIENCE", "EDUCATION"].every((heading) =>
      state.headings.includes(heading),
    ),
    englishContent: state.text.includes("Lin Yi") && state.text.includes("Present"),
  });
}
expect(
  "八套模板都应用英文标题与内容",
  languageTemplates.every((item) => item.englishHeadings && item.englishContent),
  JSON.stringify(languageTemplates),
);
await clickText(languagePage, "现代");
await pause(250);

await clickLanguage("双语");
const languageBilingual = await readLanguageState();
expect(
  "双语模式并列中英文标题与内容",
  languageBilingual.stored === "bilingual" &&
    languageBilingual.headings.includes("个人简介 / SUMMARY") &&
    languageBilingual.headings.includes("工作经历 / EXPERIENCE") &&
    languageBilingual.text.includes("林一 / Lin Yi") &&
    languageBilingual.text.includes("至今 / Present"),
  JSON.stringify({
    pressed: languageBilingual.pressed,
    headings: languageBilingual.headings,
  }),
);
const languagePaperBilingual = await languagePage.$(".resume-paper");
if (languagePaperBilingual) {
  await languagePaperBilingual.screenshot({
    path: `${OUT}/qa-language-bilingual.png`,
  });
}

await clickLanguage("英文");
await languagePage.evaluate(() => {
  const input = document.querySelector('[data-qa="translation-name"]');
  if (!input) return;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, "QA Tester");
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await pause(500);
const languageEdited = await languagePage.evaluate(() => {
  const stored = JSON.parse(
    localStorage.getItem("resume-workshop:v1") ?? "{}",
  );
  return {
    translated: stored.translation?.basic?.name ?? "",
    text: document.querySelector(".resume-paper")?.textContent ?? "",
  };
});
expect(
  "英文内容编辑器写入覆盖层并立即更新预览",
  languageEdited.translated === "QA Tester" &&
    languageEdited.text.includes("QA Tester"),
  JSON.stringify(languageEdited),
);

await languagePage.reload({ waitUntil: "networkidle0" });
await pause(700);
const languageReloaded = await readLanguageState();
expect(
  "英文语言与英文内容刷新后保留",
  languageReloaded.pressed === "英文" &&
    languageReloaded.stored === "en" &&
    languageReloaded.text.includes("QA Tester") &&
    languageReloaded.headings.includes("EXPERIENCE"),
  JSON.stringify({
    pressed: languageReloaded.pressed,
    stored: languageReloaded.stored,
  }),
);

await pause(900);
await clickLanguage("双语");
const bilingualBeforeUndo = await readLanguageState();
await languagePage.evaluate(() => {
  const root = document.querySelector('[data-qa="history-controls"]');
  [...(root?.querySelectorAll("button") ?? [])]
    .find((button) => button.getAttribute("aria-label") === "撤销")
    ?.click();
});
await languagePage.waitForFunction(
  () => {
    try {
      return (
        JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}")
          .language === "en"
      );
    } catch {
      return false;
    }
  },
  { timeout: 5000 },
);
const languageUndone = await readLanguageState();
expect(
  "切换简历语言可撤销",
  bilingualBeforeUndo.stored === "bilingual" &&
    languageUndone.stored === "en" &&
    languageUndone.pressed === "英文",
  JSON.stringify({
    before: bilingualBeforeUndo.stored,
    after: languageUndone.stored,
  }),
);

await languagePage.setViewport({
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
await pause(300);
await clickText(languagePage, "预览");
await pause(300);
const languageMobile = await languagePage.evaluate(() => {
  const group = document.querySelector('[aria-label="简历语言"]');
  return {
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    languageButtons: group?.querySelectorAll("button").length ?? 0,
    fontButtons:
      document
        .querySelector('[aria-label="简历字体"]')
        ?.querySelectorAll("button").length ?? 0,
    templateButtons:
      document
        .querySelector('[aria-label="简历模板"]')
        ?.querySelectorAll("button").length ?? 0,
    paper: Boolean(document.querySelector(".resume-paper")),
  };
});
expect(
  "390px 下语言选择器与其余工具栏无横向溢出",
  languageMobile.languageButtons === 3 &&
    languageMobile.fontButtons === 5 &&
    languageMobile.templateButtons === 8 &&
    languageMobile.paper &&
    languageMobile.scrollWidth <= languageMobile.viewport + 1,
  JSON.stringify(languageMobile),
);
expect(
  "简历语言页面无控制台错误",
  languagePage.qaErrors.length === 0,
  languagePage.qaErrors.join("; "),
);
await languagePage.evaluate(() =>
  localStorage.removeItem("resume-workshop:v1"),
);
await languagePage.close();

// AI 跟随简历语言：英文单段写英文覆盖层、双语拆成原文 + 覆盖层、英文整份写入英文主数据
const AI_TEXT_EN =
  "Frontend engineer with 4 years of experience specializing in React and performance optimization. Led a platform refactor that cut first-paint time by 40%.";
const AI_TEXT_BILINGUAL = [
  "4 年前端开发经验，专注 React 技术栈与性能优化。主导中后台平台重构，首屏加载时间降低 40%。",
  "===EN===",
  "Frontend engineer with 4 years of experience specializing in React and performance optimization. Led a platform refactor that cut first-paint time by 40%.",
].join("\n");
const FULL_RESUME_EN = {
  headline: "Frontend Engineer",
  city: "Shanghai",
  summary: "Frontend engineer with 4 years of experience.",
  intent: {
    targetRole: "Frontend Engineer",
    targetCity: "Shanghai",
    experience: "3–5 years",
  },
  educations: [
    {
      school: "East China University of Science and Technology",
      major: "Computer Science",
      degree: "Bachelor",
      start: "2017-09",
      end: "2021-06",
    },
  ],
  experiences: [
    {
      company: "Xinghe Technology",
      role: "Senior Frontend Engineer",
      start: "2023-03",
      end: "Present",
      description: [
        "Led the frontend architecture upgrade to React 18 and TypeScript",
        "Cut build time by 55%",
      ],
    },
  ],
  projects: [
    {
      name: "Visual Operations Console",
      role: "Tech Lead",
      start: "2023-05",
      end: "2024-06",
      description: "Built a drag-and-drop reporting platform.",
    },
  ],
  skills: ["React", "TypeScript"],
};
const aiLangPage = await open({ width: 1440, height: 1100 });
await interceptAi(aiLangPage, {
  text: (payload) =>
    payload.language === "en"
      ? AI_TEXT_EN
      : payload.language === "bilingual"
        ? AI_TEXT_BILINGUAL
        : AI_TEXT,
  fullText: (payload) =>
    payload.language === "en"
      ? JSON.stringify(FULL_RESUME_EN)
      : JSON.stringify(FULL_RESUME_JSON),
});
await aiLangPage.goto(BASE, { waitUntil: "networkidle0" });
await aiLangPage.evaluate(() => {
  localStorage.clear();
  localStorage.setItem("resume-workshop:template", "modern");
});
await aiLangPage.reload({ waitUntil: "networkidle0" });
await pause(600);

const clickAiLanguage = async (label) => {
  await aiLangPage.evaluate((text) => {
    const group = document.querySelector('[aria-label="简历语言"]');
    [...(group?.querySelectorAll("button") ?? [])]
      .find((button) => button.textContent?.trim() === text)
      ?.click();
  }, label);
  await aiLangPage.waitForFunction(
    (language) => {
      try {
        return (
          JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}")
            .language === language
        );
      } catch {
        return false;
      }
    },
    { timeout: 5000 },
    label === "英文" ? "en" : "bilingual",
  );
  await pause(300);
};

const openAiDialog = async () => {
  await aiLangPage.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("开始生成"))
      ?.click();
  });
  await aiLangPage.waitForSelector('[data-qa="ai-keywords"]', {
    timeout: 15000,
  });
};

const generateSummary = async () => {
  await setQaValue(
    aiLangPage,
    '[data-qa="ai-keywords"]',
    "4 年前端经验；主导中后台重构；首屏性能提升 40%",
  );
  await aiLangPage.waitForFunction(
    () => {
      const dialog = document.querySelector('[role="dialog"]');
      const generate = [...(dialog?.querySelectorAll("button") ?? [])].find(
        (button) => button.textContent?.trim() === "生成",
      );
      return Boolean(generate && !generate.disabled);
    },
    { timeout: 15000 },
  );
  await clickText(aiLangPage, "生成", '[role="dialog"]');
};

const adoptSummary = async () => {
  await clickText(aiLangPage, "采用到简历", '[role="dialog"]');
  await pause(200);
  const needsConfirm = await aiLangPage.evaluate(() =>
    [...document.querySelectorAll('[role="dialog"] button')].some(
      (button) => button.textContent?.trim() === "确认覆盖",
    ),
  );
  if (needsConfirm) {
    await clickText(aiLangPage, "确认覆盖", '[role="dialog"]');
  }
  await aiLangPage.waitForFunction(
    () => !document.querySelector('[role="dialog"]'),
    { timeout: 10000 },
  );
  await pause(500);
};

await clickAiLanguage("英文");
await openAiDialog();
const aiLangHint = await aiLangPage.$eval(
  '[data-qa="ai-language-hint"]',
  (element) => element.textContent ?? "",
);
expect(
  "英文模式下 AI 输出语言提示跟随简历",
  aiLangHint.includes("英文") && aiLangHint.includes("跟随简历语言"),
  aiLangHint,
);

await generateSummary();
await aiLangPage.waitForSelector('[aria-label="生成预览，可直接修改"]', {
  timeout: 15000,
});
await aiLangPage.waitForFunction(
  (expected) =>
    document.querySelector('[aria-label="生成预览，可直接修改"]')?.value ===
    expected,
  { timeout: 15000 },
  AI_TEXT_EN,
);
const aiEnPreview = await aiLangPage.$eval(
  '[aria-label="生成预览，可直接修改"]',
  (element) => element.value,
);
const aiEnPayload = aiLangPage.aiPayloads.at(-1) ?? {};
expect(
  "英文模式生成英文预览且请求携带 language",
  aiEnPreview === AI_TEXT_EN &&
    aiEnPayload.language === "en" &&
    !JSON.stringify(aiEnPayload).includes("linyi@example.com") &&
    !JSON.stringify(aiEnPayload).includes("138-0000-0000"),
  JSON.stringify({ language: aiEnPayload.language, preview: aiEnPreview }),
);
const aiLangDialog = await aiLangPage.$('[role="dialog"]');
if (aiLangDialog) {
  await aiLangDialog.screenshot({ path: `${OUT}/qa-ai-language-en.png` });
}

await adoptSummary();
const aiEnAdopted = await aiLangPage.evaluate(() => {
  const data = JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}");
  return {
    summaryZh: data.basic?.summary ?? "",
    summaryEn: data.translation?.basic?.summary ?? "",
    language: data.language,
  };
});
expect(
  "英文采用只写英文覆盖层，中文原文不变",
  aiEnAdopted.language === "en" &&
    aiEnAdopted.summaryEn === AI_TEXT_EN &&
    aiEnAdopted.summaryZh !== AI_TEXT_EN &&
    aiEnAdopted.summaryZh.includes("4 年前端开发经验"),
  JSON.stringify(aiEnAdopted),
);

await clickAiLanguage("双语");
await openAiDialog();
await generateSummary();
await aiLangPage.waitForSelector('[data-qa="ai-bilingual-preview"]', {
  timeout: 15000,
});
const aiBilingualPreview = await aiLangPage.evaluate(() => ({
  zh:
    document.querySelector('[aria-label="中文预览，可直接修改"]')?.value ?? "",
  en:
    document.querySelector('[aria-label="英文预览，可直接修改"]')?.value ?? "",
}));
const aiBilingualPayload = aiLangPage.aiPayloads.at(-1) ?? {};
expect(
  "双语模式拆分中文与英文预览并携带 language",
  aiBilingualPayload.language === "bilingual" &&
    aiBilingualPreview.zh.includes("4 年前端开发经验") &&
    aiBilingualPreview.en === AI_TEXT_EN &&
    !aiBilingualPreview.zh.includes("===EN===") &&
    !aiBilingualPreview.en.includes("===EN==="),
  JSON.stringify({
    language: aiBilingualPayload.language,
    zh: aiBilingualPreview.zh.slice(0, 40),
    en: aiBilingualPreview.en.slice(0, 40),
  }),
);

await adoptSummary();
const aiBilingualAdopted = await aiLangPage.evaluate(() => {
  const data = JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}");
  return {
    summaryZh: data.basic?.summary ?? "",
    summaryEn: data.translation?.basic?.summary ?? "",
    language: data.language,
  };
});
expect(
  "双语采用同时写入原文与英文覆盖层",
  aiBilingualAdopted.language === "bilingual" &&
    aiBilingualAdopted.summaryZh.includes("4 年前端开发经验") &&
    aiBilingualAdopted.summaryEn === AI_TEXT_EN,
  JSON.stringify(aiBilingualAdopted),
);

await clickAiLanguage("英文");
await openAiDialog();
await clickText(aiLangPage, "整份简历", '[role="dialog"]');
await aiLangPage.waitForSelector('[data-qa="ai-resume-brief"]', {
  timeout: 5000,
});
await setQaValue(
  aiLangPage,
  '[data-qa="ai-resume-brief"]',
  "2021 年本科毕业，计算机专业；在星河科技做前端 3 年，负责中后台重构；会用 React 与 TypeScript。",
);
await clickText(aiLangPage, "生成整份简历", '[role="dialog"]');
await aiLangPage.waitForSelector('[data-qa="ai-full-preview"]', {
  timeout: 20000,
});
await aiLangPage.waitForFunction(
  () =>
    (document.querySelector('[data-qa="ai-full-preview"]')?.textContent ?? "")
      .includes("Xinghe Technology"),
  { timeout: 15000 },
);
const aiFullEnPayload = aiLangPage.aiPayloads.at(-1) ?? {};
const aiFullEnPreview = await aiLangPage.$eval(
  '[data-qa="ai-full-preview"]',
  (element) => element.textContent ?? "",
);
expect(
  "英文整份生成输出英文预览并携带 language",
  aiFullEnPayload.language === "en" &&
    aiFullEnPreview.includes("Frontend Engineer") &&
    aiFullEnPreview.includes("Xinghe Technology") &&
    !aiFullEnPreview.includes("星野科技"),
  JSON.stringify({
    language: aiFullEnPayload.language,
    preview: aiFullEnPreview.slice(0, 100),
  }),
);

await clickText(aiLangPage, "生成新简历", '[role="dialog"]');
await aiLangPage.waitForFunction(
  () => !document.querySelector('[role="dialog"]'),
  { timeout: 10000 },
);
await pause(1300);
const aiFullEnAdopted = await aiLangPage.evaluate(() => {
  const data = JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}");
  const library = JSON.parse(
    localStorage.getItem("resume-workshop:library:v1") ?? "{}",
  );
  return {
    language: data.language,
    summary: data.basic?.summary ?? "",
    headline: data.basic?.headline ?? "",
    name: data.basic?.name ?? "",
    company: data.experiences?.[0]?.company ?? "",
    activeTitle: library.activeTitle,
  };
});
expect(
  "英文整份生成写入英文主数据并标记语言",
  aiFullEnAdopted.language === "en" &&
    aiFullEnAdopted.summary === FULL_RESUME_EN.summary &&
    aiFullEnAdopted.headline === "Frontend Engineer" &&
    aiFullEnAdopted.company === "Xinghe Technology" &&
    aiFullEnAdopted.name === "" &&
    aiFullEnAdopted.activeTitle === "Frontend Engineer",
  JSON.stringify(aiFullEnAdopted),
);
expect(
  "AI 跟随语言页面无控制台错误",
  aiLangPage.qaErrors.length === 0,
  aiLangPage.qaErrors.join("; "),
);
await aiLangPage.evaluate(() => localStorage.clear());
await aiLangPage.close();

// P3 页码开关与可访问性：命名页关闭页码、主题色圆点加大、移动端 aria-pressed
const printSettingsPage = await open({ width: 1440, height: 1000 });
await printSettingsPage.goto(BASE, { waitUntil: "networkidle0" });
await printSettingsPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.removeItem("resume-workshop:page-numbers");
});
await printSettingsPage.reload({ waitUntil: "networkidle0" });
await pause(600);

const swatchSize = await printSettingsPage.evaluate(() => {
  const swatch = document.querySelector('button[aria-label="靛蓝"]');
  return swatch?.getBoundingClientRect().width ?? 0;
});
expect("主题色圆点不小于 24px", swatchSize >= 23.5, String(swatchSize));

await printSettingsPage.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((button) => button.textContent?.trim().startsWith("页码"))
    ?.click();
});
await printSettingsPage.waitForFunction(
  () =>
    localStorage.getItem("resume-workshop:page-numbers") === "off" &&
    document.documentElement.dataset.pageNumbers === "off",
  { timeout: 5000 },
);
expect("页码开关可关闭", true);

await printSettingsPage.reload({ waitUntil: "networkidle0" });
await pause(600);
const pagesOffKept = await printSettingsPage.evaluate(
  () => document.documentElement.dataset.pageNumbers === "off",
);
expect("页码开关刷新后保留", pagesOffKept);

await printSettingsPage.emulateMediaType("print");
await pause(300);
const namedPage = await printSettingsPage.evaluate(() => ({
  body: getComputedStyle(document.body).getPropertyValue("page"),
  html: getComputedStyle(document.documentElement).getPropertyValue("page"),
}));
console.log(`qa-page-numbers: ${JSON.stringify(namedPage)}`);
expect(
  "关闭页码时使用无页码命名页",
  namedPage.body === "no-page-numbers" || namedPage.html === "no-page-numbers",
  JSON.stringify(namedPage),
);
await printSettingsPage.emulateMediaType("screen");

await printSettingsPage.setViewport({
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
await pause(300);
const paneAria = await printSettingsPage.evaluate(() =>
  [...document.querySelectorAll("button[aria-pressed]")]
    .filter((button) => ["编辑", "预览"].includes(button.textContent?.trim() ?? ""))
    .map((button) => ({
      text: button.textContent?.trim(),
      pressed: button.getAttribute("aria-pressed"),
    })),
);
expect(
  "手机端编辑/预览切换有 aria-pressed",
  paneAria.length === 2 &&
    paneAria.find((item) => item.text === "编辑")?.pressed === "true" &&
    paneAria.find((item) => item.text === "预览")?.pressed === "false",
  JSON.stringify(paneAria),
);

await printSettingsPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.removeItem("resume-workshop:page-numbers");
});
await printSettingsPage.close();

// 分页：长简历 + 手动分页，检查页数提示、引导线和标题页码按钮
const pagePage = await open({ width: 1440, height: 1100 });
await pagePage.goto(BASE, { waitUntil: "networkidle0" });
await pagePage.evaluate(() => {
  const experiences = Array.from({ length: 7 }, (_, index) => ({
    id: `qa-e${index}`,
    company: `示例科技有限公司 ${index + 1}`,
    role: "高级前端工程师",
    start: "2021.03",
    end: "2022.06",
    description:
      "负责核心业务前端架构设计与性能优化，主导中后台平台重构，覆盖 12 条业务线；" +
      "建设组件库与工程化体系，重复开发工时下降约 35%；" +
      "搭建前端监控与指标看板，线上白屏率由 1.2% 降至 0.3%。",
    ...(index === 3 ? { pageBreakBefore: true } : {}),
  }));
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: {
        name: "林一",
        headline: "前端工程师",
        email: "linyi@example.com",
        phone: "138-0000-0000",
        city: "上海",
        website: "linyi.dev",
        github: "github.com/linyi",
        summary:
          "4 年前端开发经验，专注 React 技术栈与性能优化，主导过日活 20 万的中后台产品重构。",
      },
      intent: {},
      educations: [],
      experiences,
      projects: [],
      skills: ["React", "TypeScript"],
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.setItem("resume-workshop:template", "modern");
});
await pagePage.reload({ waitUntil: "networkidle0" });
await new Promise((resolve) => setTimeout(resolve, 900));
const pageInfo = await pagePage.evaluate(() => {
  const pill = Array.from(document.querySelectorAll("span")).find((node) =>
    node.textContent?.includes("页 A4"),
  );
  return {
    pill: pill?.textContent?.trim() ?? "none",
    guides: Array.from(document.querySelectorAll("#resume-print span")).filter(
      (node) => node.textContent?.trim().startsWith("第 "),
    ).length,
    breakButtons: Array.from(document.querySelectorAll("button")).filter(
      (button) => button.innerText.trim() === "分页",
    ).length,
  };
});
await pagePage.screenshot({ path: `${OUT}/qa-pagination.png` });
await pagePage.emulateMediaType("print");
await new Promise((resolve) => setTimeout(resolve, 300));
await pagePage.pdf({
  path: `${OUT}/qa-pagination.pdf`,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await pagePage.close();
const pdfBytes = await readFile(`${OUT}/qa-pagination.pdf`);
const pdfPages = (pdfBytes.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? [])
  .length;
console.log(
  `qa-pagination: ${pageInfo.pill} | 分页按钮=${pageInfo.breakButtons} | 引导线=${pageInfo.guides} | pdfPages=${pdfPages}`,
);

// 侧栏模板多页：打印时侧栏只作用于首页，续页正文回到整宽
const sidebarPage = await open({ width: 1440, height: 1100 });
await sidebarPage.goto(BASE, { waitUntil: "networkidle0" });
await sidebarPage.evaluate(() => {
  const experiences = Array.from({ length: 14 }, (_, index) => ({
    id: `qa-sidebar-e${index}`,
    company: `示例科技有限公司 ${index + 1}`,
    role: "高级前端工程师",
    start: "2021.03",
    end: "2022.06",
    description:
      "负责核心业务前端架构设计与性能优化，主导中后台平台重构，覆盖 12 条业务线；" +
      "建设组件库与工程化体系，重复开发工时下降约 35%；" +
      "搭建前端监控与指标看板，线上白屏率由 1.2% 降至 0.3%。",
  }));
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: {
        name: "林一",
        headline: "前端工程师",
        email: "linyi@example.com",
        phone: "138-0000-0000",
        city: "上海",
        website: "linyi.dev",
        github: "github.com/linyi",
        summary:
          "4 年前端开发经验，专注 React 技术栈与性能优化，主导过日活 20 万的中后台产品重构。",
      },
      intent: {},
      educations: [],
      experiences,
      projects: [],
      skills: ["React", "TypeScript"],
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.setItem("resume-workshop:template", "sidebar");
});
await sidebarPage.reload({ waitUntil: "networkidle0" });
await pause(900);
await sidebarPage.emulateMediaType("print");
await pause(300);
const sidebarPrint = await sidebarPage.evaluate(() => {
  const side = document.querySelector(".resume-side");
  const paper = document.querySelector(".resume-paper-sidebar");
  return {
    float: side ? getComputedStyle(side).float : "none",
    sideWidth: side ? getComputedStyle(side).width : "0",
    paperDisplay: paper ? getComputedStyle(paper).display : "none",
    // 侧栏内容超过一页时，深色底必须跟着浮动盒跨页，否则续页是白底白字。
    sideBg: side ? getComputedStyle(side).backgroundImage : "none",
  };
});
const expectedSideWidth = (72 * 96) / 25.4;
expect(
  "侧栏打印浮动布局",
  sidebarPrint.float === "left" &&
    sidebarPrint.paperDisplay === "block" &&
    Math.abs(Number.parseFloat(sidebarPrint.sideWidth) - expectedSideWidth) < 1 &&
    sidebarPrint.sideBg.includes("gradient"),
  JSON.stringify(sidebarPrint),
);
await sidebarPage.screenshot({
  path: `${OUT}/qa-sidebar-multipage.png`,
  fullPage: true,
});
await sidebarPage.pdf({
  path: `${OUT}/qa-sidebar-multipage.pdf`,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await sidebarPage.close();
const sidebarBytes = await readFile(`${OUT}/qa-sidebar-multipage.pdf`);
const sidebarPages = (
  sidebarBytes.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []
).length;
console.log(
  `qa-sidebar: float=${sidebarPrint.float} width=${sidebarPrint.sideWidth} pdfPages=${sidebarPages}`,
);
expect("侧栏多页 PDF 页数", sidebarPages === 2, String(sidebarPages));

// 现代模板多页：分类栏是 CSS Grid，整块无法分片。修复前整段正文会被推到
// 第 2 页（首页只剩抬头），16 段经历会打出 3 页；打印时必须拆成浮动侧栏。
const modernPage = await open({ width: 1440, height: 1100 });
await modernPage.goto(BASE, { waitUntil: "networkidle0" });
await modernPage.evaluate(() => {
  const experiences = Array.from({ length: 16 }, (_, index) => ({
    id: `qa-modern-e${index}`,
    company: `示例科技有限公司 ${index + 1}`,
    role: "高级前端工程师",
    start: "2021.03",
    end: "2022.06",
    description:
      "负责核心业务前端架构设计与性能优化，主导中后台平台重构，覆盖 12 条业务线；" +
      "建设组件库与工程化体系，重复开发工时下降约 35%；" +
      "搭建前端监控与指标看板，线上白屏率由 1.2% 降至 0.3%。",
  }));
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: {
        name: "林一",
        headline: "前端工程师",
        email: "linyi@example.com",
        phone: "138-0000-0000",
        city: "上海",
        website: "",
        github: "",
        summary:
          "4 年前端开发经验，专注 React 技术栈与性能优化，主导过日活 20 万的中后台产品重构。",
      },
      intent: {
        targetRole: "高级前端工程师",
        targetCity: "上海",
        jobType: "全职",
        experience: "3-5年",
      },
      educations: [],
      experiences,
      projects: [],
      customSections: [],
      skills: ["React", "TypeScript", "Node.js", "Webpack"],
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.setItem("resume-workshop:template", "modern");
});
await modernPage.reload({ waitUntil: "networkidle0" });
await pause(900);
await modernPage.emulateMediaType("print");
await pause(300);
const modernPrint = await modernPage.evaluate(() => {
  const wrapper = document.querySelector(".resume-columns");
  const aside = document.querySelector(".resume-aside-grid > aside");
  return {
    display: wrapper ? getComputedStyle(wrapper).display : "none",
    asideFloat: aside ? getComputedStyle(aside).float : "none",
  };
});
expect(
  "现代模板打印改单栏流 + 侧栏浮动",
  modernPrint.display === "block" && modernPrint.asideFloat === "right",
  JSON.stringify(modernPrint),
);
await modernPage.pdf({
  path: `${OUT}/qa-modern-multipage.pdf`,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await modernPage.close();
const modernBytes = await readFile(`${OUT}/qa-modern-multipage.pdf`);
const modernPages = (
  modernBytes.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []
).length;
console.log(
  `qa-modern: display=${modernPrint.display} asideFloat=${modernPrint.asideFloat} pdfPages=${modernPages}`,
);
// 修复前：3 页（首页几乎空白）；修复后：2 页且首页排满正文
expect("现代模板多页不出现整页空白", modernPages === 2, String(modernPages));

// P3 推荐页：只有简介也能进入；JD 缺口可一键补进简历
const jobsP3Page = await open({ width: 1440, height: 1000 });
await jobsP3Page.goto(`${BASE}/#jobs`, { waitUntil: "networkidle0" });
await jobsP3Page.evaluate(() => {
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: {
        name: "林一",
        headline: "",
        summary: "3 年 B 端产品经验，负责过客服工单系统从 0 到 1 的设计。",
      },
      intent: {},
      educations: [],
      experiences: [],
      projects: [],
      skills: [],
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.removeItem("resume-workshop:jd");
});
await jobsP3Page.reload({ waitUntil: "networkidle0" });
await pause(800);
const relaxedJobs = await jobsP3Page.evaluate(() => {
  const text = document.body.innerText;
  return {
    hasEmptyState: text.includes("先填写简历，才能推荐文章"),
    hasPanel: text.includes("根据简历，找到该搜的岗位"),
  };
});
expect(
  "仅填写简介也能进入推荐页",
  !relaxedJobs.hasEmptyState && relaxedJobs.hasPanel,
  JSON.stringify(relaxedJobs),
);

await jobsP3Page.evaluate(() => {
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: { name: "林一", headline: "前端工程师" },
      intent: {},
      educations: [],
      experiences: [],
      projects: [],
      skills: ["React"],
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.removeItem("resume-workshop:jd");
});
await jobsP3Page.reload({ waitUntil: "networkidle0" });
await pause(800);
await jobsP3Page.type(
  "textarea",
  "任职要求：熟悉 Vue、Webpack、Vite，了解 Node.js 与前端工程化。",
);
await clickText(jobsP3Page, "分析匹配度");
await pause(600);
const missingSkill = await jobsP3Page.evaluate(() => {
  const button = document.querySelector('[data-qa="jd-missing"] button');
  return button?.textContent?.trim() ?? "";
});
expect("JD 缺口技能可点击", Boolean(missingSkill), missingSkill);
if (missingSkill) {
  await jobsP3Page.evaluate(() => {
    document.querySelector('[data-qa="jd-missing"] button')?.click();
  });
  await pause(1000);
  const addSkillResult = await jobsP3Page.evaluate((skill) => {
    const raw = localStorage.getItem("resume-workshop:v1") ?? "{}";
    const data = JSON.parse(raw);
    return {
      skills: data.skills ?? [],
      stillMissing: [...document.querySelectorAll('[data-qa="jd-missing"] button')]
        .some((button) => button.textContent?.trim() === skill),
      notice: document.body.innerText.includes(`已添加技能「${skill}」`),
    };
  }, missingSkill);
  expect(
    "点击 JD 缺口后写入简历并更新匹配结果",
    addSkillResult.skills.includes(missingSkill) &&
      !addSkillResult.stillMissing &&
      addSkillResult.notice,
    JSON.stringify(addSkillResult),
  );
}
await jobsP3Page.evaluate(() => {
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: { name: "林一", headline: "销售经理" },
      intent: { targetRole: "销售经理", targetCity: "宁波" },
      educations: [],
      experiences: [],
      projects: [],
      skills: ["客户开发", "商务谈判", "销售管理"],
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.removeItem("resume-workshop:jd");
});
await jobsP3Page.reload({ waitUntil: "networkidle0" });
await pause(800);
const expandedJobs = await jobsP3Page.evaluate(() => {
  const bossLink = [...document.querySelectorAll("a")].find((link) =>
    link.href.includes("zhipin.com/web/geek/job"),
  );
  const url = bossLink ? new URL(bossLink.href) : null;
  const text = document.body.innerText;
  return {
    city: url?.searchParams.get("city") ?? "",
    keyword: url?.searchParams.get("query") ?? "",
    hasProfile: text.includes("命中核心要求"),
    unknownProfile: text.includes("岗位画像未收录"),
  };
});
expect(
  "非技术岗位画像与新增城市编码可用",
  expandedJobs.hasProfile &&
    !expandedJobs.unknownProfile &&
    expandedJobs.city === "101210400" &&
    expandedJobs.keyword === "销售经理",
  JSON.stringify(expandedJobs),
);

await jobsP3Page.evaluate(() => {
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: { name: "林一", headline: "网络安全工程师" },
      intent: { targetRole: "网络安全工程师", targetCity: "上海" },
      educations: [],
      experiences: [],
      projects: [],
      skills: [
        "网络安全",
        "渗透测试",
        "漏洞挖掘",
        "等保",
        "Linux",
        "Python",
        "Web安全",
        "JavaScript",
        "TypeScript",
        "Kubernetes",
        "Go",
        "PostgreSQL",
        "Spring Boot",
        "CI/CD",
      ],
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.removeItem("resume-workshop:jd");
});
await jobsP3Page.reload({ waitUntil: "networkidle0" });
await pause(800);
const securityJobs = await jobsP3Page.evaluate(() => {
  const text = document.body.innerText;
  return {
    hasProfile: text.includes("命中核心要求"),
    unknownProfile: text.includes("岗位画像未收录"),
    role: text.includes("网络安全工程师"),
  };
});
expect(
  "新增网络安全岗位画像可用",
  securityJobs.hasProfile &&
    !securityJobs.unknownProfile &&
    securityJobs.role,
  JSON.stringify(securityJobs),
);

await jobsP3Page.type(
  "textarea",
  "熟悉 JS/TS、K8s、Golang、Postgres 与 SpringBoot，了解 CI/CD。",
);
await clickText(jobsP3Page, "分析匹配度");
await pause(600);
const aliasJd = await jobsP3Page.evaluate(() => {
  const text = document.body.innerText;
  return {
    summary: (text.match(/JD 关键词[^\n]*/) ?? [])[0] ?? "",
    covered: text.includes("全部覆盖"),
  };
});
expect(
  "JD 同义词归一到规范技能名",
  aliasJd.summary.includes("JD 关键词 7 个 · 已覆盖 7 个") &&
    aliasJd.covered,
  JSON.stringify(aliasJd),
);

await jobsP3Page.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.removeItem("resume-workshop:jd");
  localStorage.removeItem("resume-workshop:last-saved-at");
});
await jobsP3Page.close();

// P3 错误边界：未知路径显示自定义 404
const notFoundPage = await open({ width: 1000, height: 800 });
const notFoundResponse = await notFoundPage.goto(`${BASE}/qa-not-found`, {
  waitUntil: "networkidle0",
});
const notFoundText = await notFoundPage.evaluate(
  () => document.body.innerText,
);
expect(
  "未知路径显示自定义 404",
  notFoundResponse?.status() === 404 && notFoundText.includes("页面不存在"),
  `${notFoundResponse?.status()} ${notFoundText.slice(0, 60)}`,
);
await notFoundPage.close();

// P4：SEO / 分享卡片 / manifest / 图标
const [homeResponse, manifestResponse, iconResponse, ogResponse] =
  await Promise.all([
    fetch(`${BASE}/`),
    fetch(`${BASE}/manifest.webmanifest`),
    fetch(`${BASE}/icon-192.png`),
    fetch(`${BASE}/opengraph-image`),
  ]);
const homeHtml = await homeResponse.text();
const manifest = await manifestResponse.json();
const securityCsp =
  homeResponse.headers.get("content-security-policy") ?? "";
expect(
  "安全响应头完整",
  homeResponse.headers.get("x-content-type-options") === "nosniff" &&
    homeResponse.headers.get("x-frame-options") === "DENY" &&
    homeResponse.headers.get("referrer-policy") ===
      "strict-origin-when-cross-origin" &&
    homeResponse.headers.get("cross-origin-opener-policy") === "same-origin" &&
    homeResponse.headers.get("cross-origin-resource-policy") === "same-origin" &&
    homeResponse.headers.get("strict-transport-security") ===
      "max-age=31536000" &&
    (homeResponse.headers.get("permissions-policy") ?? "").includes(
      "camera=()",
    ) &&
    securityCsp.includes("default-src 'self'") &&
    securityCsp.includes("frame-ancestors 'none'") &&
    securityCsp.includes("object-src 'none'") &&
    securityCsp.includes("form-action 'self'"),
  JSON.stringify({
    csp: securityCsp,
    headers: Object.fromEntries(homeResponse.headers),
  }),
);
expect(
  "未暴露 X-Powered-By",
  !homeResponse.headers.has("x-powered-by"),
  homeResponse.headers.get("x-powered-by") ?? "",
);
expect(
  "首页包含 OG / Twitter / manifest / 图标元数据",
  homeResponse.ok &&
    homeHtml.includes('property="og:title"') &&
    homeHtml.includes('name="twitter:card"') &&
    homeHtml.includes('name="theme-color"') &&
    homeHtml.includes('rel="manifest"') &&
    homeHtml.includes("/icon.svg?"),
  `${homeResponse.status}`,
);
expect(
  "manifest 提供可安装信息与 192/512 图标",
  manifestResponse.ok &&
    manifest.name.includes("简历工坊") &&
    manifest.theme_color === "#1d4ed8" &&
    manifest.icons?.some((icon) => icon.sizes === "192x192") &&
    manifest.icons?.some((icon) => icon.sizes === "512x512"),
  JSON.stringify(manifest),
);
expect(
  "PWA 图标与 OG 图片可访问",
  iconResponse.ok &&
    iconResponse.headers.get("content-type")?.startsWith("image/png") &&
    ogResponse.ok &&
    ogResponse.headers.get("content-type")?.startsWith("image/png"),
  `${iconResponse.status} ${ogResponse.status}`,
);

// P2：简历链接可点击，并过滤危险协议
const linksPage = await open({ width: 1200, height: 900 });
await linksPage.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await linksPage.evaluate((resume) => {
  localStorage.setItem("resume-workshop:v1", JSON.stringify(resume));
  localStorage.setItem("resume-workshop:template", "modern");
  localStorage.removeItem("resume-workshop:last-saved-at");
}, {
  basic: {
    name: "林一",
    headline: "前端工程师",
    email: "lin@example.com",
    phone: "13800000000",
    city: "上海",
    website: "github.com/linyi",
    github: "",
    summary: "",
    photo: "",
  },
  intent: {
    targetRole: "前端工程师",
    targetCity: "上海",
    salaryMin: "",
    salaryMax: "",
    jobType: "全职",
    experience: "3-5年",
  },
  educations: [],
  experiences: [],
  projects: [
    {
      id: "qa-link-project",
      name: "作品集",
      role: "前端",
      start: "",
      end: "",
      description: "",
      link: "example.com/work",
    },
  ],
  customSections: [
    {
      id: "qa-link-section",
      title: "作品集",
      visible: true,
      items: [
        {
          id: "qa-link-safe",
          title: "个人网站",
          subtitle: "",
          date: "",
          description: "",
          link: "portfolio.example.com",
        },
        {
          id: "qa-link-unsafe",
          title: "危险链接",
          subtitle: "",
          date: "",
          description: "",
          link: "javascript:alert(1)",
        },
      ],
    },
  ],
  skills: ["React"],
  theme: { accent: "#1d4ed8" },
});
await linksPage.reload({ waitUntil: "networkidle0" });
await pause(600);
const linkResult = await linksPage.evaluate(() => {
  const anchors = [...document.querySelectorAll("#resume-print a[href]")].map(
    (anchor) => ({
      href: anchor.getAttribute("href"),
      text: anchor.textContent?.trim() ?? "",
    }),
  );
  const text = document.querySelector("#resume-print")?.textContent ?? "";
  return {
    anchors,
    hasUnsafeAnchor: anchors.some((anchor) =>
      anchor.href?.startsWith("javascript:"),
    ),
    showsUnsafeText: text.includes("javascript:alert(1)"),
  };
});
expect(
  "简历网站/项目/自定义链接可点击",
  linkResult.anchors.some(
    (anchor) =>
      anchor.href === "https://github.com/linyi" &&
      anchor.text === "github.com/linyi",
  ) &&
    linkResult.anchors.some(
      (anchor) =>
        anchor.href === "https://example.com/work" &&
        anchor.text === "example.com/work",
    ) &&
    linkResult.anchors.some(
      (anchor) =>
        anchor.href === "https://portfolio.example.com/" &&
        anchor.text === "portfolio.example.com",
    ),
  JSON.stringify(linkResult.anchors),
);
expect(
  "危险协议不渲染为链接",
  !linkResult.hasUnsafeAnchor && linkResult.showsUnsafeText,
  JSON.stringify(linkResult),
);
expect(
  "链接页面无控制台错误",
  linksPage.qaErrors.length === 0,
  linksPage.qaErrors.join("; "),
);
await linksPage.close();

// 全局撤销 / 重做：按钮、快捷键与自动保存
const historyPage = await open({ width: 1440, height: 1000 });
await historyPage.goto(BASE, { waitUntil: "networkidle0" });
await historyPage.evaluate(() => {
  localStorage.clear();
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: {
        name: "原名",
        headline: "前端工程师",
        email: "",
        phone: "",
        city: "",
        website: "",
        github: "",
        summary: "原始简介",
        photo: "",
      },
      intent: {},
      educations: [],
      experiences: [
        {
          id: "x1",
          company: "原公司",
          role: "前端",
          start: "",
          end: "",
          description: "原描述",
        },
      ],
      projects: [],
      customSections: [],
      skills: ["React"],
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.setItem("resume-workshop:template", "modern");
});
await historyPage.reload({ waitUntil: "networkidle0" });
await pause(700);

const readHistoryName = () =>
  historyPage.evaluate(() => {
    const label = [...document.querySelectorAll("label")].find((node) =>
      node.textContent?.includes("姓名"),
    );
    return label?.querySelector("input")?.value ?? "";
  });

const historyButtonStates = () =>
  historyPage.evaluate(() =>
    [...document.querySelectorAll('[data-qa="history-controls"] button')].map(
      (button) => ({
        label: button.getAttribute("aria-label") ?? "",
        disabled: button.disabled,
      }),
    ),
  );

const clickHistoryButton = (label) =>
  historyPage.evaluate((name) => {
    const root = document.querySelector('[data-qa="history-controls"]');
    const button = [...(root?.querySelectorAll("button") ?? [])].find(
      (item) => item.getAttribute("aria-label") === name,
    );
    if (!button || button.disabled) return false;
    button.click();
    return true;
  }, label);

const initialHistoryButtons = await historyButtonStates();
expect(
  "初始状态撤销与重做均不可用",
  initialHistoryButtons.length === 2 &&
    initialHistoryButtons.every((button) => button.disabled),
  JSON.stringify(initialHistoryButtons),
);

await setFieldByLabel(historyPage, "姓名", "新名字");
await pause(200);
expect("编辑后撤销按钮可用", await clickHistoryButton("撤销"), "撤销不可点击");
await pause(200);
const undoName = await readHistoryName();

expect("按钮重做按钮可用", await clickHistoryButton("重做"), "重做不可点击");
await pause(200);
const redoName = await readHistoryName();
expect(
  "按钮撤销 / 重做恢复内容",
  undoName === "原名" && redoName === "新名字",
  JSON.stringify({ undoName, redoName }),
);

await historyPage.evaluate(() => document.activeElement?.blur());
await historyPage.keyboard.down("Control");
await historyPage.keyboard.press("KeyZ");
await historyPage.keyboard.up("Control");
await pause(200);
const shortcutUndoName = await readHistoryName();

await historyPage.keyboard.down("Control");
await historyPage.keyboard.down("Shift");
await historyPage.keyboard.press("KeyZ");
await historyPage.keyboard.up("Shift");
await historyPage.keyboard.up("Control");
await pause(200);
const shortcutRedoName = await readHistoryName();
expect(
  "Ctrl+Z / Ctrl+Shift+Z 撤销与重做",
  shortcutUndoName === "原名" && shortcutRedoName === "新名字",
  JSON.stringify({ shortcutUndoName, shortcutRedoName }),
);

await pause(700);
const savedHistoryName = await historyPage.evaluate(() => {
  try {
    return JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}").basic
      ?.name;
  } catch {
    return null;
  }
});
expect(
  "撤销 / 重做结果自动保存",
  savedHistoryName === "新名字",
  JSON.stringify({ savedHistoryName }),
);

// 刷新后仍能撤销 / 重做：历史写入 sessionStorage，且只对应当前已保存内容
await setFieldByLabel(historyPage, "姓名", "刷新前");
await pause(1000);
const persistedHistory = await historyPage.evaluate(() => {
  try {
    const data = JSON.parse(
      sessionStorage.getItem("resume-workshop:history:v1") ?? "null",
    );
    return data
      ? {
          version: data.version,
          schemaVersion: data.schemaVersion,
          past: Array.isArray(data.past) ? data.past.length : 0,
          future: Array.isArray(data.future) ? data.future.length : 0,
        }
      : null;
  } catch {
    return null;
  }
});
expect(
  "撤销历史写入会话存储并带数据版本",
  persistedHistory?.version === 1 &&
    persistedHistory.schemaVersion >= 1 &&
    persistedHistory.past > 0,
  JSON.stringify(persistedHistory),
);

await historyPage.reload({ waitUntil: "networkidle0" });
await pause(700);
const reloadedHistoryButtons = await historyButtonStates();
expect(
  "刷新后撤销历史仍可用",
  reloadedHistoryButtons.find((button) => button.label === "撤销")?.disabled ===
    false,
  JSON.stringify(reloadedHistoryButtons),
);
expect(
  "刷新后空闲的重做栈保持为空",
  reloadedHistoryButtons.find((button) => button.label === "重做")?.disabled ===
    true,
  JSON.stringify(reloadedHistoryButtons),
);

await clickHistoryButton("撤销");
await pause(300);
const reloadUndoName = await readHistoryName();
expect(
  "刷新后撤销恢复到上次保存前的状态",
  reloadUndoName === "新名字",
  JSON.stringify({ reloadUndoName }),
);

await pause(900);
await historyPage.reload({ waitUntil: "networkidle0" });
await pause(700);
const afterUndoReloadButtons = await historyButtonStates();
expect(
  "刷新后重做历史仍可用",
  afterUndoReloadButtons.find((button) => button.label === "重做")?.disabled ===
    false,
  JSON.stringify(afterUndoReloadButtons),
);
await clickHistoryButton("重做");
await pause(300);
const reloadRedoName = await readHistoryName();
expect(
  "刷新后重做恢复修改",
  reloadRedoName === "刷新前",
  JSON.stringify({ reloadRedoName }),
);
await pause(900);

const countHistoryExperiences = () =>
  historyPage.evaluate(
    () => document.querySelectorAll('[aria-label="删除"]').length,
  );
const beforeAdd = await countHistoryExperiences();
await clickText(historyPage, "+ 添加工作经历");
await pause(200);
const afterAdd = await countHistoryExperiences();
await clickHistoryButton("撤销");
await pause(200);
const afterAddUndo = await countHistoryExperiences();
expect(
  "新增条目可全局撤销",
  beforeAdd === 1 && afterAdd === 2 && afterAddUndo === 1,
  JSON.stringify({ beforeAdd, afterAdd, afterAddUndo }),
);

await historyPage.screenshot({ path: `${OUT}/qa-history.png` });
expect(
  "撤销 / 重做页面无控制台错误",
  historyPage.qaErrors.length === 0,
  historyPage.qaErrors.join("; "),
);
await historyPage.close();

// P2：技能分组 / 熟练度：旧数据兼容、表单保存与八种模板展示
const skillPage = await open({ width: 1440, height: 1000 });
await skillPage.goto(BASE, { waitUntil: "networkidle0" });
await skillPage.evaluate(() => {
  localStorage.clear();
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: {
        name: "林一",
        headline: "前端工程师",
        email: "",
        phone: "",
        city: "",
        website: "",
        github: "",
        summary: "",
        photo: "",
      },
      intent: {},
      educations: [],
      experiences: [],
      projects: [],
      customSections: [],
      skills: ["React", "Node.js"],
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.setItem("resume-workshop:template", "modern");
});
await skillPage.reload({ waitUntil: "networkidle0" });
await pause(700);

const flatSkillView = await skillPage.evaluate(() => {
  const text = document.querySelector("#resume-print")?.textContent ?? "";
  return {
    hasSkills: text.includes("React") && text.includes("Node.js"),
    hasLevel: text.includes("（精通）") || text.includes("（熟练）"),
    hasGroupEditor: Boolean(document.querySelector('[data-qa="skill-groups"]')),
  };
});
expect(
  "没有分组的老数据保持扁平技能展示",
  flatSkillView.hasSkills && !flatSkillView.hasLevel && !flatSkillView.hasGroupEditor,
  JSON.stringify(flatSkillView),
);

let skillPromptReply = "前端";
skillPage.on("dialog", async (dialog) => {
  await dialog.accept(skillPromptReply);
});
await clickText(skillPage, "＋ 新建分组");
await pause(300);
const skillGroupCards = await skillPage.evaluate(() => {
  const root = document.querySelector('[data-qa="skill-groups"]');
  return [...(root?.children ?? [])].map(
    (node) => node.querySelector("span")?.textContent?.trim() ?? "",
  );
});
expect(
  "新建分组后出现分组与未分组两栏",
  skillGroupCards.length === 2 &&
    skillGroupCards[0] === "前端" &&
    skillGroupCards[1] === "未分组",
  JSON.stringify(skillGroupCards),
);

await setQaValue(skillPage, '[data-qa="skill-form"] input', "TypeScript");
await selectByOptionText(skillPage, "精通", '[data-qa="skill-form"]');
await clickText(skillPage, "添加", '[data-qa="skill-form"]');
await pause(900);
const savedSkillMeta = await skillPage.evaluate(() => {
  try {
    const data = JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}");
    return {
      skills: data.skills ?? [],
      meta: data.skillMeta ?? {},
      groups: data.skillGroups ?? [],
    };
  } catch {
    return null;
  }
});
expect(
  "新技能按所选分组与熟练度保存",
  Boolean(savedSkillMeta) &&
    savedSkillMeta.skills.includes("TypeScript") &&
    savedSkillMeta.meta.TypeScript?.level === "精通" &&
    savedSkillMeta.meta.TypeScript?.group === "前端" &&
    savedSkillMeta.groups.includes("前端"),
  JSON.stringify(savedSkillMeta),
);

const detailedSkillsResume = {
  basic: {
    name: "林一",
    headline: "前端工程师",
    email: "",
    phone: "",
    city: "",
    website: "",
    github: "",
    summary: "",
    photo: "",
  },
  intent: {},
  educations: [],
  experiences: [],
  projects: [],
  customSections: [],
  skills: ["React", "Node.js", "Rust"],
  skillGroups: ["前端", "后端"],
  skillMeta: {
    React: { level: "精通", group: "前端" },
    "Node.js": { level: "熟练", group: "后端" },
    Rust: { level: "了解", group: "" },
  },
  theme: { accent: "#1d4ed8" },
};

const templateSkillResults = [];
for (const template of [
  "modern",
  "classic",
  "compact",
  "sidebar",
  "timeline",
  "minimal",
  "academic",
  "card",
]) {
  await skillPage.evaluate(
    ({ resume, templateId }) => {
      localStorage.setItem("resume-workshop:v1", JSON.stringify(resume));
      localStorage.setItem("resume-workshop:template", templateId);
    },
    { resume: detailedSkillsResume, templateId: template },
  );
  await skillPage.reload({ waitUntil: "networkidle0" });
  await pause(500);
  const text = await skillPage.evaluate(
    () => document.querySelector("#resume-print")?.textContent ?? "",
  );
  templateSkillResults.push({
    template,
    groups: text.includes("前端") && text.includes("后端"),
    levels: text.includes("React（精通）") && text.includes("Rust（了解）"),
  });
}
expect(
  "八种模板都渲染技能分组与熟练度",
  templateSkillResults.every((item) => item.groups && item.levels),
  JSON.stringify(templateSkillResults),
);

await skillPage.screenshot({ path: `${OUT}/qa-skills.png` });
expect(
  "技能分组页面无控制台错误",
  skillPage.qaErrors.length === 0,
  skillPage.qaErrors.join("; "),
);
await skillPage.close();

// 投递看板：新建、状态流转、多 JD、导出与刷新保留
const applicationPage = await open({ width: 1440, height: 1000 });
await applicationPage.goto(`${BASE}/#jobs`, { waitUntil: "networkidle0" });
await applicationPage.evaluate((resume) => {
  localStorage.clear();
  localStorage.setItem("resume-workshop:v1", JSON.stringify(resume));
  localStorage.setItem("resume-workshop:template", "modern");
  localStorage.setItem(
    "resume-workshop:jd",
    "任职要求：熟悉 React 与 TypeScript，有中后台经验。",
  );
}, coverResume);
await applicationPage.reload({ waitUntil: "networkidle0" });
await pause(700);
await applicationPage.waitForSelector('[data-qa="application-board"]', {
  timeout: 15000,
});
await applicationPage.click('[data-qa="application-create"]');
await applicationPage.waitForSelector('[data-qa="application-form"]', {
  timeout: 15000,
});
const applicationPrefillJd = await applicationPage.$eval(
  '[data-qa="application-jd"]',
  (element) => element.value,
);
expect(
  "新建投递默认带入当前 JD",
  applicationPrefillJd.includes("任职要求"),
  applicationPrefillJd.slice(0, 80),
);

const APPLICATION_JD =
  "岗位 JD：负责 React 中后台开发，要求 TypeScript 与性能优化经验。";
await setQaValue(applicationPage, '[data-qa="application-company"]', "星野科技");
await setQaValue(applicationPage, '[data-qa="application-role"]', "前端工程师");
await setQaValue(applicationPage, '[data-qa="application-city"]', "上海");
await selectByOptionText(applicationPage, "已投", '[data-qa="application-form"]');
await setQaValue(
  applicationPage,
  '[data-qa="application-applied-at"]',
  "2026-10-20",
);
await setQaValue(
  applicationPage,
  '[data-qa="application-next-action"]',
  "2026-10-27",
);
await setQaValue(applicationPage, '[data-qa="application-jd"]', APPLICATION_JD);
await setQaValue(
  applicationPage,
  '[data-qa="application-cover-letter"]',
  "尊敬的招聘负责人：\n\n我有 4 年前端经验。\n\n此致\n敬礼",
);
await setQaValue(
  applicationPage,
  '[data-qa="application-note"]',
  "周三上午一面",
);
await applicationPage.click('[data-qa="application-save"]');
await applicationPage.waitForFunction(
  () => Boolean(document.querySelector('[data-qa="application-card"]')),
  { timeout: 10000 },
);
await pause(300);

const savedApplication = await applicationPage.evaluate(() => {
  try {
    const list = JSON.parse(
      localStorage.getItem("resume-workshop:applications:v1") ?? "[]",
    );
    return list[0] ?? null;
  } catch {
    return null;
  }
});
expect(
  "新建投递保存公司、岗位、状态、日期与 JD",
  savedApplication?.company === "星野科技" &&
    savedApplication?.role === "前端工程师" &&
    savedApplication?.status === "applied" &&
    savedApplication?.appliedAt === "2026-10-20" &&
    savedApplication?.nextActionAt === "2026-10-27" &&
    savedApplication?.jd === APPLICATION_JD &&
    savedApplication?.note === "周三上午一面" &&
    savedApplication?.coverLetter.includes("此致"),
  JSON.stringify(savedApplication),
);

await selectByOptionText(
  applicationPage,
  "面试中",
  '[data-qa="application-column-applied"]',
);
await pause(400);
const movedStatus = await applicationPage.evaluate(() => {
  try {
    return JSON.parse(
      localStorage.getItem("resume-workshop:applications:v1") ?? "[]",
    )[0]?.status;
  } catch {
    return null;
  }
});
expect("投递状态可流转并立即保存", movedStatus === "interview", String(movedStatus));

await applicationPage.click('[data-qa="application-details"]');
await applicationPage.waitForSelector('[data-qa="application-use-jd"]', {
  timeout: 5000,
});
await applicationPage.click('[data-qa="application-use-jd"]');
await pause(300);
const activeJd = await applicationPage.evaluate(
  () => localStorage.getItem("resume-workshop:jd") ?? "",
);
expect(
  "可把某条投递的 JD 设为当前 JD",
  activeJd === APPLICATION_JD,
  activeJd.slice(0, 80),
);

await applicationPage.evaluate(() => {
  window.__qaExportedBlob = null;
  window.__qaDownloadName = "";
  const original = URL.createObjectURL;
  URL.createObjectURL = (blob) => {
    window.__qaExportedBlob = blob;
    return original.call(URL, blob);
  };
  HTMLAnchorElement.prototype.click = function () {
    window.__qaDownloadName = this.download;
  };
});
await clickText(applicationPage, "导出");
await applicationPage.waitForFunction(
  () => Boolean(window.__qaExportedBlob),
  { timeout: 5000 },
);
const applicationArchive = await applicationPage.evaluate(async () => {
  const payload = JSON.parse(await window.__qaExportedBlob.text());
  return {
    version: payload.version,
    applications: payload.applications ?? [],
    downloadName: window.__qaDownloadName,
  };
});
expect(
  "整库备份包含投递记录且版本升级",
  applicationArchive.version === 3 &&
    applicationArchive.applications.length === 1 &&
    applicationArchive.applications[0]?.company === "星野科技" &&
    applicationArchive.applications[0]?.jd === APPLICATION_JD,
  JSON.stringify({
    version: applicationArchive.version,
    count: applicationArchive.applications.length,
  }),
);

await applicationPage.reload({ waitUntil: "networkidle0" });
await pause(600);
const applicationAfterReload = await applicationPage.evaluate(() => ({
  cards: document.querySelectorAll('[data-qa="application-card"]').length,
  company:
    document.querySelector('[data-qa="application-card"] h4')?.textContent ??
    "",
  notice: document.querySelector('[data-qa="application-board"]')
    ?.textContent ?? "",
}));
expect(
  "刷新后投递记录仍保留",
  applicationAfterReload.cards === 1 &&
    applicationAfterReload.company.includes("星野科技") &&
    applicationAfterReload.notice.includes("1 条记录"),
  JSON.stringify({
    cards: applicationAfterReload.cards,
    company: applicationAfterReload.company,
  }),
);

await applicationPage.setViewport({
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
await applicationPage.reload({ waitUntil: "networkidle0" });
await pause(600);
const applicationMobile = await applicationPage.evaluate(() => ({
  viewport: window.innerWidth,
  pageWidth: document.documentElement.scrollWidth,
  boardWidth:
    document.querySelector('[data-qa="application-board"]')?.scrollWidth ?? 0,
}));
expect(
  "投递看板在 390px 无横向溢出",
  applicationMobile.pageWidth <= applicationMobile.viewport &&
    applicationMobile.boardWidth <= applicationMobile.viewport,
  JSON.stringify(applicationMobile),
);

await applicationPage.setViewport({
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
});
await applicationPage.reload({ waitUntil: "networkidle0" });
await pause(600);
const applicationBoardElement = await applicationPage.$(
  '[data-qa="application-board"]',
);
if (applicationBoardElement) {
  await applicationBoardElement.screenshot({
    path: `${OUT}/qa-applications.png`,
  });
}
expect(
  "投递看板页面无控制台错误",
  applicationPage.qaErrors.length === 0,
  applicationPage.qaErrors.join(" | "),
);
await applicationPage.close();

// P2 待投清单：批量导入 → 按匹配度排序 → 准备/标记已投
const queuePage = await open({ width: 1440, height: 1100 });
await queuePage.goto(`${BASE}/#jobs`, { waitUntil: "networkidle0" });
await queuePage.evaluate(() => {
  localStorage.removeItem("resume-workshop:applications:v1");
  localStorage.removeItem("resume-workshop:jd");
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: {
        name: "林一",
        headline: "前端工程师",
        email: "linyi@example.com",
        phone: "138-0000-0000",
        city: "上海",
        website: "",
        github: "",
        summary:
          "5 年前端开发经验，负责中后台系统、组件库与性能优化，主导过日活 20 万产品的重构。",
      },
      intent: { targetRole: "前端工程师", targetCity: "上海" },
      educations: [],
      experiences: [
        {
          id: "queue-e1",
          company: "某厂",
          role: "前端工程师",
          start: "2021.03",
          end: "至今",
          description:
            "使用 React 与 TypeScript 开发中后台系统，封装 40+ 业务组件；接入 Vite 构建，首屏时间下降 45%。",
        },
      ],
      projects: [],
      skills: ["React", "TypeScript", "Webpack", "Vite", "HTML", "CSS"],
      theme: { accent: "#1d4ed8" },
    }),
  );
});
await queuePage.reload({ waitUntil: "networkidle0" });
await pause(800);
await queuePage.click('[data-qa="job-import-open"]');
await pause(300);
await queuePage.type(
  'textarea[aria-label="粘贴岗位描述"]',
  [
    "某科技 | 高级前端工程师",
    "负责中后台系统开发，要求 3 年以上经验，熟悉 React、TypeScript、Webpack 与性能优化。",
    "---",
    "某金融 | Java 后端工程师",
    "负责交易系统，要求熟悉 Spring Boot、MySQL、Redis、微服务与高并发。",
  ].join("\n"),
);
await pause(300);
await queuePage.click('[data-qa="job-import-submit"]');
await queuePage.waitForSelector('[data-qa="job-queue-list"] li', {
  timeout: 5000,
});
await pause(400);
const queueState = await queuePage.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-qa="job-queue-list"] li')];
  return {
    rows: rows.map((row) => row.innerText),
    scores: rows.map((row) => Number(row.innerText.trim().split("\n")[0])),
    stored: JSON.parse(
      localStorage.getItem("resume-workshop:applications:v1") ?? "[]",
    ).length,
    pageWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  };
});
expect(
  "批量导入按匹配度排序",
  queueState.stored === 2 &&
    queueState.rows.length === 2 &&
    queueState.scores[0] > queueState.scores[1] &&
    queueState.pageWidth <= queueState.viewport,
  JSON.stringify(queueState),
);

// 准备 → 标记为已投：记录应离开待投清单并进入看板
await queuePage.click('[data-qa="job-prepare"]');
await pause(400);
const prepDialogText = await queuePage.evaluate(
  () => document.querySelector('[data-qa="job-prep-dialog"]')?.innerText ?? "",
);
expect(
  "准备弹窗显示匹配与 JD",
  prepDialogText.includes("关键词覆盖") && prepDialogText.includes("JD 原文"),
  prepDialogText.slice(0, 80),
);
await queuePage.click('[data-qa="job-mark-applied"]');
await pause(500);
const afterApplied = await queuePage.evaluate(() => ({
  queueCount: document.querySelectorAll('[data-qa="job-queue-list"] li').length,
  applied: JSON.parse(
    localStorage.getItem("resume-workshop:applications:v1") ?? "[]",
  ).filter((item) => item.status === "applied").length,
}));
expect(
  "标记已投后离开待投清单",
  afterApplied.queueCount === 1 && afterApplied.applied === 1,
  JSON.stringify(afterApplied),
);

// 准备 → 设为当前 JD 并打开求职信
await queuePage.click('[data-qa="job-prepare"]');
await pause(400);
await queuePage.click('[data-qa="job-prepare-letter"]');
await pause(600);
const letterOpened = await queuePage.evaluate(() => ({
  dialog: Boolean(document.querySelector('[data-qa="cover-dialog"]')),
  jdLength: (localStorage.getItem("resume-workshop:jd") ?? "").length,
}));
expect(
  "准备岗位会写入当前 JD 并打开求职信",
  letterOpened.dialog && letterOpened.jdLength > 0,
  JSON.stringify(letterOpened),
);

// 按 JD 优化简历：切回编辑页并打开 AI 写作弹窗（弹窗自己读取当前 JD）
await queuePage.keyboard.press("Escape");
await pause(400);
await queuePage.click('[data-qa="job-prepare"]');
await pause(400);
await queuePage.click('[data-qa="job-optimize-resume"]');
await pause(900);
const optimizeState = await queuePage.evaluate(() => ({
  hash: location.hash,
  dialog: Boolean(document.querySelector('[data-qa="ai-writer-dialog"]')),
  jdLength: (localStorage.getItem("resume-workshop:jd") ?? "").length,
}));
expect(
  "按 JD 优化简历会切到编辑页并打开 AI 写作",
  optimizeState.hash !== "#jobs" &&
    optimizeState.dialog &&
    optimizeState.jdLength > 0,
  JSON.stringify(optimizeState),
);
await queuePage.close();

// P3 扩展桥：页面收到 postMessage 后自动切到推荐页并预填导入弹窗
const bridgePage = await open({ width: 1440, height: 1000 });
await bridgePage.goto(BASE, { waitUntil: "networkidle0" });
await pause(800);
await bridgePage.evaluate(() => {
  window.postMessage(
    {
      source: "resume-workshop-extension",
      type: "lead",
      payload: {
        company: "扩展公司",
        role: "前端工程师",
        jd: "熟悉 React 与 TypeScript，3 年以上经验。",
      },
    },
    window.location.origin,
  );
});
await pause(800);
const bridgeResult = await bridgePage.evaluate(() => ({
  hash: location.hash,
  dialog: Boolean(document.querySelector('[data-qa="job-import-dialog"]')),
  text:
    document.querySelector('textarea[aria-label="粘贴岗位描述"]')?.value ?? "",
}));
expect(
  "扩展投递的岗位自动打开导入弹窗并预填",
  bridgeResult.hash === "#jobs" &&
    bridgeResult.dialog &&
    bridgeResult.text.includes("扩展公司") &&
    bridgeResult.text.includes("React"),
  JSON.stringify(bridgeResult),
);

await bridgePage.evaluate(() => {
  document.querySelector('[data-qa="job-import-close"]')?.click();
});
await pause(300);
await bridgePage.evaluate(() => {
  window.postMessage(
    { source: "evil", type: "lead", payload: { jd: "伪造内容" } },
    window.location.origin,
  );
});
await pause(500);
const spoofedMessage = await bridgePage.evaluate(() =>
  Boolean(document.querySelector('[data-qa="job-import-dialog"]')),
);
expect(
  "忽略来源不匹配的消息",
  !spoofedMessage,
  String(spoofedMessage),
);
await bridgePage.close();

// P3 扩展提取脚本：拦截一个假的 BOSS 岗位页，验证站点选择器能取到公司/岗位/JD
const extractPage = await browser.newPage();
await extractPage.setRequestInterception(true);
extractPage.on("request", (request) => {
  if (request.url().includes("zhipin.com")) {
    request.respond({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><html><head><meta charset="utf-8"></head><body>
        <div class="job-banner"><div class="name"><h1>高级前端工程师</h1></div></div>
        <div class="company-info"><span class="name">示例科技</span></div>
        <div class="job-sec-text">负责中后台系统开发，要求熟悉 React 与 TypeScript，3 年以上经验；
          建设组件库与工程化体系，推动性能优化与首屏提速。这段描述足够长，用来模拟真实岗位的正文区域。</div>
      </body></html>`,
    });
    return;
  }
  request.continue();
});
await extractPage.goto("https://www.zhipin.com/job_detail/qa-fixture.html", {
  waitUntil: "domcontentloaded",
});
await extractPage.evaluate(() => {
  window.chrome = {
    runtime: { onMessage: { addListener: (fn) => { window.__extractHandler = fn; } } },
  };
});
await extractPage.addScriptTag({
  path: path.join(process.cwd(), "extension/content-job.js"),
});
const extracted = await extractPage.evaluate(
  () =>
    new Promise((resolve) => {
      const handler = window.__extractHandler;
      if (!handler) {
        resolve(null);
        return;
      }
      handler({ type: "extract" }, null, (response) => resolve(response));
    }),
);
expect(
  "扩展能按站点选择器提取公司 / 岗位 / JD",
  extracted?.ok &&
    extracted.lead.company === "示例科技" &&
    extracted.lead.role.includes("前端") &&
    extracted.lead.jd.includes("React"),
  JSON.stringify(extracted),
);

// 同一页面再加一个投递表单，验证自动填表：只填文本字段、跳过身份证
await extractPage.evaluate(() => {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<form>
      <label>姓名 <input id="f-name" /></label>
      <label>手机号 <input id="f-phone" type="tel" /></label>
      <label>邮箱 <input id="f-email" type="email" /></label>
      <label>期望城市 <input id="f-city" /></label>
      <label>身份证号 <input id="f-id" /></label>
    </form>`,
  );
});
const fillResult = await extractPage.evaluate(
  () =>
    new Promise((resolve) => {
      window.__extractHandler(
        {
          type: "fill",
          profile: {
            name: "林一",
            phone: "13800000000",
            email: "linyi@example.com",
            city: "上海",
            role: "",
            summary: "",
          },
        },
        null,
        (response) =>
          resolve({
            response,
            values: {
              name: document.getElementById("f-name").value,
              phone: document.getElementById("f-phone").value,
              email: document.getElementById("f-email").value,
              city: document.getElementById("f-city").value,
              id: document.getElementById("f-id").value,
            },
          }),
      );
    }),
);
expect(
  "扩展能填表并跳过身份证等敏感字段",
  fillResult.response.ok &&
    fillResult.values.name === "林一" &&
    fillResult.values.phone === "13800000000" &&
    fillResult.values.email === "linyi@example.com" &&
    fillResult.values.city === "上海" &&
    fillResult.values.id === "",
  JSON.stringify(fillResult),
);
await extractPage.close();

// ATS 纯文本 / Markdown 导出与 JD 关键词覆盖
const atsPage = await open({ width: 1440, height: 1000 });
await atsPage.goto(BASE, { waitUntil: "networkidle0" });
await atsPage.evaluate(() => {
  localStorage.clear();
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: {
        name: "ATS测试",
        headline: "前端工程师",
        email: "ats@example.com",
        phone: "13800138000",
        city: "上海",
        website: "https://ats.example.com",
        github: "https://github.com/ats",
        summary: "5 年前端经验，负责 React 项目。",
      },
      intent: {
        targetRole: "前端工程师",
        targetCity: "上海",
        salaryMin: "20",
        salaryMax: "30",
        jobType: "全职",
        experience: "3-5年",
      },
      educations: [
        {
          school: "某大学",
          major: "计算机",
          degree: "本科",
          start: "2018",
          end: "2022",
          gpa: "3.8",
          ranking: "前 10%",
          courses: "数据结构",
          honors: "一等奖学金",
        },
      ],
      experiences: [
        {
          company: "某公司",
          role: "前端工程师",
          start: "2022",
          end: "至今",
          description: "负责 React 与 TypeScript 开发\n首屏性能优化 30%",
        },
      ],
      projects: [
        {
          name: "开源项目",
          role: "作者",
          start: "2023",
          end: "2024",
          description: "使用 Vite 构建",
          link: "https://github.com/example/project",
        },
      ],
      customSections: [
        {
          title: "证书",
          visible: true,
          items: [
            {
              title: "CET-6",
              subtitle: "教育部",
              date: "2021",
              description: "",
              link: "",
            },
          ],
        },
      ],
      skills: ["React", "TypeScript", "Docker"],
      skillGroups: ["前端"],
      skillMeta: {
        React: { level: "精通", group: "前端" },
        TypeScript: { level: "熟练", group: "前端" },
        Docker: { level: "熟练", group: "" },
      },
      theme: { accent: "#1d4ed8" },
    }),
  );
  localStorage.setItem("resume-workshop:template", "classic");
  localStorage.setItem(
    "resume-workshop:jd",
    "熟悉 React、TypeScript 与 Kubernetes，了解 Docker",
  );
});
await atsPage.reload({ waitUntil: "networkidle0" });
await pause(600);
await atsPage.click('[data-qa="ats-export"]');
await atsPage.waitForSelector('[data-qa="ats-dialog"]', { timeout: 5000 });
await pause(200);
const atsState = await atsPage.evaluate(() => {
  const preview = document.querySelector('[data-qa="ats-preview"]');
  const coverage = document.querySelector('[data-qa="ats-coverage"]');
  const missing = document.querySelector('[data-qa="ats-missing"]');
  const dialog = document.querySelector('[data-qa="ats-dialog"]');
  const rect = dialog?.getBoundingClientRect();
  return {
    text: preview?.textContent ?? "",
    score: Number(coverage?.getAttribute("data-score") ?? "-1"),
    missing: missing?.textContent ?? "",
    dialogInViewport: rect
      ? rect.left >= 0 && rect.right <= window.innerWidth
      : false,
    viewport: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
  };
});
expect(
  "ATS 纯文本包含线性简历信息且不输出分栏与技能等级",
  atsState.text.includes("ATS测试\n前端工程师") &&
    atsState.text.includes(
      "ats@example.com · 13800138000 · 上海",
    ) &&
    atsState.text.includes(
      "工作经历\n某公司 | 前端工程师 | 2022 – 至今\n- 负责 React 与 TypeScript 开发\n- 首屏性能优化 30%",
    ) &&
    atsState.text.includes(
      "项目经历\n开源项目 | 作者 | 2023 – 2024\n链接：https://github.com/example/project\n使用 Vite 构建",
    ) &&
    atsState.text.includes("证书\nCET-6 | 教育部 | 2021") &&
    atsState.text.includes("技能\n前端：React、TypeScript\n其他：Docker") &&
    !atsState.text.includes("React（精通）") &&
    !atsState.text.includes("undefined"),
  JSON.stringify({
    length: atsState.text.length,
    head: atsState.text.slice(0, 120),
  }),
);
expect(
  "ATS 关键词覆盖按 JD 统计缺口",
  atsState.score === 75 && atsState.missing.includes("Kubernetes"),
  JSON.stringify({ score: atsState.score, missing: atsState.missing }),
);
expect(
  "ATS 弹窗在桌面视口内且页面无横向溢出",
  atsState.dialogInViewport && atsState.pageWidth <= atsState.viewport,
  JSON.stringify({
    dialogInViewport: atsState.dialogInViewport,
    viewport: atsState.viewport,
    pageWidth: atsState.pageWidth,
  }),
);

await atsPage.evaluate(() => {
  window.__qaAtsBlob = null;
  window.__qaAtsName = "";
  const original = URL.createObjectURL;
  URL.createObjectURL = (blob) => {
    window.__qaAtsBlob = blob;
    return original.call(URL, blob);
  };
  HTMLAnchorElement.prototype.click = function () {
    window.__qaAtsName = this.download;
  };
});
await atsPage.click('[data-qa="ats-download"]');
await atsPage.waitForFunction(() => Boolean(window.__qaAtsBlob), {
  timeout: 5000,
});
const atsTextExport = await atsPage.evaluate(async () => ({
  text: await window.__qaAtsBlob.text(),
  downloadName: window.__qaAtsName,
}));
expect(
  "ATS 纯文本下载文件名与内容正确",
  atsTextExport.downloadName === "ATS测试-ATS.txt" &&
    atsTextExport.text === atsState.text,
  JSON.stringify({
    downloadName: atsTextExport.downloadName,
    sameContent: atsTextExport.text === atsState.text,
  }),
);

await atsPage.click('[data-qa="ats-format-markdown"]');
await atsPage.waitForFunction(
  () =>
    document
      .querySelector('[data-qa="ats-preview"]')
      ?.textContent?.startsWith("# ATS测试"),
  { timeout: 5000 },
);
const atsMarkdown = await atsPage.evaluate(
  () => document.querySelector('[data-qa="ats-preview"]')?.textContent ?? "",
);
await atsPage.click('[data-qa="ats-download"]');
await atsPage.waitForFunction(
  () => window.__qaAtsName === "ATS测试-ATS.md",
  { timeout: 5000 },
);
const atsMarkdownExport = await atsPage.evaluate(async () => ({
  text: await window.__qaAtsBlob.text(),
  downloadName: window.__qaAtsName,
}));
expect(
  "ATS Markdown 使用标题层级并可下载 .md",
  atsMarkdown.startsWith("# ATS测试") &&
    atsMarkdown.includes(
      "## 工作经历\n\n### 某公司 | 前端工程师 | 2022 – 至今",
    ) &&
    atsMarkdown.includes("## 技能") &&
    atsMarkdownExport.downloadName === "ATS测试-ATS.md" &&
    atsMarkdownExport.text === atsMarkdown,
  JSON.stringify({
    downloadName: atsMarkdownExport.downloadName,
    hasHeading: atsMarkdown.includes("## 工作经历"),
  }),
);

expect(
  "ATS 导出页面无控制台错误",
  atsPage.qaErrors.length === 0,
  atsPage.qaErrors.join(" | "),
);
await atsPage.close();

const atsMobilePage = await open({ width: 390, height: 844, mobile: true });
await atsMobilePage.goto(BASE, { waitUntil: "networkidle0" });
await pause(600);
await clickText(atsMobilePage, "预览");
await pause(250);
await atsMobilePage.click('[data-qa="ats-export"]');
await atsMobilePage.waitForSelector('[data-qa="ats-dialog"]', {
  timeout: 5000,
});
await pause(250);
const atsMobile = await atsMobilePage.evaluate(() => {
  const dialog = document.querySelector('[data-qa="ats-dialog"]');
  const rect = dialog?.getBoundingClientRect();
  const download = document
    .querySelector('[data-qa="ats-download"]')
    ?.getBoundingClientRect();
  return {
    viewport: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    dialogWidth: rect?.width ?? 0,
    downloadInViewport: download
      ? download.left >= 0 && download.right <= window.innerWidth
      : false,
  };
});
expect(
  "ATS 导出在 390px 无横向溢出",
  atsMobile.pageWidth <= atsMobile.viewport &&
    atsMobile.dialogWidth <= atsMobile.viewport &&
    atsMobile.downloadInViewport,
  JSON.stringify(atsMobile),
);
const atsDialogElement = await atsMobilePage.$('[data-qa="ats-dialog"]');
if (atsDialogElement) {
  await atsDialogElement.screenshot({ path: `${OUT}/qa-ats.png` });
}
expect(
  "ATS 导出页面在手机端无控制台错误",
  atsMobilePage.qaErrors.length === 0,
  atsMobilePage.qaErrors.join(" | "),
);
await atsMobilePage.close();

// 内置板块显隐 / 排序与一页适配
const layoutPage = await open({ width: 1440, height: 1000 });
await layoutPage.goto(BASE, { waitUntil: "networkidle0" });
await layoutPage.evaluate(() => {
  localStorage.clear();
  const experiences = Array.from({ length: 8 }, (_, index) => ({
    id: `layout-exp-${index}`,
    company: `公司${index + 1}`,
    role: "前端工程师",
    start: `202${index % 4}`,
    end: "至今",
    description: [
      "负责后台系统前端架构与核心页面开发，推动组件复用。",
      "主导性能优化，首屏加载时间下降 30%，并建立监控看板。",
      "与产品、设计、后端协作交付多个版本，覆盖 10 万用户。",
      "沉淀工程规范与自动化测试，减少线上回归问题。",
    ].join("\n"),
  }));
  localStorage.setItem(
    "resume-workshop:v1",
    JSON.stringify({
      basic: {
        name: "布局测试",
        headline: "前端工程师",
        email: "layout@example.com",
        phone: "13800138000",
        city: "上海",
        website: "",
        github: "",
        summary: "5 年前端开发经验，负责复杂后台系统。",
      },
      intent: {
        targetRole: "前端工程师",
        targetCity: "上海",
        salaryMin: "20",
        salaryMax: "30",
        jobType: "全职",
        experience: "3-5年",
      },
      educations: [
        {
          id: "layout-edu",
          school: "某大学",
          major: "计算机",
          degree: "本科",
          start: "2018",
          end: "2022",
          gpa: "",
          ranking: "",
          courses: "",
          honors: "",
        },
      ],
      experiences,
      projects: [
        {
          id: "layout-proj",
          name: "布局项目",
          role: "作者",
          start: "2023",
          end: "2024",
          description: "使用 React 构建。",
          link: "",
        },
      ],
      customSections: [
        {
          id: "layout-custom",
          title: "证书",
          visible: true,
          items: [
            {
              id: "layout-cert",
              title: "CET-6",
              subtitle: "教育部",
              date: "2021",
              description: "",
              link: "",
            },
          ],
        },
      ],
      skills: ["React", "TypeScript", "Node.js"],
    }),
  );
});
await layoutPage.reload({ waitUntil: "networkidle0" });
await pause(800);

const layoutInitial = await layoutPage.evaluate(() => {
  const paper = document.querySelector(".resume-paper");
  const rows = [...document.querySelectorAll("[data-qa^='layout-row-']")];
  return {
    rows: rows.length,
    hasCard: Boolean(document.querySelector('[data-qa="section-layout"]')),
    text: paper?.textContent ?? "",
    pages: Number(
      document
        .querySelector('[data-qa="preview-pages"]')
        ?.getAttribute("data-pages") ?? 0,
    ),
  };
});
expect(
  "板块布局编辑器展示全部七个内置板块",
  layoutInitial.hasCard && layoutInitial.rows === 7,
  JSON.stringify({ rows: layoutInitial.rows, hasCard: layoutInitial.hasCard }),
);
expect(
  "默认布局按简介、工作、项目、自定义顺序渲染",
  layoutInitial.text.indexOf("个人简介") <
    layoutInitial.text.indexOf("工作经历") &&
    layoutInitial.text.indexOf("工作经历") <
      layoutInitial.text.indexOf("项目经历") &&
    layoutInitial.text.indexOf("项目经历") < layoutInitial.text.indexOf("证书"),
  `pages=${layoutInitial.pages}`,
);

await layoutPage.click('[data-qa="layout-toggle-experience"]');
await pause(300);
const hiddenAcrossTemplates = [];
for (const label of [
  "现代",
  "经典",
  "紧凑",
  "侧栏",
  "时间轴",
  "极简",
  "学术",
  "卡片",
]) {
  await clickText(layoutPage, label);
  await pause(250);
  const paperText = await layoutPage.evaluate(
    () => document.querySelector(".resume-paper")?.textContent ?? "",
  );
  if (paperText.includes("公司1")) hiddenAcrossTemplates.push(label);
}
await clickText(layoutPage, "现代");
await pause(200);
expect(
  "八种模板都遵守板块隐藏",
  hiddenAcrossTemplates.length === 0,
  hiddenAcrossTemplates.join("、"),
);
await layoutPage.click('[data-qa="layout-toggle-experience"]');
await pause(300);
const experienceBack = await layoutPage.evaluate(() =>
  (document.querySelector(".resume-paper")?.textContent ?? "").includes(
    "公司1",
  ),
);
expect("重新显示工作经历后恢复条目", experienceBack, "公司1 未恢复");

await layoutPage.click('[data-qa="layout-toggle-intent"]');
await pause(700);
const hiddenIntent = await layoutPage.evaluate(() => ({
  hasIntent: (document.querySelector(".resume-paper")?.textContent ?? "").includes(
    "求职意向",
  ),
  rowHidden: document
    .querySelector('[data-qa="layout-row-intent"]')
    ?.getAttribute("data-hidden"),
  stored:
    JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}").layout
      ?.hidden ?? [],
}));
expect(
  "隐藏求职意向会立即从预览移除并保存",
  !hiddenIntent.hasIntent &&
    hiddenIntent.rowHidden === "true" &&
    hiddenIntent.stored.includes("intent"),
  JSON.stringify(hiddenIntent),
);

await layoutPage.click('[data-qa="layout-toggle-intent"]');
await pause(300);
const shownIntent = await layoutPage.evaluate(() =>
  (document.querySelector(".resume-paper")?.textContent ?? "").includes(
    "求职意向",
  ),
);
expect("再次点击显示可恢复求职意向", shownIntent, "求职意向未恢复");

await layoutPage.click('[data-qa="layout-up-projects"]');
await pause(300);
const movedText =
  (await layoutPage.evaluate(
    () => document.querySelector(".resume-paper")?.textContent ?? "",
  )) ?? "";
expect(
  "板块上移会改变预览顺序",
  movedText.indexOf("项目经历") >= 0 &&
    movedText.indexOf("项目经历") < movedText.indexOf("工作经历"),
  `project=${movedText.indexOf("项目经历")} work=${movedText.indexOf("工作经历")}`,
);

await clickText(layoutPage, "经典");
await pause(250);
const classicOrderText = await layoutPage.evaluate(
  () => document.querySelector(".resume-paper")?.textContent ?? "",
);
expect(
  "经典模板同样遵守板块顺序",
  classicOrderText.indexOf("项目经历") >= 0 &&
    classicOrderText.indexOf("项目经历") <
      classicOrderText.indexOf("工作经历"),
  `project=${classicOrderText.indexOf("项目经历")} work=${classicOrderText.indexOf("工作经历")}`,
);
await clickText(layoutPage, "现代");
await pause(200);

await layoutPage.click('[data-qa="layout-reset"]');
await pause(300);
const resetState = await layoutPage.evaluate(() => {
  const paper = document.querySelector(".resume-paper")?.textContent ?? "";
  return {
    order:
      paper.indexOf("工作经历") < paper.indexOf("项目经历") &&
      paper.indexOf("个人简介") < paper.indexOf("工作经历"),
    intent: paper.includes("求职意向"),
  };
});
expect(
  "恢复默认会还原顺序与显隐",
  resetState.order && resetState.intent,
  JSON.stringify(resetState),
);

const layoutCard = await layoutPage.$('[data-qa="section-layout"]');
if (layoutCard) {
  await layoutCard.screenshot({ path: `${OUT}/qa-layout.png` });
}

await layoutPage.click('[data-qa="fit-open"]');
await layoutPage.waitForSelector('[data-qa="fit-dialog"]', { timeout: 5000 });
await pause(300);
const fitInitial = await layoutPage.evaluate(() => {
  const dialog = document.querySelector('[data-qa="fit-dialog"]');
  return {
    pages: Number(dialog?.getAttribute("data-pages") ?? 0),
    status: document.querySelector('[data-qa="fit-status"]')?.textContent ?? "",
    resetDisabled: Boolean(
      document.querySelector('[data-qa="fit-reset"]')?.hasAttribute("disabled"),
    ),
  };
});
expect(
  "一页适配显示当前页数并提示精简",
  fitInitial.pages >= 2 && fitInitial.status.includes("建议精简到 1 页"),
  JSON.stringify(fitInitial),
);

const fitA11y = await layoutPage.evaluate(() => {
  const dialog = document.querySelector('[data-qa="fit-dialog"]');
  const labelledBy = dialog?.getAttribute("aria-labelledby") ?? "";
  const describedBy = dialog?.getAttribute("aria-describedby") ?? "";
  return {
    modal: dialog?.getAttribute("aria-modal"),
    labelled: labelledBy
      ? (document.getElementById(labelledBy)?.textContent ?? "")
      : "",
    described: describedBy
      ? (document.getElementById(describedBy)?.textContent ?? "")
      : "",
    focusInside: Boolean(dialog?.contains(document.activeElement)),
    bodyOverflow: document.body.style.overflow,
  };
});
expect(
  "弹窗具备模态语义、标题描述，并锁定背景滚动且焦点进入面板",
  fitA11y.modal === "true" &&
    fitA11y.labelled.includes("一页适配") &&
    fitA11y.described.includes("隐藏暂时用不到的板块") &&
    fitA11y.focusInside &&
    fitA11y.bodyOverflow === "hidden",
  JSON.stringify(fitA11y),
);

let fitFocusTrapped = true;
for (let i = 0; i < 20; i += 1) {
  await layoutPage.keyboard.press("Tab");
  const inside = await layoutPage.evaluate(() =>
    Boolean(
      document
        .querySelector('[data-qa="fit-dialog"]')
        ?.contains(document.activeElement),
    ),
  );
  if (!inside) {
    fitFocusTrapped = false;
    break;
  }
}
for (let i = 0; i < 5 && fitFocusTrapped; i += 1) {
  await layoutPage.keyboard.down("Shift");
  await layoutPage.keyboard.press("Tab");
  await layoutPage.keyboard.up("Shift");
  const inside = await layoutPage.evaluate(() =>
    Boolean(
      document
        .querySelector('[data-qa="fit-dialog"]')
        ?.contains(document.activeElement),
    ),
  );
  if (!inside) {
    fitFocusTrapped = false;
  }
}
expect(
  "Tab / Shift+Tab 焦点被限制在弹窗内",
  fitFocusTrapped,
  "焦点逃出了弹窗",
);

await layoutPage.click('[data-qa="fit-suggest"]');
await pause(500);
const fitSuggested = await layoutPage.evaluate(() => {
  const paper = document.querySelector(".resume-paper")?.textContent ?? "";
  const checked = (key) =>
    document
      .querySelector(`[data-qa="fit-toggle-${key}"]`)
      ?.getAttribute("aria-checked");
  return {
    intent: paper.includes("求职意向"),
    custom: paper.includes("CET-6"),
    intentChecked: checked("intent"),
    customChecked: checked("custom"),
  };
});
expect(
  "一页适配可隐藏建议项并实时更新预览",
  !fitSuggested.intent &&
    !fitSuggested.custom &&
    fitSuggested.intentChecked === "false" &&
    fitSuggested.customChecked === "false",
  JSON.stringify(fitSuggested),
);

const fitDialog = await layoutPage.$('[data-qa="fit-dialog"]');
if (fitDialog) {
  await fitDialog.screenshot({ path: `${OUT}/qa-fit.png` });
}

await layoutPage.click('[data-qa="fit-toggle-intent"]');
await pause(400);
const fitIntentBack = await layoutPage.evaluate(
  () =>
    (document.querySelector(".resume-paper")?.textContent ?? "").includes(
      "求职意向",
    ),
);
expect("一页适配中重新打开板块会立即恢复", fitIntentBack, "求职意向未恢复");

await layoutPage.click('[data-qa="fit-reset"]');
await pause(400);
const fitReset = await layoutPage.evaluate(() => {
  const paper = document.querySelector(".resume-paper")?.textContent ?? "";
  return {
    intent: paper.includes("求职意向"),
    custom: paper.includes("CET-6"),
    resetDisabled: Boolean(
      document.querySelector('[data-qa="fit-reset"]')?.hasAttribute("disabled"),
    ),
  };
});
expect(
  "一页适配可恢复到打开时的显隐状态",
  fitReset.intent && fitReset.custom && fitReset.resetDisabled,
  JSON.stringify(fitReset),
);

await layoutPage.keyboard.press("Escape");
await layoutPage.waitForFunction(
  () => !document.querySelector('[data-qa="fit-dialog"]'),
  { timeout: 3000 },
);
await pause(150);
const fitEscaped = await layoutPage.evaluate(() => ({
  closed: !document.querySelector('[data-qa="fit-dialog"]'),
  focus: document.activeElement?.getAttribute("data-qa"),
  bodyOverflow: document.body.style.overflow,
}));
expect(
  "Escape 关闭弹窗、解除滚动锁并把焦点还给触发按钮",
  fitEscaped.closed &&
    fitEscaped.focus === "fit-open" &&
    fitEscaped.bodyOverflow !== "hidden",
  JSON.stringify(fitEscaped),
);

await layoutPage.click('[data-qa="fit-open"]');
await layoutPage.waitForSelector('[data-qa="fit-dialog"]', { timeout: 5000 });
await pause(200);
await layoutPage.click('[data-qa="fit-done"]');
await pause(200);
const fitClosed = await layoutPage.evaluate(() => ({
  closed: !document.querySelector('[data-qa="fit-dialog"]'),
  focus: document.activeElement?.getAttribute("data-qa"),
  bodyOverflow: document.body.style.overflow,
}));
expect(
  "关闭一页适配后回到预览并把焦点还给触发按钮",
  fitClosed.closed &&
    fitClosed.focus === "fit-open" &&
    fitClosed.bodyOverflow !== "hidden",
  JSON.stringify(fitClosed),
);

expect(
  "板块布局与一页适配页面无控制台错误",
  layoutPage.qaErrors.length === 0,
  layoutPage.qaErrors.join(" | "),
);
await layoutPage.close();

const layoutMobilePage = await open({ width: 390, height: 844, mobile: true });
await layoutMobilePage.goto(BASE, { waitUntil: "networkidle0" });
await pause(600);
await clickText(layoutMobilePage, "预览");
await pause(250);
await layoutMobilePage.click('[data-qa="fit-open"]');
await layoutMobilePage.waitForSelector('[data-qa="fit-dialog"]', {
  timeout: 5000,
});
await pause(300);
const fitMobile = await layoutMobilePage.evaluate(() => {
  const dialog = document.querySelector('[data-qa="fit-dialog"]');
  const rect = dialog?.getBoundingClientRect();
  const done = document
    .querySelector('[data-qa="fit-done"]')
    ?.getBoundingClientRect();
  return {
    viewport: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    dialogWidth: rect?.width ?? 0,
    doneInViewport: done
      ? done.left >= 0 && done.right <= window.innerWidth
      : false,
  };
});
expect(
  "一页适配在 390px 无横向溢出",
  fitMobile.pageWidth <= fitMobile.viewport &&
    fitMobile.dialogWidth <= fitMobile.viewport &&
    fitMobile.doneInViewport,
  JSON.stringify(fitMobile),
);
expect(
  "一页适配手机端无控制台错误",
  layoutMobilePage.qaErrors.length === 0,
  layoutMobilePage.qaErrors.join(" | "),
);
await layoutMobilePage.close();

const a11yPage = await open({ width: 1440, height: 1000 });
await a11yPage.goto(BASE, { waitUntil: "networkidle0" });
await pause(500);
await a11yPage.keyboard.press("Tab");
await pause(300);
const skipLink = await a11yPage.evaluate(() => {
  const element = document.activeElement;
  const rect = element?.getBoundingClientRect();
  const style = element ? getComputedStyle(element) : null;
  return {
    text: element?.textContent?.trim() ?? "",
    href: element?.getAttribute("href"),
    top: rect?.top ?? -1,
    outline: style ? `${style.outlineStyle} ${style.outlineWidth}` : "",
  };
});
expect(
  "跳转主内容链接是首个 Tab 焦点、可见且有焦点环",
  skipLink.text === "跳到主要内容" &&
    skipLink.href === "#main-content" &&
    skipLink.top >= 0 &&
    skipLink.outline.includes("solid") &&
    skipLink.outline.includes("2px"),
  JSON.stringify(skipLink),
);

await a11yPage.keyboard.press("Enter");
await pause(300);
const skipTarget = await a11yPage.evaluate(() => ({
  hash: location.hash,
  activeId: document.activeElement?.id,
}));
expect(
  "跳转链接把焦点移到主内容",
  skipTarget.hash === "#main-content" && skipTarget.activeId === "main-content",
  JSON.stringify(skipTarget),
);

await a11yPage.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "reduce" },
]);
const reducedMotion = await a11yPage.evaluate(() => {
  const element = document.querySelector("header nav button");
  const style = element ? getComputedStyle(element) : null;
  return {
    transition: Number.parseFloat(style?.transitionDuration ?? "1"),
    animation: Number.parseFloat(style?.animationDuration ?? "1"),
  };
});
expect(
  "reduced motion 下过渡与动画接近即时",
  reducedMotion.transition <= 0.01 && reducedMotion.animation <= 0.01,
  JSON.stringify(reducedMotion),
);
await a11yPage.close();

// 阶段 33：离线缓存 / PWA。开发模式不注册 SW，只验证清理行为；生产模式跑完整离线回放。
const swResponse = await fetch(`${BASE}/sw.js`);
const swCacheControl = swResponse.headers.get("cache-control") ?? "";
const swContentType = swResponse.headers.get("content-type") ?? "";
expect(
  "Service Worker 脚本禁止缓存且限定根作用域",
  swResponse.ok &&
    swCacheControl.includes("no-store") &&
    swResponse.headers.get("service-worker-allowed") === "/" &&
    swContentType.includes("javascript"),
  JSON.stringify({
    status: swResponse.status,
    cacheControl: swCacheControl,
    scope: swResponse.headers.get("service-worker-allowed"),
    contentType: swContentType,
  }),
);

const swPage = await open({ width: 1440, height: 1000 });
await swPage.goto(BASE, { waitUntil: "networkidle0" });
await swPage
  .waitForFunction(
    () => Boolean(document.documentElement.dataset.serviceWorker),
    { timeout: 5000 },
  )
  .catch(() => {});
// 首次安装需要下载构建资源，留出完成时间。
await pause(1500);

const swState = await swPage.evaluate(async () => {
  const registrations =
    "serviceWorker" in navigator
      ? await navigator.serviceWorker.getRegistrations()
      : [];
  const keys = "caches" in window ? await caches.keys() : [];
  const contents = {};
  for (const key of keys) {
    const cache = await caches.open(key);
    contents[key] = (await cache.keys()).map(
      (request) => new URL(request.url).pathname,
    );
  }
  return {
    marker: document.documentElement.dataset.serviceWorker ?? "",
    controller: Boolean(navigator.serviceWorker?.controller),
    registrations: registrations.length,
    keys,
    contents,
  };
});

if (swState.marker === "dev") {
  expect(
    "开发模式不注册 Service Worker",
    swState.registrations === 0 &&
      !swState.controller &&
      swState.keys.every((key) => !key.startsWith("resume-workshop-")),
    JSON.stringify(swState),
  );
} else {
  expect(
    "生产模式注册并接管 Service Worker",
    swState.marker === "registered" &&
      swState.controller &&
      swState.registrations === 1,
    JSON.stringify(swState),
  );

  const cachedPaths = Object.values(swState.contents).flat();
  expect(
    "应用外壳、构建静态资源与图标已缓存",
    cachedPaths.includes("/") &&
      cachedPaths.some((item) => item.endsWith(".css")) &&
      cachedPaths.filter((item) => item.startsWith("/_next/static/")).length >=
        3 &&
      cachedPaths.includes("/manifest.webmanifest") &&
      cachedPaths.includes("/icon-192.png"),
    JSON.stringify(swState.contents),
  );
  expect(
    "接口响应不进入离线缓存",
    cachedPaths.every((item) => !item.startsWith("/api/")),
    JSON.stringify(cachedPaths.filter((item) => item.startsWith("/api/"))),
  );

  await swPage.setOfflineMode(true);
  await swPage.reload({ waitUntil: "domcontentloaded" });
  await pause(1200);
  const offlineState = await swPage.evaluate(() => ({
    online: navigator.onLine,
    banner: Boolean(document.querySelector('[data-qa="offline-banner"]')),
    brand: (document.body.innerText ?? "").includes("简历工坊"),
    hasForm: Boolean(
      [...document.querySelectorAll("label")].find(
        (node) =>
          node.querySelector("span span")?.textContent?.trim() === "姓名",
      ),
    ),
    controller: Boolean(navigator.serviceWorker?.controller),
  }));
  expect(
    "离线刷新仍能加载完整编辑器并显示离线提示",
    !offlineState.online &&
      offlineState.banner &&
      offlineState.brand &&
      offlineState.hasForm,
    JSON.stringify(offlineState),
  );

  const offlineEdited = await swPage.evaluate(() => {
    const labels = [...document.querySelectorAll("label")].filter(
      (node) => node.querySelector("span span")?.textContent?.trim() === "姓名",
    );
    const input = labels[0]?.querySelector("input, textarea");
    if (!input) return false;
    const proto =
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(
      input,
      "离线可用",
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
    input.blur();
    return true;
  });
  await pause(1200);
  const offlineSaved = await swPage.evaluate(() =>
    Object.keys(localStorage).some((key) =>
      (localStorage.getItem(key) ?? "").includes("离线可用"),
    ),
  );
  expect(
    "离线编辑仍写入 localStorage",
    offlineEdited && offlineSaved,
    JSON.stringify({ offlineEdited, offlineSaved }),
  );

  await swPage.screenshot({
    path: `${OUT}/qa-offline.png`,
    fullPage: false,
  });

  await swPage.setOfflineMode(false);
  await pause(800);
  const recoveredState = await swPage.evaluate(() => ({
    online: navigator.onLine,
    banner: Boolean(document.querySelector('[data-qa="offline-banner"]')),
  }));
  expect(
    "恢复联网后离线提示自动消失",
    recoveredState.online && !recoveredState.banner,
    JSON.stringify(recoveredState),
  );
}

expect(
  "离线缓存流程无控制台错误",
  swPage.qaErrors.length === 0,
  swPage.qaErrors.join(" | "),
);
await swPage.close();

await browser.close();
if (failures.length > 0) {
  console.error(`QA failures: ${failures.length}`);
  process.exitCode = 1;
} else {
  console.log("QA screenshots done");
}
