# 简历工坊 — 工作流与进度

> 用于随时中断 / 继续。继续时先读「当前进度」和根目录的 `PLAN.md`，再运行 `npm run dev`。

## 项目目标

一个纯前端的简历制作工具（参考 UP简历 的基础能力），并增加「根据用户信息推荐国内招聘网站上的工作」。

- 技术栈：Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- 数据：全部保存在浏览器 localStorage，无后端、无账号
- 求职推荐：从简历提取关键词 → 本地岗位画像匹配打分 → 生成 BOSS直聘 / 拉勾 / 猎聘 / 智联 / 前程无忧 的精准搜索链接
- 明确不做：真实职位抓取（平台无公开 API 且违反 ToS）、云同步、登录

## 工作流

| 阶段 | 内容 | 状态 |
|---|---|---|
| 0 | 项目初始化 | ✅ 完成 |
| 1 | 数据模型与状态层 | ✅ 完成 |
| 2 | 编辑表单 | ✅ 完成 |
| 3 | 简历预览与导出 | ✅ 完成 |
| 4 | 求职推荐 | ✅ 完成 |
| 5 | 应用外壳与打磨 | ✅ 完成 |
| 6 | 验证 | ✅ 完成 |
| 7 | JD 匹配（追加） | ✅ 完成 |
| 8 | 编辑体验（追加） | ✅ 完成 |
| 9 | 主题色与新模板（追加） | ✅ 完成 |
| 10 | 分页控制与 PDF 页码（追加） | ✅ 完成 |
| 11 | AI 写简历（DeepSeek，追加） | ✅ 完成（M0–M4） |
| 12 | P1 数据安全与打印交付（追加） | ✅ 完成（2.1–2.6） |
| 13 | P2 内容能力（追加） | 🟡 进行中（3.1–3.3 完成） |

## 阶段明细

### 阶段 1 — 数据模型与状态层 ✅
- [x] `Resume` 类型：basic / intent / educations / experiences / projects / skills
- [x] 空白简历工厂 + 示例简历
- [x] localStorage 读写、JSON 导入导出与校验
- [x] `useResume`：客户端初始化、防抖自动保存、清空、载入示例

### 阶段 2 — 编辑表单 ✅
- [x] 通用 UI：Field / Input / TextArea / Select / SectionCard / Button
- [x] 基本信息、求职意向
- [x] 工作经历：增删、上移下移
- [x] 项目经历、教育经历
- [x] 技能标签输入 + 按目标岗位推荐缺失技能

### 阶段 3 — 预览与导出 ✅
- [x] A4 版式（210×297mm），按容器宽度自动缩放
- [x] 模板：现代 / 经典 / 紧凑
- [x] 打印样式：只打印简历，去除缩放、阴影、编辑器栏

### 阶段 4 — 求职推荐 ✅
- [x] 岗位画像库（12 类岗位）
- [x] 技能命中（技能标签 + 经历/项目正文）+ 简历完整度 → 匹配分
- [x] 缺失技能、简历优化建议
- [x] 招聘站 URL 生成（BOSS 城市编码、拉勾/智联城市名）
- [x] 推荐页 UI + 免责说明

### 阶段 5 — 外壳与打磨 ✅
- [x] 顶栏、编辑/推荐标签页（支持 `#jobs` 深链接）
- [x] 导入 / 导出 / 打印 / 重置
- [x] 移动端：顶栏精简、编辑与预览切换
- [x] 示例数据提示与一键清空

### 阶段 6 — 验证 ✅
- [x] `npm run lint` 通过
- [x] `npm run build` 通过（静态预渲染）
- [x] Chrome 无头自测：
  - 桌面 1440 / 移动端 390 均无横向溢出
  - 编辑后 900ms 内写入 localStorage
  - 推荐页生成 20 个招聘站链接（5 站 × 4 关键词）
  - BOSS 链接正确带上海城市编码 `101020100`
  - 三套模板与打印视图截图正常
  - 打印输出为单页 A4（595×842pt）
  - 无控制台 / 页面错误

### 阶段 7 — JD 匹配（追加）✅
- [x] 本地技能词典（12 类岗位画像 + 常用技术栈，约 100 项）
- [x] 粘贴 JD → 关键词识别、覆盖率评分、已覆盖 / 未体现
- [x] 年限与学历要求核验
- [x] JD 内容本地保存（localStorage）、一键清空
- [x] 自检：示例 JD 识别 10 个关键词、覆盖 9 个、得分 90，正确提示缺失 HTML

