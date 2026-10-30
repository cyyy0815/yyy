/**
 * 把参赛材料打成一个自包含的 zip：文档 + 参考资料 + 界面截图 + 源码快照。
 *
 * 源码快照用于「评审方只想拿一个包」的场景；正常提交仍以仓库链接为准，
 * 所以这份快照不含 .git 历史，只保留当前工作树的文件。
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { buildZip } from "./zip.mjs";

const root = process.cwd();
const folder = join(root, "提交材料");
const target = join(folder, "简历工坊-提交材料.zip");

// 1. 必需材料
const required = ["技术文档.pdf", "技术文档.docx", "提交总览.md", "演示视频脚本.md"];
const entries = [];
for (const name of required) {
  const path = join(folder, name);
  if (!existsSync(path)) {
    throw new Error(`缺少提交文件：提交材料/${name}`);
  }
  entries.push({ name, path });
}

// 2. 参考资料（引用仓库里的原文，避免两份内容不一致）
const references = [
  ["参考资料/项目说明.md", join(root, "README.md")],
  ["参考资料/离线评测报告.md", join(root, "docs/eval-report.md")],
  ["参考资料/部署说明.md", join(root, "docs/DEPLOY.md")],
  ["参考资料/扩展说明.md", join(root, "extension/README.md")],
];
for (const [name, path] of references) {
  if (existsSync(path)) entries.push({ name, path });
}

// 3. 界面截图
const imageDir = join(root, "docs/img");
if (existsSync(imageDir)) {
  for (const file of readdirSync(imageDir).sort()) {
    if (file.toLowerCase().endsWith(".png")) {
      entries.push({ name: `界面截图/${file}`, path: join(imageDir, file) });
    }
  }
}

// 4. 源码快照：排除构建产物、依赖与本地环境
const SOURCE_DIRS = ["src", "scripts", "extension", "public", "docs"];
const SOURCE_FILES = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.ts",
  "eslint.config.mjs",
  "vitest.config.mts",
  ".env.example",
  "README.md",
  "AGENTS.md",
];
const SKIP_NAMES = new Set([
  "node_modules",
  ".next",
  ".git",
  ".screenshots",
  "img",
  "dist",
]);

function collect(directory, prefix) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (SKIP_NAMES.has(entry.name)) continue;
    const full = join(directory, entry.name);
    const name = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) collect(full, name);
    else if (statSync(full).isFile()) entries.push({ name, path: full });
  }
}

for (const dir of SOURCE_DIRS) {
  const full = join(root, dir);
  if (existsSync(full)) collect(full, `源码/${dir}`);
}
for (const file of SOURCE_FILES) {
  const full = join(root, file);
  if (existsSync(full)) entries.push({ name: `源码/${file}`, path: full });
}

const { count, bytes } = buildZip(entries, target);

const mb = (bytes / 1024 / 1024).toFixed(1);
console.log(`打包 ${count} 个文件 → ${relative(root, target)}（${mb} MB）`);
console.log("包含：技术文档 / 总览 / 视频脚本 / 参考资料 / 界面截图 / 源码快照");
