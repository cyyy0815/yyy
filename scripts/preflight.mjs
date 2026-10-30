/**
 * 推送公开仓库前的自检。
 *
 * 只读检查，不改任何东西；有 FAIL 时以非零码退出，方便挂在 CI 或提交前的最后一步。
 * 用法：node scripts/preflight.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const results = [];
const check = (level, title, detail) => results.push({ level, title, detail });

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

// 1. 工作区必须干净
const status = git(["status", "--porcelain"]);
check(
  status ? "FAIL" : "PASS",
  "工作区干净",
  status ? `有未提交改动：\n${status}` : "没有未提交改动",
);

// 2. 环境变量模板在、真实密钥不在
const tracked = git(["ls-files"]).split("\n");
const trackedEnv = tracked.filter((file) => file.startsWith(".env"));
const hasTemplate = trackedEnv.includes(".env.example");
const hasRealEnv = trackedEnv.some((file) => file !== ".env.example");
check(
  hasTemplate && !hasRealEnv ? "PASS" : "FAIL",
  "只提交 .env.example",
  `已跟踪：${trackedEnv.join("、") || "（无）"}`,
);

// 3. 历史里没有真实密钥
let keyHits = "";
try {
  keyHits = execFileSync(
    "git",
    ["grep", "-nI", "-E", "sk-[A-Za-z0-9]{20,}", ...git(["rev-list", "--all"]).split("\n")],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ).trim();
} catch {
  keyHits = "";
}
check(
  keyHits ? "FAIL" : "PASS",
  "历史中无 API Key",
  keyHits ? keyHits.split("\n").slice(0, 3).join("\n") : "未在全部提交中发现 sk- 开头的密钥",
);

// 4. 作者信息不是默认占位
const author = git(["log", "-1", "--format=%an <%ae>"]);
check(
  /<c@localhost>/.test(author) ? "WARN" : "PASS",
  "作者信息",
  /<c@localhost>/.test(author)
    ? `当前是 ${author}，公开后会显示在每个提交里，建议先改`
    : `当前是 ${author}`,
);

// 5. README 团队信息已填写
const readme = existsSync("README.md") ? readFileSync("README.md", "utf8") : "";
const teamSection = readme.split("## 团队信息")[1] ?? "";
check(
  teamSection.includes("待填写") ? "WARN" : "PASS",
  "README 团队信息",
  teamSection.includes("待填写")
    ? "「团队信息」里还有「待填写」占位"
    : "团队信息已填写",
);

// 6. 提交材料齐全
const materials = [
  "提交材料/技术文档.pdf",
  "提交材料/作品介绍文档.pdf",
  "docs/提交说明.md",
  "docs/提交总览.md",
];
const missing = materials.filter((file) => !existsSync(file));
check(
  missing.length === 0 ? "PASS" : "FAIL",
  "提交材料齐全",
  missing.length === 0 ? materials.join("\n") : `缺少：${missing.join("、")}`,
);

// 7. 构建产物存在（说明能构建）
check(
  existsSync(".next/BUILD_ID") ? "PASS" : "WARN",
  "构建产物",
  existsSync(".next/BUILD_ID") ? "存在 .next/BUILD_ID" : "没有构建产物，先跑 npm run build",
);

// 8. 依赖清单可复现
check(
  tracked.includes("package-lock.json") ? "PASS" : "FAIL",
  "依赖清单",
  tracked.includes("package-lock.json") ? "package.json + package-lock.json" : "缺少 package-lock.json",
);

const icon = { PASS: "✅", WARN: "⚠️ ", FAIL: "❌" };
for (const item of results) {
  console.log(`${icon[item.level]} ${item.title}`);
  if (item.detail) {
    for (const line of item.detail.split("\n")) console.log(`     ${line}`);
  }
}

const failures = results.filter((item) => item.level === "FAIL").length;
const warnings = results.filter((item) => item.level === "WARN").length;
console.log(`\n结果：${results.length} 项检查，${failures} 项失败，${warnings} 项提醒`);
process.exit(failures > 0 ? 1 : 0);
