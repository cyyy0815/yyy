/**
 * 把 extension/ 打成一个 zip，用于分发与上架提交。
 *
 * 不装依赖：Chrome 扩展包就是普通 zip，用 STORE（不压缩）方式写即可，
 * PNG / JS 本来压缩收益也有限。
 *
 * 注意：Chrome 不能直接加载 zip，本地安装仍然要把 zip 解压后「加载已解压的扩展程序」。
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, relative, sep } from "node:path";

const SOURCE = join(process.cwd(), "extension");
const manifest = JSON.parse(readFileSync(join(SOURCE, "manifest.json"), "utf8"));
const target = join(
  process.cwd(),
  `extension-${manifest.version}.zip`,
);

/**
 * 打包前先做静态校验：Chrome 加载扩展时才会暴露的问题（缺文件、图标尺寸不符），
 * 在这里提前挡掉，避免用户装完才发现是坏的。
 */
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

const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  CRC_TABLE[index] = value >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date:
      ((date.getFullYear() - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate(),
  };
}

const files = collect(SOURCE);
const stamp = dosDateTime(new Date());
const localParts = [];
const centralParts = [];
let offset = 0;

for (const file of files) {
  const data = readFileSync(file);
  const name = relative(SOURCE, file).split(sep).join("/");
  const nameBuffer = Buffer.from(name, "utf8");
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x0800, 6); // 文件名 UTF-8
  local.writeUInt16LE(0, 8); // STORE
  local.writeUInt16LE(stamp.time, 10);
  local.writeUInt16LE(stamp.date, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuffer.length, 26);
  local.writeUInt16LE(0, 28);
  localParts.push(local, nameBuffer, data);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(stamp.time, 12);
  central.writeUInt16LE(stamp.date, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuffer.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(offset, 42);
  centralParts.push(central, nameBuffer);

  offset += local.length + nameBuffer.length + data.length;
}

const centralDirectory = Buffer.concat(centralParts);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralDirectory.length, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);

const archive = Buffer.concat([...localParts, centralDirectory, end]);
writeFileSync(target, archive);

console.log(
  `打包 ${files.length} 个文件 → ${relative(process.cwd(), target)}（${(archive.length / 1024).toFixed(1)} KB）`,
);