### 阶段 8 — 编辑体验（追加）✅
- [x] 工作 / 项目 / 教育条目拖拽排序，保留上下按钮作为移动端与键盘后备
- [x] 自动保存状态提示：保存中 / 已保存 / 示例数据不落盘
- [x] A4 页数估算，超过 1 页提示精简
- [x] 自检：拖拽后顺序正确、保存状态切换正常、长内容显示「约 2 页」
- [x] `npm run lint` 通过
- [x] `npm run build` 通过（`/` 静态预渲染）
- [x] `npm run qa` 通过：桌面 1440 / 移动 390 无横向溢出，三套模板与打印视图正常，PDF 单页 A4，JD 匹配 9 个关键词覆盖 8 个，无控制台错误

### 阶段 9 — 主题色与新模板（追加）✅
- [x] `Resume.theme.accent` 加入数据模型，随 localStorage / JSON 导入导出保存
- [x] 8 种预设主题色 + 任意自定义取色（`ThemePicker`）
- [x] 浅色自动压暗到 4.5:1 对比度；侧栏底色单独压暗到 8:1，保证白字可读
- [x] 主题色通过 CSS 变量应用到全部模板（标题、分隔线、项目符号、标签、侧栏）
- [x] 新增「侧栏」模板：左侧深色信息栏 + 右侧主栏
- [x] 新增「时间轴」模板：单栏 + 经历时间线
- [x] 打印时 `print-color-adjust: exact`，不依赖浏览器「背景图形」开关
- [x] 旧简历 / 旧 JSON 缺少 `theme` 时自动补默认色
- [x] 自检：主题色写入 localStorage（`#be123c`）并生效；侧栏模板单页 A4；无横向溢出
- [x] `npm run lint` / `npm run build` / `npm run qa` 通过

### 阶段 10 — 分页控制与 PDF 页码（追加）✅
- [x] 打印内容区改为「首页贴顶 289mm + 续页上下各留 8mm」，长简历续页不再顶到纸边
- [x] `@page` 页脚居中输出「第 N / M 页」，由 Chrome 原生 `counter(page)` / `counter(pages)` 生成，不依赖 JS 分页
- [x] 工作 / 项目条目新增「分页」开关（`pageBreakBefore`），打印时 `break-before: page`，预览中显示「分页」虚线标记
- [x] 首条记录不提供分页开关，五套模板也忽略首条标记，避免出现空白首页与孤立的小节标题
- [x] 预览页数按首页 289mm / 续页 281mm 估算；手动分页作为页数下限，多页时显示黄色提示与分页引导线
- [x] 侧栏模板跨页时深色侧栏只在第一页铺底，续页保持纯白（底色改画在纸张背景上）
- [x] 自检：2 页 / 3 页 PDF 页码正确、续页有 8mm 顶部留白、手动分页位置准确、首条分页被忽略
- [x] `npm run lint` / `npm run build` / `npm run qa` 通过

### 阶段 11 — AI 写简历（DeepSeek，追加）✅

- [x] 全站缺口审计，确认「AI 写简历」尚未实现
- [x] 用户指定 AI 为最高优先级（P0）
- [x] 合并 `GAPS.md` + `AI-PLAN.md` 为单一方案 `PLAN.md`
- [x] 方案确定：Next.js Route Handler + DeepSeek OpenAI 兼容接口 + SSE 流式 + 按板块生成 + 采用/撤销
- [x] 安全方案：Key 只放服务端环境变量，不发送姓名/电话/邮箱/整份简历
- [x] 用户提供 DeepSeek API Key，写入 `.env.local`（已被 gitignore）
- [x] `/models` 确认真实模型：`deepseek-flash`、`deepseek-v4-pro`；首版用 `deepseek-flash`
- [x] M0：`git init -b main`、首次提交、`.env.example`、mock 上游
- [x] M1：`/api/ai/status`、`/api/ai/generate`、SSE 转换
- [x] 真实 Key 联调：流式 delta、done + usage、简介单段、经历逐行要点
- [x] 发现并修复：`deepseek-flash` 默认 high effort 会耗尽 `max_tokens`，改用 `reasoning_effort: "low"`
- [x] 校验分支：400（参数/JSON）、413（64KB）、429（限流）返回正确
- [x] M2：AI 写简介弹窗、流式预览、停止/重新生成、覆盖确认、8 秒撤销
- [x] 隐私：服务端过滤邮箱/手机/链接；新写模式不发送现有简介
- [x] 无头 Chrome 验证：采用后 localStorage 同步、撤销可还原、390px 无横向溢出
- [x] M3：工作/项目板块、写入到现有条目或新建、替换/追加、覆盖确认、按条目撤销
- [x] 预览支持直接修改；采用后清空预览，重新打开不残留上次结果
- [x] M3 无头验证：
  - 新建工作经历：条目 +1、公司/职位/时间留空、描述与预览一致；撤销后条目消失
  - 替换现有工作经历：描述更新；撤销恢复原文
  - 新建项目：条目 +1、名称/角色/链接留空；撤销恢复数量
  - 编辑预览后再采用：写入的是编辑后的文本；撤销恢复原简介
  - 390px 弹窗宽度 390、无横向溢出；未配置 Key 显示配置步骤；无控制台错误
