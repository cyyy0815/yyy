import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), ".screenshots");

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

async function open({ width = 1440, height = 1000, mobile = false } = {}) {
  const page = await browser.newPage();
  page.on("pageerror", (error) => console.log("PAGE ERROR:", error.message));
  page.on("console", (message) => {
    if (message.type() === "error") console.log("CONSOLE ERROR:", message.text());
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

await browser.close();
console.log("QA screenshots done");
