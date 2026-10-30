/**
 * 把 extension/ 打成一个 zip，用于分发与上架提交。
 *
 * 打包前先做静态校验：manifest 引用的文件是否存在、图标尺寸是否与声明一致。
 * Chrome 不能直接加载 zip，本地安装仍需解压后「加载已解压的扩展程序」。
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { buildZip } from "./zip.mjs";

const SOURCE = join(process.cwd(), "extension");
const manifest = JSON.parse(readFileSync(join(SOURCE, "manifest.json"), "utf8"));
const target = join(process.cwd(), `extension-${manifest.version}.zip`);

const referenced = new Set(
  [
    manifest.background?.service_worker,
    manifest.action?.default_popup,
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {}),
    ...(manifest.content_scripts ?? []).flatMap((script) => script.js ?? []),
  ].filter(Boolean),
);

for (const file of referenced) {
  if (!existsSync(join(SOURCE, file))) {
    throw new Error(`manifest 引用了不存在的文件：${file}`);
  }
}

for (const [size, file] of Object.entries(manifest.icons ?? {})) {
  const buffer = readFileSync(join(SOURCE, file));
  if (buffer.readUInt32BE(0) !== 0x89504e47) {
    throw new Error(`${file} 不是有效的 PNG`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== Number(size) || height !== Number(size)) {
    throw new Error(
      `${file} 实际尺寸 ${width}x${height}，manifest 声明的是 ${size}`,
    );
  }
}

console.log(
  `校验通过：${referenced.size} 个文件存在，${Object.keys(manifest.icons ?? {}).length} 个图标尺寸匹配`,
);

function collect(directory) {
  const files = [];
  const walk = (current) => {
    const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(directory);
  return files;
}

const entries = collect(SOURCE).map((file) => ({
  name: relative(SOURCE, file).split(sep).join("/"),
  path: file,
}));

const { count, bytes } = buildZip(entries, target);
console.log(
  `打包 ${count} 个文件 → ${relative(process.cwd(), target)}（${(bytes / 1024).toFixed(1)} KB）`,
);