- [x] M4：QA 接入 AI 弹窗检查（拦截固定 SSE，不消耗额度）
- [x] M4：README 补充 AI 功能、DeepSeek 配置、隐私、Node 运行时部署与 mock 联调
- [x] M4：`npm run lint` / `npm run build` / `npm run qa` 全绿
- [x] M4：生产模式 `next start` + 真实 Key 流式联调通过（status 200，delta + done + usage）
- [x] M4 验收：`/` 静态预渲染，`/api/ai/status`、`/api/ai/generate` 为动态路由

> 方案细节、接口契约、Prompt、测试与验收全部在 `PLAN.md`。

### 阶段 12 — P1 数据安全与打印交付 ✅

- [x] 2.1 侧栏模板跨页缩进：打印时把侧栏改为首页浮动栏（72mm 浮动盒，内边距守住 62mm 深色区），续页正文回到 10mm 边距
- [x] 2.1 实测：第 1 页正文 204.2pt（72mm）与修复前一致，第 2 页从 204.2pt 变为 28.5pt（10mm）；单页侧栏输出不变
- [x] 2.1 QA：新增侧栏多页场景（打印媒体浮动布局、2 页 PDF、截图 `qa-sidebar-multipage.png`）
- [x] 2.2 保存失败提示：`saveResume` 返回成功/失败，`saveState` 增加 `error`
- [x] 2.2 顶部红色提示条「保存失败…请立即导出 JSON 备份」+ 一键导出；底部状态点变红
- [x] 2.2 QA：劫持 `localStorage.setItem` 抛 `QuotaExceededError`，编辑后出现提示条与导出按钮
- [x] 2.3 删除撤销：删除工作 / 项目 / 教育后 8 秒内可撤销，按原索引插回；导入 / 载入示例在非示例且有内容时二次确认
- [x] 2.3 QA：删除撤销、载入示例取消 / 确认、导入取消 / 确认
- [x] 2.4 打印前 `document.title` 改为「姓名-头衔」，`afterprint` 或不支持时兜底恢复；清洗文件名非法字符
- [x] 2.4 QA：打印标题为「林一-前端工程师」，打印后恢复站点标题
- [x] 2.5 手机端显示「导入」按钮；390px 头部无横向溢出
- [x] 2.6 导出 JSON 增加 `template` 字段；导入时恢复模板；旧备份无该字段仍兼容
- [x] 2.6 QA：导入 `classic` 后模板按钮与 localStorage 均为 classic；导出 JSON 含 modern，文件名 `林一.json`
- [x] P1 验证：`tsc`、`npm run lint`、`npm run qa`、`npm run build` 通过

> 方案细节、接口契约、Prompt、测试与验收全部在 `PLAN.md`。

### 阶段 13 — P2 内容能力（追加）🟡

