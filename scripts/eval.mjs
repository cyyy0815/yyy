/**
 * 跑离线评测并生成 docs/eval-report.md。
 *
 * 评测逻辑写在 src/lib/eval/report.ts（纯函数，可被测试与文档复用），
 * 这里只负责用 vitest 的环境执行它并打开写文件的开关。
 */
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "npx",
  ["vitest", "run", "src/lib/__tests__/eval.test.ts"],
  {
    stdio: "inherit",
    env: { ...process.env, EVAL_WRITE: "1" },
    shell: true,
  },
);

if ((result.status ?? 1) === 0) {
  console.log("\n评测报告已生成：docs/eval-report.md");
}

process.exit(result.status ?? 1);
