# 部署与在线演示

本应用是「本地优先」的：简历与投递记录只存在访问者自己的浏览器里，服务端只提供页面和 AI 代理接口。
部署时唯一需要保密的是 `DEEPSEEK_API_KEY`，它只存在于服务端环境变量中。

## 方案 A：Vercel（最省事，推荐）

1. 把仓库推到 GitHub（Public，或给评审访问权限）
2. Vercel → New Project → 选中仓库，框架会被识别为 Next.js，无需改构建命令
3. 在 Project Settings → Environment Variables 添加：

| 变量 | 必填 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | 是 | 服务端调用模型用的 Key，**不要**加 `NEXT_PUBLIC_` 前缀 |
| `DEEPSEEK_MODEL` | 否 | 默认 `deepseek-chat` |
| `DEEPSEEK_BASE_URL` | 否 | 默认官方接口地址 |

4. 部署完成后打开域名，`/api/ai/status` 应返回 `{"configured":true,...}`

> Vercel 会自动处理 HTTPS 与 Host，应用的「同源校验」无需额外配置。

## 方案 B：自有服务器（Node + nginx）

```bash
git clone <repo> && cd <repo>
npm ci
npm run build
DEEPSEEK_API_KEY=sk-xxx npm run start   # 默认 3000 端口
```

前面放 nginx 时，三件事必须做对：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;                 # 同源校验依赖 Host
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;                         # AI 是 SSE 流式，别缓冲
    proxy_read_timeout 300s;
}
```

- 应用取 `X-Forwarded-For` 的**最右一跳**作为客户端 IP，默认只有一层代理；
  多层代理时用 `TRUSTED_PROXY_HOPS` 调整（例如 CDN + nginx 填 2）
- AI 接口有同源校验：`Origin` / `Host` 不一致会返回 403，所以别把页面挂在域名 A、
  却让接口走域名 B
- 限流是**单进程内存**实现：多实例部署时每个实例各自计数，演示场景够用，生产要换 Redis

## 演示前准备

1. 打开站点 → 顶栏「**演示场景**」→ 确认，自动载入「小林 + 3 个目标岗位」并切到职位推荐
2. 三个岗位的匹配度天然拉开（前端高、数据分析中、Java 后端低），适合讲「为什么这个岗位值得投」
3. 点「准备」→「启动求职 Agent」，前两步本地执行、后两步走模型，适合演示 AI 链路
4. 浏览器扩展的演示需要本地加载 `extension/`，在线演示可不讲这部分（录屏里讲）

## 评审期间保持可用

- 免费额度方案要注意并发与配额；建议给演示域名加访问口令（如 Vercel Password Protection），
  口令写在提交材料里
- 页面本身可离线（PWA），但 AI 功能依赖服务端，断网时只有本地匹配部分可用