- [x] 3.1 数据模型：`BasicInfo.photo` 保存压缩后的 JPEG Data URL；旧简历 / 旧 JSON 自动补空值
- [x] 3.1 上传：文件选择 + 居中裁成正方形 + 400×400 JPEG（0.82/0.62 两档质量），10MB 原图上限
- [x] 3.1 存储：只接受 `data:image/{jpeg,png,webp};base64` 且不超过 60 万字符，避免坏数据撑爆 localStorage
- [x] 3.1 表单：照片预览、上传 / 更换、移除、处理中与错误提示；手机端不横向溢出
- [x] 3.1 模板：现代（24mm 圆角）、经典（24mm 居中平衡）、紧凑（18mm）、侧栏（30mm 圆形）、时间轴（22mm 圆形）
- [x] 3.1 备份：照片随 JSON 导入 / 导出；QA 验证导出载荷含照片
- [x] 3.1 QA：上传后 400×400 JPEG 落盘、五套模板各 1 张、手机端入口、移除后清空
- [x] 3.2 数据模型：`CustomSection[]`（标题 / 显隐 / 条目）+ `CustomItem`（名称 / 机构角色 / 时间 / 说明 / 链接）；旧数据自动补空数组
- [x] 3.2 表单：预设证书 / 获奖 / 语言 / 校园经历 / 作品集 + 空白板块；条目增删、上下排序、板块排序
- [x] 3.2 显隐：隐藏只影响简历渲染，数据仍保留并写入备份；空板块与空条目不渲染
- [x] 3.2 模板：五套模板均在项目经历之后渲染自定义板块，沿用各自标题、字号与时间对齐样式
- [x] 3.2 删除保护：自定义条目 / 板块均接入 8 秒撤销，按原索引与所属板块恢复
- [x] 3.2 QA：添加两个板块、排序、隐藏/显示、条目与板块删除撤销、五套模板、JSON 备份、390px 无溢出、旧 JSON 兼容
- [x] 3.3 数据模型：`Project` 增加 `start/end`，与工作经历一致；旧简历 / 旧 JSON 自动补空字符串
- [x] 3.3 表单：项目卡片增加开始 / 结束时间输入；AI 新建项目也会带上空时间字段
- [x] 3.3 模板：五套模板显示项目起止时间，与项目链接同列右侧对齐，空时间不渲染
- [x] 3.3 QA：示例时间渲染、结束时间编辑后落盘、五套模板日期、JSON 备份、旧 JSON 兼容
- [ ] 3.4 教育增强（GPA / 排名 / 主修课程 / 荣誉）
- [ ] 3.5 多份简历

## 当前进度

- 最近更新：2026-10-27
- 状态：**阶段 0–12 全部完成；阶段 13（P2 内容能力）进行中，3.1 照片、3.2 自定义板块与 3.3 项目起止时间已完成**
- 代码状态：
  - M0：git 仓库、`.env.example`、`scripts/mock-deepseek.mjs` 完成
  - M1：`/api/ai/status`、`/api/ai/generate`、SSE 转换完成
  - M2：编辑页顶部「AI 帮我写」入口 + 简介弹窗 + 流式预览 + 采用/撤销完成
  - M3：简介/工作/项目三板块、写入到现有或新建条目、替换/追加、可编辑预览、按条目撤销完成
  - M4：QA AI 检查、README、lint/build/qa、生产模式真实 Key 联调完成
- P2 进度：3.1 证件照、3.2 自定义板块、3.3 项目起止时间完成；下一步 3.4 教育增强
- 本地地址：http://localhost:3000 （推荐页 http://localhost:3000/#jobs）
- 一键自检：先 `npm run dev`，再 `npm run qa`（截图输出到 `.screenshots/`）
- 单一方案文档：**`PLAN.md`**

### 本次会话日志（2026-10-27）

- 拿到 DeepSeek Key，写入 `.env.local`（已 gitignore，未提交）
- 调 `/models` 确认：`deepseek-flash`（V4.1-Flash）、`deepseek-v4-pro`；首版用前者
- M0：`git init -b main` + 首次提交；mock 上游自测通过（SSE / usage / [DONE]）
- M1：status / generate 路由 + SSE 转换；真实 Key 流式生成验证通过
- 关键修复：`deepseek-flash` 默认 high effort 把 450 token 全消耗在 reasoning 上，
  正文为空；改为 `reasoning_effort: "low"`，预算调为简介 700 / 经历与项目 1500
