/**
 * 打包「完整作品」zip：直接上传网盘用。
 *
 * 提交材料/ 只放要上传的三个文件（两个 PDF + 生成的 zip）；
 * 说明类文档放在 docs/，打包时改个名字带进去，保持一个入口。
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { buildZip } from "./zip.mjs";

const root = process.cwd();
const folder = join(root, "提交材料");
const target = join(folder, "简历工坊-完整作品.zip");

const deliverables = ["技术文档.pdf", "作品介绍文档.pdf"];
const guides = [
  ["00-提交说明.md", "提交说明.md"],
  ["提交总览.md", "提交总览.md"],
  ["提交表单填写.md", "提交填写指南.md"],
  ["上线Vercel.md", "上线Vercel.md"],
];

const entries = [];
for (const name of deliverables) {
  const path = join(folder, name);
  if (!existsSync(path)) {
    throw new Error(`缺少提交文件：提交材料/${name}`);
  }
  entries.push({ name, path });
}
for (const [name, source] of guides) {
  const path = join(root, "docs", source);
  if (!existsSync(path)) {
    throw new Error(`缺少说明文档：docs/${source}`);
  }
  entries.push({ name, path });
}

// 参考资料：引用仓库原文，避免两份内容不一致
const references = [
  ["参考资料/项目说明.md", join(root, "README.md")],
  ["参考资料/离线评测报告.md", join(root, "docs/eval-report.md")],
  ["参考资料/部署说明.md", join(root, "docs/DEPLOY.md")],
  ["参考资料/扩展说明.md", join(root, "extension/README.md")],
];
for (const [name, path] of references) {
  if (existsSync(path)) entries.push({ name, path });
}

const imageDir = join(root, "docs/img");
if (existsSync(imageDir)) {
  for (const file of readdirSync(imageDir).sort()) {
    if (file.toLowerCase().endsWith(".png")) {
      entries.push({ name: `界面截图/${file}`, path: join(imageDir, file) });
    }
  }
}

// 源码快照（不含 .git / node_modules / 构建产物）
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
const SKIP_NAMES = new Set(["node_modules", ".next", ".git", ".screenshots", "img", "dist"]);

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
console.log(
  `打包 ${count} 个文件 → ${relative(root, target)}（${(bytes / 1024 / 1024).toFixed(1)} MB）`,
);
