import { mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.QA_BASE ?? "http://localhost:3000";
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
async function interceptAi(page, { configured = true, text = "" } = {}) {
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
    if (url.includes("/api/ai/generate")) {
      const split = Math.max(1, Math.floor(text.length / 2));
      const body = [
        { event: "delta", data: { text: text.slice(0, split) } },
        { event: "delta", data: { text: text.slice(split) } },
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

await clickText(aiPage, "采用到简历", '[role="dialog"]');
await pause(300);
const confirmShown = await aiPage.evaluate(() =>
  [...document.querySelectorAll('[role="dialog"] button')].some(
    (button) => button.textContent?.trim() === "确认覆盖",
  ),
);
expect(
  "覆盖非空简介需确认",
  summaryBefore.trim() === "" || confirmShown,
  JSON.stringify({ summaryBefore, confirmShown }),
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
    educations: [],
    experiences: [],
    projects: [],
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
const oldJsonCompat = await safetyPage.evaluate(() => {
  const data = JSON.parse(localStorage.getItem("resume-workshop:v1") ?? "{}");
  return (
    Array.isArray(data.customSections) &&
    data.customSections.length === 0 &&
    document.body.innerText.includes("还没有自定义板块")
  );
});
expect("旧 JSON 兼容自定义板块", oldJsonCompat);
await safetyPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
});
await safetyPage.close();

// P2 证件照：上传后压缩保存、五套模板展示、JSON 备份包含、可移除
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
  "五套模板展示证件照",
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
  return {
    prefix: payload.basic?.photo?.slice(0, 23) ?? "",
    length: payload.basic?.photo?.length ?? 0,
    template: payload.template,
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

// P2 自定义板块：添加、编辑、排序、显隐、删除撤销、五套模板、JSON 备份
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
      educations: [],
      experiences: [],
      projects: [
        {
          id: "cp1",
          name: "增长项目",
          role: "负责人",
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
    };
  });
  const paper = await customPage.$(".resume-paper");
  await paper?.screenshot({ path: `${OUT}/qa-custom-${id}.png` });
}
expect(
  "五套模板渲染自定义板块",
  Object.values(customTemplateResult).every(
    (item) => item.certificate && item.language,
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
  return {
    count: payload.customSections?.length ?? 0,
    titles: payload.customSections?.map((section) => section.title) ?? [],
    visible: payload.customSections?.map((section) => section.visible) ?? [],
    items: payload.customSections?.map((section) =>
      section.items?.map((item) => item.title),
    ) ?? [],
  };
});
expect(
  "JSON 备份包含自定义板块",
  customExport.count === 2 &&
    customExport.titles.join(",") === "语言,证书" &&
    customExport.visible.every(Boolean) &&
    customExport.items.flat().includes("PMP") &&
    customExport.items.flat().includes("英语"),
  JSON.stringify(customExport),
);
await customPage.evaluate(() => {
  localStorage.removeItem("resume-workshop:v1");
  localStorage.setItem("resume-workshop:template", "modern");
});
await customPage.close();

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
  return {
    template: payload.template,
    name: payload.basic?.name,
    downloadName: window.__downloadName,
  };
});
expect(
  "导出包含模板且文件名正确",
  exported.template === "modern" &&
    exported.name === "林一" &&
    exported.downloadName === "林一.json",
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
  };
});
const expectedSideWidth = (72 * 96) / 25.4;
expect(
  "侧栏打印浮动布局",
  sidebarPrint.float === "left" &&
    sidebarPrint.paperDisplay === "block" &&
    Math.abs(Number.parseFloat(sidebarPrint.sideWidth) - expectedSideWidth) < 1,
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

await browser.close();
if (failures.length > 0) {
  console.error(`QA failures: ${failures.length}`);
  process.exitCode = 1;
} else {
  console.log("QA screenshots done");
}
