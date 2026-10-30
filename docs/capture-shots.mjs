import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.SHOT_BASE ?? "http://localhost:3000";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--lang=zh-CN"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 980, deviceScaleFactor: 2 });
page.on("dialog", async (dialog) => dialog.accept());

await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.removeItem("resume-workshop:applications:v1"));
await page.reload({ waitUntil: "networkidle0" });
await pause(900);

// 图 1：编辑页（左表单 + 右预览）
await page.screenshot({ path: "D:/web/docs/img/editor.png" });

// 载入演示场景，切到职位推荐
await page.click('[data-qa="load-demo"]');
await pause(1600);
await page.screenshot({ path: "D:/web/docs/img/match.png" });

// 图 2：待投清单
await page.evaluate(() => {
  document.querySelector('[data-qa="job-queue-list"]')?.scrollIntoView({ block: "center" });
});
await pause(600);
await page.screenshot({ path: "D:/web/docs/img/queue.png" });

// 图 3：求职 Agent（跑完两步本地 + 一步 AI）
await page.evaluate(() => window.scrollTo(0, 0));
await pause(300);
await page.click('[data-qa="job-prepare"]');
await pause(500);
await page.click('[data-qa="job-agent"]');
await page.waitForSelector('[data-qa="agent-dialog"]', { timeout: 6000 });
await pause(600);
await page.click('[data-qa="agent-run-all"]');
await pause(2200);
await page.click('[data-qa="agent-run-rewrite_summary"]');
// AI 生成失败不影响截图：退回「只跑完本地两步」的状态
await page
  .waitForFunction(
  () => {
    const pre = document.querySelector('[data-qa="agent-preview"]');
    return pre && pre.textContent.trim().length > 30;
  },
    { timeout: 45000 },
  )
  .catch(() => console.log("AI preview timeout, fallback to local steps"));
await pause(2500);
await (await page.$("[data-qa=\"agent-dialog\"]")).screenshot({ path: "D:/web/docs/img/agent.png" });

// 图 5：AI 工作台（一级页面）
await page.keyboard.press("Escape");
await pause(600);
await page.click('[data-qa="tab-agent"]');
await pause(1200);
await page.screenshot({ path: "D:/web/docs/img/workbench.png" });

console.log("screenshots done");
await browser.close();