- 提示词按板块拆分格式规则：简介单段，经历/项目逐行要点且不编号
- M2：编辑页顶部 AI 入口 + 弹窗；配置检查、流式预览、停止/重新生成
- M2：覆盖非空简介需二次确认；采用后 8 秒撤销；未配置 Key 显示步骤
- M2：服务端过滤邮箱/手机/链接；新写模式不发送现有简介
- 无头 Chrome 验证：采用后 localStorage 同步、撤销还原、390px 无横向溢出、无控制台错误
- M3：工作/项目板块接入；「写入到」可选择现有条目或新建；替换/追加；覆盖需确认
- M3：按板块记录撤销信息（简介原文 / 条目描述原文 / 新建条目 id），8 秒内可撤销
- M3：预览可编辑；采用后清空，重新打开需重新生成
- M3 无头验证：新建/替换/撤销、项目新建/撤销、编辑后采用、390px、未配置状态全部通过
- 验证：400 / 413 分支、`tsc`、`npm run lint` 均通过
- M4：`scripts/qa.mjs` 增加 AI 检查（预览/覆盖确认/采用/撤销/重开清空/390px/未配置）
- M4：QA 的 AI 接口用固定 SSE 拦截，不消耗真实额度；检查失败时命令非 0 退出
- M4：README 补齐 AI 配置、隐私数据流、限流、Node 运行时部署与 mock 用法
- M4：`npm run lint`、`npm run build`、`npm run qa` 全绿；构建产物 `/` 静态、AI 路由动态
- M4：`next start` + 真实 Key 联调通过（`configured:true`、流式 delta、done + usage）
- 备注：`npm start` 前需结束残留 dev 子进程，否则 3000 端口 `EADDRINUSE`
- P1 2.1：复现 14 段经历 + 侧栏模板，第 2 页正文仍从 204.2pt（72mm）开始
- P1 2.1：打印时 `.resume-paper-sidebar` 改 block、侧栏改 float，浮动盒 72mm（62mm 侧栏 + 10mm 栏距）
- P1 2.1：第 2 页正文降到 28.5pt（10mm）；单页输出与修复前坐标一致；QA 新增侧栏多页检查
- P1 2.2：`saveResume` 改为返回 boolean；`SaveState` 增加 `error`，不再把写入失败当成功
- P1 2.2：编辑页顶部红色提示条 + 「导出 JSON」按钮；底部状态点/文案同步为失败
- P1 2.2 QA：劫持 `Storage.prototype.setItem` 后编辑姓名，提示条与导出按钮均出现
- P1 2.2 验证：`tsc`、`npm run lint`、`npm run qa` 通过
- P1 2.3：删除改为 8 秒撤销 Toast，按原索引插回；导入 / 载入示例增加覆盖确认并提示导出备份
- P1 2.3：导入 / 清除 / 载入示例时通过 `key` 重置表单局部状态，避免旧撤销污染新简历
- P1 2.4：打印前标题设为「姓名-头衔」，`afterprint` 与 1 秒兜底双重恢复；文件名非法字符替换
- P1 2.5：移除导入按钮的 `max-sm:hidden`，手机端可直接导入
- P1 2.6：`TemplateId` 抽出 `TEMPLATE_IDS` / `isTemplateId`；导出载荷增加 `template`，导入时恢复
- P1 2.6：旧 JSON 无 `template` 时保持当前模板，不影响兼容性
- P1 收尾：`tsc`、`lint`、`qa`、`build` 全部通过
- P2 3.1：新增 `src/lib/photo.ts`，浏览器内居中裁剪 + Canvas 压缩为 400×400 JPEG
- P2 3.1：`BasicInfo.photo` 随 localStorage / JSON 保存；导入时只接受合法图片 Data URL 且限制 60 万字符
- P2 3.1：基本信息卡新增照片预览、上传 / 更换 / 移除与错误提示；10MB 原图上限
- P2 3.1：五套模板加入照片位；现代 / 经典 / 紧凑为方形，侧栏 / 时间轴为圆形
- P2 3.1 QA：400×400 JPEG 落盘、五套模板展示、JSON 备份含照片、390px 无溢出、移除后清空
- P2 3.1 验证：`tsc`、`npm run lint`、`npm run qa` 通过
- P2 3.2：新增 `CustomSection` / `CustomItem`，`customSections` 随 localStorage 与 JSON 保存；缺字段自动补空数组
- P2 3.2：新增 `CustomSectionsEditor`，支持 5 个预设 + 空白板块、条目增删、板块/条目上下排序
- P2 3.2：隐藏板块只影响简历渲染；空板块与空条目不输出
- P2 3.2：五套模板在项目经历后渲染自定义板块；单行说明按普通段落，多行按要点
- P2 3.2：删除自定义条目/板块并入统一 8 秒撤销 Toast
- P2 3.2 QA：排序/显隐/撤销、五套模板、JSON 备份、390px 无溢出、旧 JSON 兼容全部通过
- P2 3.2 验证：`tsc`、`npm run lint`、`npm run qa` 通过
- P2 3.3：`Project` 增加 `start/end`，导入时旧项目自动补空字符串，示例项目补上时间
- P2 3.3：项目表单增加开始 / 结束时间；AI 新建项目带空时间字段
- P2 3.3：五套模板在项目标题右侧显示时间，与链接同列；空时间不输出
- P2 3.3 QA：时间渲染、编辑后落盘、五套模板、JSON 备份、旧 JSON 兼容全部通过
- P2 3.3 验证：`tsc`、`npm run lint`、`npm run qa` 通过

