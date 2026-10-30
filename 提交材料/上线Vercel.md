# 上线到 Vercel（约 10 分钟）

> 目标：拿到一个**不依赖你电脑**的固定公网地址，用于「在线演示」加分项。
> 全程需要你本人登录 GitHub 与 Vercel；本地命令可以直接复制。

## 0. 推送前自检

```bash
npm run preflight
```

全部 ✅ 再往下走（⚠️ 项建议处理，❌ 项必须处理）。

## 1. 改作者信息

现在每个提交的作者是 `c <c@localhost>`，公开后会显示在仓库首页。先改成你自己的：

```bash
git config user.name "你的名字"
git config user.email "你的邮箱"
```

要让**历史提交**也改名（仓库没有 remote，改写是安全的）：

```bash
git filter-branch --env-filter '
export GIT_AUTHOR_NAME="你的名字"; export GIT_AUTHOR_EMAIL="你的邮箱"
export GIT_COMMITTER_NAME="你的名字"; export GIT_COMMITTER_EMAIL="你的邮箱"
' -- --all

git log --oneline -3          # 确认作者已变
git status                    # 工作区应干净
```

## 2. 在 GitHub 建空仓库

1. 打开 https://github.com/new
2. Repository name：`resume-workshop`（随意）
3. 选 **Public**
4. **不要**勾选 Add README / .gitignore / license（本地已有内容，勾了会冲突）
5. Create repository

## 3. 推送

在 `D:\web` 下执行（把 `<你的用户名>` 换成你的）：

```bash
git remote add origin https://github.com/<你的用户名>/resume-workshop.git
git branch -M main
git push -u origin main
```

首次推送会弹出 **Git Credential Manager** 登录窗口，用浏览器授权一次即可。

推送完检查：

```bash
git remote -v
```

然后打开仓库网页，确认：能匿名访问、README 正常渲染、`提交材料/技术文档.pdf` 可预览。

## 4. 导入 Vercel

1. 打开 https://vercel.com/new
2. 用 GitHub 登录 → Import Git Repository → 选中 `resume-workshop`
3. Framework Preset 会自动识别为 **Next.js**，构建命令与输出目录不用改
4. 展开 **Environment Variables**，添加：

| Name | Value |
|---|---|
| `DEEPSEEK_API_KEY` | 你的 Key（**不要**加 `NEXT_PUBLIC_` 前缀） |

可选：`DEEPSEEK_MODEL`（默认 `deepseek-flash`）。

5. 点 **Deploy**，等 1–2 分钟

## 5. 部署后验证（照着点一遍）

| 检查 | 期望 |
|---|---|
| 打开 `https://<项目名>.vercel.app` | 页面正常，标题「简历工坊 · 简历制作与求职推荐」 |
| 打开 `/api/ai/status` | `{"configured":true,"model":"deepseek-flash"}` |
| 顶栏「演示场景」→ 确认 | 自动滚到待投清单，3 个岗位 |
| 任一岗位「准备」→「启动求职 Agent」 | 面板标注「**模型规划**」，步骤理由贴合该岗位 |
| 第三步「执行」 | 文案流式输出，出现事实核对条 |
| 「打印 / PDF」 | 打印预览正常分页 |

任意一项不符合，看 Vercel 的 **Functions 日志**（Deployments → 最新 → Logs）。

## 6. 回填地址

拿到域名后，两处要更新（我可以帮你改）：

- `提交材料/提交总览.md` 的「在线演示」一行
- 大赛官网的「在线演示地址」字段

并在提交说明里加一句：

> 演示数据：打开后点顶栏「演示场景」，会载入示例简历与 3 个目标岗位。

## 7. 已知限制（评委可能会问）

- **数据在访客自己的浏览器**，换设备/清缓存就是空的——这是隐私优先的设计取舍，不是 bug
- **AI 接口有同源校验与限流**：跨站调用返回 403，同一 IP 高频请求会被 429
- **Hobby 计划函数上限 60 秒**：长文本生成已设置 `maxDuration = 60`，极端情况下仍可能被截断
- **限流是单进程内存**：Vercel 多实例时每个实例各自计数，演示够用
- **不要公开展示 API Key**：它只在 Vercel 环境变量里，前端读不到

## 8. 提交后不要再改

赛事规则写明**提交后不得修改**。部署完成后建议：

1. 打一个 tag 记录提交版本：`git tag v1.0-submit && git push origin v1.0-submit`
2. 之后本地改动只留在工作区，不再推送到这个仓库
3. Vercel 的地址在评审期内保持不动
