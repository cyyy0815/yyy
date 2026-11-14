<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 发布流程（每次推送后必做）

本项目同时部署在 GitHub `cyyy0815/yyy` 与 Vercel 生产环境 <https://yyy-sandy.vercel.app/>。

- `git push origin main` 只是第一步。推送后必须等 Vercel 自动部署完成（通常 1–3 分钟），并验证线上已经包含本次改动，不能只 push 就结束。
- 页面 `<head>` 里有 `<meta name="build-sha" content="...">`，内容来自 Vercel 构建时的 `VERCEL_GIT_COMMIT_SHA`（本地构建为 `dev`）。用无头浏览器或无痕窗口打开生产地址，读取这个 meta，和 `git log -1 --format=%h` 对比即可确认线上版本。
- 验证时带上随机 query 或使用无痕窗口，避免 CDN / Service Worker 缓存造成误判。
- 若 3–5 分钟后线上仍是旧版本：先看 Vercel Dashboard → Deployments 是否有对应 commit 的构建；构建失败看日志；没有新部署则检查 Git 集成，必要时手动 Redeploy。
- 浏览器侧残留旧版通常是 Service Worker / Cache Storage：只清 Service Worker 与 Cache Storage，不要点 Clear site data（会删 localStorage 里的简历）。