### 下次继续

1. 先读 `PLAN.md` 的「3. P2：内容能力」，再读本文件「当前进度」
2. 3.1 照片、3.2 自定义板块、3.3 项目起止时间已完成；下一步 3.4 教育增强
3. 3.4 改动面：`Education` 增加 GPA / 排名 / 主修课程 / 荣誉选填字段，导入兼容、教育表单、五套模板展示、旧 JSON 默认空值
4. 每完成一项跑 `npm run lint`、`npm run build`、`npm run qa` 并更新本文件

## 可选后续

- [x] AI 写简历（DeepSeek）— M0–M4 完成；详见 `PLAN.md`
- [ ] AI 润色 / JD 匹配改写 / 多语言翻译（AI 首版跑通后再考虑）
- [ ] 接入职位聚合 API（JSearch / Adzuna），用 Next.js Route Handler 隐藏 key
- [ ] 更多字体搭配 / 模板变体（配色已支持）
- [ ] 拖拽排序替换上下按钮（注：阶段 8 已实现拖拽手柄，此处仅剩纯鼠标拖拽体验优化）
- [x] P1 数据安全与打印交付（侧栏跨页、保存失败、覆盖保护、PDF 文件名等；详见 `PLAN.md`）

## 如何继续

1. 读「当前进度」和 `PLAN.md` 的「P0：AI 写简历」
2. 确认 `.env.local` 里的 `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL`
3. `npm run dev`
4. AI（P0）与 P1 已完成；当前按 `PLAN.md` 的 P2 顺序推进，3.1–3.3 已完成
5. 每完成一步更新本文件，尤其是「当前进度」与阶段 13 勾选项

## 文件地图

```
src/
  app/                  layout.tsx / page.tsx / globals.css（含打印样式）
  components/
    AppShell.tsx        顶栏、标签页、导入导出、打印、客户端挂载门控
    resume/
      ResumeForm.tsx    编辑表单与重复条目
      ResumePreview.tsx A4 容器与自动缩放、分页估算
      ThemePicker.tsx   主题色预设与自定义取色
      templates.tsx     现代 / 经典 / 紧凑 / 侧栏 / 时间轴
    jobs/
      JobsPanel.tsx     匹配结果、建议、招聘站入口
      JdMatcher.tsx     粘贴 JD 测匹配度
      SkillChip.tsx     技能标签
    ui/                 Field / Button / SectionCard
  hooks/useResume.ts    初始化、自动保存、清空、示例
  lib/
    types.ts            类型与空白工厂
    defaultResume.ts    示例数据
    storage.ts          localStorage、JSON 导入导出与校验
    jobProfiles.ts      岗位画像库
    matching.ts         技能匹配、评分、建议
    jdMatch.ts          JD 关键词识别、覆盖率、年限/学历核验
    jobBoards.ts        招聘站 URL 与城市编码
    theme.ts            主题色校验、可读性压暗与 CSS 变量
scripts/qa.mjs          无头浏览器截图、溢出检查、分页与 PDF 页数自检
PLAN.md                单一优化方案（AI 为 P0；数据安全、内容能力、路线图）
```

### 阶段 11 新增文件

```
src/app/api/ai/status/route.ts     ✅ Key / 模型状态（运行时读取）
src/app/api/ai/generate/route.ts   ✅ 校验、限流、SSE 转换
src/lib/ai/types.ts                ✅ 请求 / 事件 / 状态类型
src/lib/ai/config.ts               ✅ 环境变量读取
src/lib/ai/client.ts               ✅ 浏览器端 SSE 客户端
src/lib/ai/prompt.ts               ✅ 提示词、payload、输出清洗、联系方式过滤
src/lib/ai/deepseek.ts             ✅ 上游请求、重试、SSE 解析
scripts/mock-deepseek.mjs          ✅ 本地 mock 上游
.env.example                       ✅ 环境变量示例
src/components/resume/AiWriter.tsx ✅ 三板块弹窗、可编辑流式预览、新建/替换/追加、撤销
src/app/api/ai/models/route.ts     ⬜ 可选，暂不实现
```
