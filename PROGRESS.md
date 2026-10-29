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
| 13 | P2 内容能力（追加） | ✅ 完成（3.1–3.5） |
| 14 | P3 体验与健壮性（追加） | ✅ 完成（4.1–4.8） |
| 15 | AI 功能完善（追加） | ✅ 完成（JD 定制 + 整份生成） |
| 16 | P4 工程化与分发（追加） | ✅ 完成（单测 / CI / SEO / manifest / 清理） |
| 17 | P2 收尾：可点击链接（追加） | ✅ 完成（安全 href + 五套模板） |
| 18 | AI 整份简历结构化生成（追加） | ✅ 完成（自述 → 教育/工作/项目/技能，新建简历） |
| 19 | 全部简历备份与导入（追加） | ✅ 完成（整库导出 + 兼容导入） |
| 20 | 全局撤销 / 重做 + 真实 Key 验证（追加） | ✅ 完成（撤销栈 + 快捷键 + `/api/ai/full` 实测） |
| 21 | 技能分组与熟练度（追加） | ✅ 完成（分组增删改排序 + 熟练度 + 五套模板展示） |
| 22 | AI 求职信（追加） | ✅ 完成（求职信生成 + 预览编辑 + 复制下载） |
| 23 | 投递看板与多 JD 管理（追加） | ✅ 完成（状态看板 + 独立 JD + 整库备份） |
| 24 | 单份导出与合并导入（追加） | ✅ 完成（单份分享文件 + 追加简历 / 投递记录） |
| 25 | ATS 文本导出与关键词覆盖（追加） | ✅ 完成（纯文本 / Markdown + JD 覆盖率） |
| 26 | AI 生成后的事实核对（追加） | ✅ 完成（数字 / 技能 / 名称 + 实时提示） |
| 27 | 内置板块显隐 / 排序与一页适配（追加） | ✅ 完成（布局编辑 + 五套模板 + 页数实时适配） |
| 28 | 统一 Dialog 与可访问性（追加） | ✅ 完成（焦点陷阱 / 焦点归还 + 滚动锁 + 跳转链接 / reduced motion） |
| 29 | 数据版本与持久化历史（追加） | ✅ 完成（schemaVersion + 刷新后仍可撤销 / 重做） |
| 30 | QA 进 CI 与组件测试（追加） | ✅ 完成（生产模式浏览器 QA + Dialog / 布局组件测试） |
| 31 | 安全响应头（追加） | ✅ 完成（CSP + HSTS + COOP / CORP + 关闭 X-Powered-By） |
| 32 | 岗位库与技能同义词（追加） | ✅ 完成（26 类画像 + JS/TS/K8s 等别名归一 + C 系边界） |
| 33 | 离线缓存 / PWA（追加） | ✅ 完成（应用外壳 SW + 更新提示 + 离线提示 + QA） |

## 关机交接（2026-10-29）

- 阶段 33（离线缓存 / PWA）已完成并提交，提交为 `319482b`；阶段 0–32 的历史提交见 `git log`。
- 阶段 0–33 全部完成；最新验证为 `npx tsc --noEmit`、`npm run lint`、`npm test`（176 passed，19 个文件）、`npm run qa`（生产模式 185 项 / 开发模式 180 项，均通过）、`npm run build` 全部通过。
- 离线行为只在生产构建验证：`npm run build && npm run start` 后 `npm run qa`；开发模式会主动注销旧 SW 并清理缓存，因此只做「不注册 SW」检查。
- `/api/ai/full` 已用 `.env.local` 中的真实 DeepSeek Key 验证：长自述返回合法 JSON，`response_format: json_object` 生效，`usage` 为 prompt 1489 / completion 2245，未触发 4000 token 上限，输出不含联系方式。
- 下次先读本文件的「当前进度 / 下次继续」与 `PLAN.md`，再运行：

  ```bash
  npm run dev
  ```

  打开 http://localhost:3000 ；AI 功能依赖 `.env.local` 中的 DeepSeek 配置，改动环境变量后需重启 dev server。
- 下一优先级：双语 / 英文输出、更多模板变体、职位聚合 API 等可选项；开始前先确认需求与范围。

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
- [x] 岗位画像库（当前 18 类岗位）
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
- [x] 本地技能词典（当前 18 类岗位画像 + 常用技术栈）
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

### 阶段 13 — P2 内容能力（追加）✅

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
- [x] 3.4 数据模型：`Education` 增加 `gpa / ranking / courses / honors` 选填字段；旧简历 / 旧 JSON 自动补空字符串
- [x] 3.4 表单：教育卡片增加 GPA、排名、主修课程、荣誉输入；示例教育数据补全
- [x] 3.4 模板：五套模板按各自字号渲染 GPA / 排名、主修课程、荣誉，空字段不输出
- [x] 3.4 QA：字段渲染、GPA 编辑后落盘、五套模板、JSON 备份、旧 JSON 兼容与空字段隐藏
- [x] 3.5 存储：新增 `resume-workshop:library:v1` 保存非当前文档快照，当前文档继续用 `v1` 与 template key，旧单简历数据无需迁移
- [x] 3.5 操作：文档栏支持新建空白、复制、重命名、切换、删除；切换前同步保存目标文档与当前快照，至少保留一份
- [x] 3.5 隔离：每份简历独立保存内容与模板；复制后可到职位推荐页按 JD 调整
- [x] 3.5 QA：重命名、复制、切换后内容/模板恢复、刷新保留、删除后回退、空白新建与再次切回、390px 无溢出

### 阶段 14 — P3 体验与健壮性（追加）✅

- [x] 4.1 多标签页防覆盖：保存前比较 localStorage 原始 JSON 与上次写入值；`storage` 事件同步提示；冲突期间暂停保存
- [x] 4.1 冲突条提供「重新载入对方版本」/「保留本页版本」，保留后立即写入并恢复自动保存
- [x] 4.1 QA：双标签页修改后出现冲突条，冲突期间不覆盖另一页数据，确认保留后恢复保存
- [x] 4.2 输入校验：姓名必填、邮箱 / 手机号、URL、薪资 min ≤ max、起止时间格式与先后顺序；失焦提示，不阻断保存
- [x] 4.2 QA：错误提示出现与修正后消失、薪资倒置、日期格式、项目链接、姓名必填
- [x] 4.3 保存时间：状态区显示「最后保存于 HH:MM」；`saveResume` 记录首次使用与保存时间
- [x] 4.3 备份提醒：超过 7 天未导出显示提醒条，支持导出 JSON 与暂停 3 天；导出记录 `last-export-at`
- [x] 4.3 QA：8 天未导出出现提醒、暂停后刷新仍生效、从提醒导出后记录时间
- [x] 4.4 JSON 导入：校验 top-level 对象、`basic` 字段、条目数组、技能类型与主题对象；5MB 大小上限
- [x] 4.4 QA：拒绝 basic 类型错误 / 空 basic / skills 类型错误 / 无效条目 / 超大文件
- [x] 4.5 错误边界：新增 `app/error.tsx`、`global-error.tsx`、`not-found.tsx`，使用 Next 16 的 `retry` 回调
- [x] 4.5 QA：未知路径返回 404 并显示「页面不存在」
- [x] 4.6 打印与可访问性：页码开关使用命名页 `no-page-numbers`；打印浅灰文字压深；主题色圆点 24px；移动端编辑/预览加 `aria-pressed`
- [x] 4.6 QA：关闭页码持久化、打印媒体下计算 `page` 为 `no-page-numbers`、浅灰文字对比度、圆点尺寸、`aria-pressed`
- [x] 4.7 推荐页门槛：期望岗位 / 简介 / 技能 / 经历 / 项目 / 教育任一有内容即可进入；空状态文案同步
- [x] 4.7 JD 缺口一键补：岗位画像与 JD 的「未体现」技能均可点击，大小写去重后写入技能并提示
- [x] 4.7 关键词回退：无期望岗位时依次使用简介、最近经历 / 项目角色，避免搜索关键词为空
- [x] 4.7 QA：仅简介可进入推荐页；点击 JD 缺口后写入 localStorage、匹配结果更新并显示提示
- [x] 4.8 岗位库：新增销售/商务、市场营销、财务/会计、人力资源、客服/客户成功、教师/培训 6 类画像
- [x] 4.8 城市：BOSS 直聘城市编码从 20 个扩到 40 个
- [x] 4.8 QA：销售经理画像命中、宁波映射 `101210400`、搜索关键词为「销售经理」
- [x] README：补充 P3 功能、导入限制、备份提醒、页码开关与 Chrome / Firefox / Safari 打印兼容说明
- [x] 验证：`tsc`、`npm run lint`、`npm run qa`、`npm run build` 通过

### 阶段 15 — AI 功能完善（追加）✅

- [x] 新增 `src/lib/jdStorage.ts`，JD 匹配页与 AI 弹窗共用同一份本地 JD（`resume-workshop:jd`）
- [x] AI 弹窗打开时自动读取 JD 匹配页保存的 JD（最多 4000 字），可修改或清空
- [x] 接口新增可选 `jd` 字段：服务端限制 4000 字、过滤联系方式，并加入提示词；只用于调整表述重点，禁止把 JD 要求写成已有事实
- [x] 优化模式允许关键词为空，只要当前板块有内容即可生成；新写模式仍要求关键词
- [x] 新增「整份简历」入口：串行生成个人简介、工作经历、项目经历，三块独立流式预览且可修改
- [x] 整份采用：覆盖个人简介，各追加一条空白公司/项目名的工作与项目条目；摘要非空时二次确认；8 秒内可整体撤销
- [x] QA：JD 自动读取、优化模式空关键词、请求携带 JD、整份生成三段、一次采用、整体撤销、控制台无错误
- [x] 接口校验实测：`polish` + 空关键词 + 超长 JD 返回 JD 长度错误，证明空关键词在优化模式下已通过校验
- [x] 验证：`tsc`、`npm run lint`、`npm run qa` 通过（build 在提交前执行）

### 阶段 16 — P4 工程化与分发（追加）✅

- [x] 接入 Vitest：`npm test` / `npm run test:watch`；升级 `@types/node` 到 24 以匹配 Vitest 5
- [x] 单元测试 45 个：`normalizeResume` / `parseResumeJSON`、技能匹配与评分、JD 关键词/年限/学历、输入校验、SSE 解析（跨分片、CRLF、`reasoning_content`、`[DONE]`、中止）
- [x] CI：`.github/workflows/ci.yml`，Node 24 下执行 `npm ci`、lint、`tsc --noEmit`、单元测试与生产构建
- [x] SEO：`layout.tsx` 补充 OG / Twitter / 关键词 / `theme-color` / `formatDetection`；支持 `NEXT_PUBLIC_SITE_URL` 与 Vercel 生产域名
- [x] 分享卡片：`opengraph-image.tsx` 生成 1200×630 PNG；因 `ImageResponse` 默认字体缺中文字形，文案使用英文
- [x] 安装清单：`manifest.ts` + `public/icon-192.png` / `icon-512.png`；自定义 `favicon.ico`、`icon.svg`、`apple-icon.png`
- [x] 清理 `public/` 下未使用的 Next 默认 SVG
- [x] QA 新增 OG / Twitter / manifest / 图标元数据与 192/512 图标、分享图可访问检查
- [x] README 补充测试、CI、SEO/OG、manifest、`NEXT_PUBLIC_SITE_URL` 与无 Service Worker 说明
- [x] 验证：`tsc`、`npm run lint`、`npm test`（45 passed）、`npm run qa`、`npm run build` 通过
- [x] 有意不做：Service Worker 离线缓存（只提供可安装清单）

### 阶段 17 — P2 收尾：可点击链接（追加）✅

- [x] 新增 `src/lib/links.ts`：`toSafeHref` 只放行 http/https，自动补协议；`displayUrl` 生成短链接
- [x] 过滤 `javascript:`、`data:`、`file:` 等危险协议，以及无域名、含空格的值
- [x] 五套模板：网站 / GitHub / 项目链接 / 自定义板块链接改为 `<a>`，新标签打开，PDF 中可点击
- [x] 联系人列表统一走 `contactItems`，非法链接只显示文本，不生成锚点
- [x] 单测新增 4 个（共 49 个）：协议补全、危险协议、短链接展示
- [x] QA 新增：网站 / 项目 / 自定义安全链接可点击、`javascript:` 不渲染为链接、页面无控制台错误
- [x] 验证：`tsc`、`npm run lint`、`npm test`（49 passed）、`npm run qa`、`npm run build` 通过

### 阶段 18 — AI 整份简历结构化生成（追加）✅
- [x] 新增 `src/lib/ai/fullResume.ts`：整份 JSON 提示词、payload、白名单字段解析、待补充项统计
- [x] 新增 `/api/ai/full`：自述校验、限流、上游 SSE 转发；公共工具抽到 `src/lib/ai/http.ts`
- [x] AI 弹窗「整份简历」改为一段自述一次生成，不再串行调用三次
- [x] 生成结果覆盖简介、教育、工作、项目、技能；不生成姓名、联系方式与链接
- [x] 缺失字段留空，预览按板块展示并列出「自述里没提到、已留空」的字段
- [x] 采用时新建一份简历并切换过去，当前简历保留在顶部文档列表
- [x] mock 上游返回整份 JSON；QA 覆盖结构化预览、写入新简历、旧简历保留与隐私字段
- [x] 单测新增 6 个（共 55 个）：JSON 围栏、白名单过滤、缺失字段、空白条目、错误格式、payload
- [x] 验证：`tsc`、`npm run lint`、`npm test`（55 passed）、`npm run qa`、`npm run build` 通过

### 阶段 19 — 全部简历备份与导入（追加）✅
- [x] `storage.ts` 新增整库备份格式（`format` / `version: 2` / `activeId` / `documents`），包含当前文档与所有快照
- [x] 导出文件名取当前文档标题：`标题-全部简历.json`；文件名非法字符替换
- [x] `parseImportFile` 兼容旧版单份 JSON 与整库备份：逐份校验结构、去重 id、修正无效 activeId
- [x] `useResumeDocuments` 新增 `collectAll` / `importLibrary`：导入时重新分配 id、去重标题，替换全部简历并恢复模板
- [x] 整库导入前二次确认，成功后提示导入份数；旧版单份导入流程与提示不变
- [x] 单测新增 6 个（共 61 个）：旧格式兼容、整库解析、activeId 回退、重复 id、无效备份
- [x] QA：导出备份含两份文档与模板；在另一份简历上导入后恢复两份文档、当前文档与模板；照片 / 自定义板块 / 打印导出断言改用新格式
- [x] 验证：`tsc`、`npm run lint`、`npm test`（61 passed）、`npm run qa`、`npm run build` 通过

### 阶段 20 — 全局撤销 / 重做 + 真实 Key 验证（追加）✅
- [x] 新增 `src/lib/history.ts`：通用撤销 / 重做栈，上限 60 步，连续输入 700ms 内合并为一步
- [x] 快照按引用保存；所有简历更新均为不可变更新，无需深拷贝
- [x] `useResume` 统一记录内容修改：表单编辑、AI 采用、增删、排序、分页开关、主题色、清空、载入示例
- [x] 撤销 / 重做会恢复当时的 `isSample` 状态；切换、复制、新建、导入简历时清空历史，避免跨文档撤销
- [x] 编辑区顶部新增「↶ 撤销 / ↷ 重做」按钮，按可用状态禁用；快捷键 `Ctrl/Cmd+Z`、`Ctrl/Cmd+Shift+Z`、`Ctrl+Y`
- [x] 输入框内保留浏览器原生文本撤销，不拦截快捷键，避免两套历史冲突
- [x] 撤销 / 重做仍走原有自动保存与多标签页冲突保护
- [x] 单测新增 7 个（共 68 个）：撤销 / 重做、时间合并、非合并边界、清空重做栈、撤销后新输入、上限裁剪、reset
- [x] QA 新增：初始按钮禁用、编辑后可撤销、按钮与快捷键撤销 / 重做、结果自动保存、新增条目可全局撤销
- [x] 真实 Key 验证 `/api/ai/full`：长自述（约 1300 字，6 段经历 / 5 个项目素材）返回合法 JSON，教育 1、工作 5、项目 5、技能 18；无姓名 / 邮箱 / 电话字段
- [x] 真实 Key 用量：prompt 1489 / completion 2245 tokens，8.2 秒完成，未触及 4000 token 上限
- [x] 验证：`tsc`、`npm run lint`、`npm test`（68 passed）、`npm run qa`、`npm run build` 通过

### 阶段 21 — 技能分组与熟练度（追加）✅
- [x] `Resume` 新增展示层字段：`skillMeta`（技能 → 熟练度 / 分组）与有序的 `skillGroups`；扁平 `skills` 仍是匹配与 AI 的唯一数据源
- [x] 熟练度取值 `了解 / 熟练 / 精通`（可为空）；旧 JSON 与 AI 整份生成结果自动视为未分组
- [x] `storage.ts` 归一化：裁剪分组名、去重、只保留仍存在于 `skills` 的元数据、丢弃非法熟练度；导入校验同步覆盖新字段
- [x] 新增 `src/lib/skills.ts`：`groupSkills` / `hasSkillDetails` / `formatSkill` 等展示辅助，无分组时保持旧的扁平排版
- [x] 编辑表单：新建 / 重命名 / 删除分组（删除只解除分组，不删技能）、上下移动分组；每个技能可改熟练度与所属分组
- [x] 添加技能时可直接选择分组与熟练度；按岗位推荐的缺失技能沿用当前选择；删除技能同时清理元数据
- [x] 五套模板按分组渲染；经典与紧凑模板按「分组：技能（熟练度）」分行，其余模板显示分组小标题与技能标签
- [x] 示例简历补充「前端开发 / 工程化」两个分组与各技能熟练度
- [x] 单测新增 19 个（共 87 个）：分组顺序、空分组、元数据追加分组、展示辅助、旧数据补齐、脏数据收敛与导入校验
- [x] QA 新增：旧数据扁平展示、新建分组、按分组 / 熟练度保存、五种模板均渲染分组与熟练度
- [x] 验证：`tsc`、`npm run lint`、`npm test`（87 passed）、`npm run qa`、`npm run build` 通过

### 阶段 22 — AI 求职信（追加）✅
- [x] `AiSection` 新增 `cover`：复用原有 SSE 客户端、`/api/ai/generate`、限流与上游重试，不新增接口
- [x] 求职信使用专属提示词：第一行「尊敬的招聘负责人：」，正文 2–3 段、300–500 字，结尾「此致 / 敬礼」；未知公司统一写「贵公司」
- [x] 明确禁止写入求职者姓名、联系方式、日期与地址；禁止把 JD 要求写成用户已有经历；额外要求用具体成果支撑
- [x] 求职信 token 预算 1200，保持 `reasoning_effort: "low"`；清理函数保留段落空行，只去代码围栏与行首标题符号
- [x] 新增 `CoverLetterWriter`：入口卡片、配置检查、目标岗位 / 年限 / 个人素材 / 参考 JD / 风格、流式生成与停止
- [x] 打开面板时自动带入目标岗位、工作年限、简介与前 12 个技能，并读取 JD 匹配页已保存的参考 JD；均可手动修改
- [x] 生成结果可直接编辑，支持复制全文与下载 `.txt`；不写入简历，关闭面板或卸载时中止请求
- [x] 隐私：只发送目标岗位、工作年限、个人素材与参考 JD；姓名、邮箱、电话和链接不进入请求，服务端仍会再次过滤
- [x] 单测新增 6 个（共 93 个）：求职信系统提示词、JD 规则编号、用户提示词脱敏、token 预算、段落清理与经历清理回归
- [x] QA 新增 7 项：默认带入岗位 / 年限 / 素材 / 已存 JD、生成后可编辑与复制下载、请求仅含素材且不含姓名与联系方式、不写入简历、无配置时显示步骤
- [x] 验证：`tsc`、`npm run lint`、`npm test`（93 passed）、`npm run qa`、`npm run build` 通过

### 阶段 23 — 投递看板与多 JD 管理（追加）✅
- [x] 新增 `src/lib/applications.ts`：投递记录类型、五种状态（想投 / 已投 / 面试中 / Offer / 未通过）、日期与字段收敛、本地存储读写
- [x] 每条投递独立保存公司、岗位、城市、状态、JD、求职信、备注、关联简历、投递日期与下一步日期，彼此不覆盖
- [x] 新增 `useApplications`：同标签页通过自定义事件同步，其他标签页通过 `storage` 事件同步；写入失败不假装成功
- [x] 新增 `ApplicationBoard`：五列状态看板、新建 / 编辑 / 删除、状态下拉流转、展开查看 JD / 求职信 / 备注
- [x] 新建投递默认带入当前 JD；任意一条记录的 JD 可「设为当前 JD」，之后 JD 匹配与 AI 求职信会使用它
- [x] 整库备份升级到 `version: 3`，包含投递记录；旧版 `version: 2` 备份仍可导入，投递记录按空数组处理
- [x] 单测新增 10 个（共 103 个）：字段收敛、状态回退、非法日期、空白记录、重复 id、排序、状态标签与空白工厂
- [x] QA 新增 8 项：默认带入 JD、新建保存、状态流转、设为当前 JD、备份包含记录、刷新保留、390px 无溢出、无控制台错误，截图 `qa-applications.png`
- [x] 验证：`tsc`、`npm run lint`、`npm test`（103 passed）、`npm run qa`、`npm run build` 通过

### 阶段 24 — 单份导出与合并导入（追加）✅
- [x] 新增单份导出格式 `resume-workshop-single` v1：只包含当前简历、标题与模板，文件名 `<标题>-简历.json`，不会带出其他简历或投递记录
- [x] `parseImportFile` 识别单份导出文件，同时继续兼容旧版裸 JSON 与整库备份；缺少 `resume` 或结构非法时给出明确错误
- [x] 简历栏新增「导出当前」与「合并导入」；顶栏「导入」仍为整库替换，两种入口通过导入模式区分
- [x] 合并导入单份文件：作为新简历追加并切换过去，保留原简历；标题冲突自动变为「标题 2」「标题 3」
- [x] 合并导入整库备份：追加全部简历与投递记录，不覆盖当前简历，也不切换当前文档
- [x] 修复 `mergeLibrary` 把当前文档重复写入 `others` 的问题，合并后文档列表不再出现同标题副本
- [x] 手机端简历栏放六个操作按钮时仍在视口内；QA 同步更新按钮清单并检查每个按钮的左右边界
- [x] 单测新增 2 个（共 105 个）：单份导出文件保留标题与模板、缺少简历时报错
- [x] QA 新增 4 项：单份文件字段与文件名、单份合并保留原简历、整库合并追加简历与投递记录、页面无控制台错误
- [x] 验证：`tsc`、`npm run lint`、`npm test`（105 passed）、`npm run qa`、`npm run build` 通过

### 阶段 25 — ATS 文本导出与关键词覆盖（追加）✅
- [x] 新增 `src/lib/ats.ts`：把简历排成线性纯文本或 Markdown，包含联系方式、求职意向、简介、教育、工作、项目、自定义板块与分组技能
- [x] 照片、主题色、分栏与技能熟练度不进入文本；隐藏的自定义板块与空板块不输出，保证 ATS 解析稳定
- [x] 单行描述保留为段落，多行描述自动转为要点；项目与自定义条目保留链接，日期区间统一为 `开始 – 结束`
- [x] 简历预览工具栏新增「ATS 文本」按钮；弹窗内切换纯文本 / Markdown、实时预览，并下载 `<标题>-ATS.txt` / `.md`（UTF-8）
- [x] 弹窗自动读取职位推荐页保存的 JD，也可直接粘贴；实时显示关键词覆盖率、已覆盖与未覆盖关键词
- [x] `jdMatch` 抽出 `extractJdKeywords`，JD 匹配与 ATS 覆盖检查共用同一关键词库，原有分析行为不变
- [x] 覆盖检查只判断导出文本是否出现关键词，不推断真实技能水平；无 JD 或无关键词时给出明确提示
- [x] 单测新增 6 个（共 111 个）：纯文本结构、空简历、Markdown 标题、空板块、覆盖率与零关键词
- [x] QA 新增 8 项：纯文本内容、关键词缺口、桌面弹窗无溢出、txt 下载、Markdown 下载、390px 无溢出与两端无控制台错误，截图 `qa-ats.png`
- [x] 验证：`tsc`、`npm run lint`、`npm test`（111 passed）、`npm run qa`、`npm run build` 通过

### 阶段 26 — AI 生成后的事实核对（追加）✅
- [x] 新增 `src/lib/ai/factCheck.ts`：对生成内容做字面核对，只提示、不自动改动，也不阻止采用
- [x] 数字核对：提取普通数字、百分比与日期；允许日期格式差异（「2021 年」与「2021.06」），忽略「从 0 到 1」等惯用表述
- [x] 技能核对：复用 JD 关键词库与大小写 / `.js` 别名规则，标出素材里没有的技能
- [x] 整份简历额外核对学校、专业、公司与项目名；公司 / 学校允许省略「有限公司」「大学」等后缀
- [x] 参考 JD 明确不作为事实来源：JD 里出现但用户素材没有的技能或数字仍会提示
- [x] 单段 AI 写简历、AI 整份简历与 AI 求职信预览下均显示核对结果；无问题时显示绿色「未发现素材之外的内容」
- [x] 弹窗输入变化时实时重算；结果按「数字 / 技能 / 名称」分类，最多展示 6 项并提示剩余数量
- [x] 单测新增 7 个（共 118 个）：数字、技能、日期格式与「0 到 1」、空素材、整份结构化名称、公司后缀、空简历
- [x] QA 新增 3 项：单段追加无依据内容后的实时提示、整份学校 / 专业 / 数字、求职信数字
- [x] 验证：`tsc`、`npm run lint`、`npm test`（118 passed）、`npm run qa`、`npm run build` 通过

### 阶段 27 — 内置板块显隐 / 排序与一页适配（追加）✅
- [x] `Resume` 新增 `layout: { order, hidden }`：保存七个内置板块（简介 / 工作 / 项目 / 自定义 / 教育 / 技能 / 意向）的顺序与显隐
- [x] `normalizeSectionLayout` 收敛旧数据：缺少 `layout` 时按默认顺序补齐，丢弃未知 / 重复板块；导入校验新增 layout 结构与板块名检查
- [x] 新增 `SectionLayoutEditor`：逐板块上移 / 下移、隐藏 / 显示、恢复默认，并显示内容数量；隐藏只影响展示，不删除数据
- [x] 五套模板统一遵守隐藏；单栏模板与主栏按保存顺序渲染，现代 / 侧栏的意向、技能、教育固定在侧栏
- [x] ATS 纯文本 / Markdown 导出同步跳过隐藏板块，JSON 备份仍保留全部内容
- [x] 新增 `OnePageFitDialog`：预览工具栏「一页适配」实时显示页数，可隐藏建议项（意向 / 自定义板块）、逐项开关、恢复打开时状态，并可一键换用紧凑模板
- [x] `ResumePreview` 通过 `onPageCountChange` 上报页数，隐藏板块后弹窗内的页数即时更新；截图 `qa-layout.png` / `qa-fit.png`
- [x] 单测新增 19 个（共 137 个）：布局收敛、排序、显隐、空内容、自定义板块、边界移动、适配建议、ATS 隐藏导出与旧 JSON 兼容
- [x] QA 新增 17 项：七个板块、默认顺序、五套模板隐藏、恢复显示、板块上移、经典模板顺序、恢复默认、页数提示、建议项隐藏、单项恢复、适配回滚、弹窗关闭、桌面 / 390px 无溢出与无控制台错误
- [x] 验证：`tsc`、`npm run lint`、`npm test`（137 passed）、`npm run qa`（160 项）、`npm run build` 通过

### 阶段 28 — 统一 Dialog 与可访问性（追加）✅
- [x] 新增 `src/components/ui/Dialog.tsx`：Portal 到 `document.body`，统一遮罩、标题 / 描述、滚动区与底部；支持 `sm` / `md` / `lg` / `xl` 尺寸
- [x] 焦点管理：打开时焦点进入面板（保留表单自身的 `autoFocus`），`Tab` / `Shift+Tab` 在弹窗内循环，`focusin` 兜底拉回；关闭后焦点归还触发按钮
- [x] 交互：`Escape` 关闭（忽略输入法组合）、点击遮罩关闭、锁定背景滚动并补偿滚动条宽度、`role="dialog"` / `aria-modal` / `aria-labelledby` / `aria-describedby`
- [x] 五个弹窗迁移到统一组件：AI 单段 / 整份、AI 求职信、投递编辑、ATS 导出、一页适配；删除各自重复的 Escape 与滚动锁代码，保留原有 `data-qa` 选择器
- [x] 全局 `:focus-visible` 键盘焦点环（按钮 / 链接 / tab 等，输入框保留自身 focus ring）；`prefers-reduced-motion` 下动画与过渡接近即时
- [x] 顶栏新增「跳到主要内容」链接，`main#main-content` 可聚焦并带 `scroll-mt`；移动端编辑 / 预览切换与模板组补 `aria-label` / `aria-controls`
- [x] QA 新增 7 项：模态语义与滚动锁、Tab / Shift+Tab 焦点陷阱、Escape 关闭并归还焦点、完成关闭归还焦点、跳转链接为首个焦点且可见、跳转后焦点落到 `main`、reduced motion 生效
- [x] 验证：`tsc`、`npm run lint`、`npm test`（137 passed）、`npm run qa`（167 项）、`npm run build` 通过

### 阶段 29 — 数据版本与持久化历史（追加）✅
- [x] 新增 `src/lib/schema.ts`：`RESUME_SCHEMA_VERSION = 1`，缺失版本按 0 处理；`Resume` 增加 `schemaVersion`，旧数据由 `normalizeResume` 收敛后补齐，空白 / 示例简历同样带版本
- [x] 单份与整库导出写入 `schemaVersion`；导入时兼容旧裸 JSON / 旧备份，遇到更高的 `schemaVersion` 或备份格式版本给出明确错误，避免旧程序静默丢字段
- [x] 新增 `src/lib/historyStorage.ts`：撤销 / 重做栈写入 `sessionStorage`，最多 20 步、1.5MB 字符预算；超限时丢弃最旧步骤，配额不足时逐步缩小并重试
- [x] `createHistory` 增加 `exportState` / `importState`；`useResume` 在启动时恢复历史、保存成功后同步持久化，切换 / 新建 / 导入简历时清除
- [x] 刷新页面后撤销 / 重做仍可用；示例简历不读取旧历史，避免套用到别的文档
- [x] 单测新增 12 个（共 149 个）：schema 版本补齐、未来版本拒绝、历史导出 / 恢复、载荷往返、条数与体积裁剪、损坏载荷与 sessionStorage 配额
- [x] QA 新增 6 项：历史写入会话存储并带版本、刷新后撤销可用、空闲重做栈为空、刷新后撤销恢复、刷新后重做可用、刷新后重做恢复修改（合计 173 项）
- [x] 验证：`tsc`、`npm run lint`、`npm test`（149 passed）、`npm run qa`（173 项）、`npm run build` 通过

### 阶段 30 — QA 进 CI 与组件测试（追加）✅
- [x] 接入组件测试底座：`vitest.config.mts`（React 插件、jsdom、tsconfig paths）、`src/test/setup.ts`（jest-dom 匹配器 + 每个用例后自动 cleanup），新增 Testing Library / user-event / jsdom 依赖
- [x] 新增 `Dialog` 组件测试 4 个：模态语义 / 标题描述 / 初始焦点与滚动锁；Escape 忽略输入法组合、关闭后归还焦点并恢复滚动；遮罩 / 关闭按钮 / 面板内部点击；Tab 与 Shift+Tab 焦点循环
- [x] 新增 `SectionLayoutEditor` 组件测试 3 个：七个板块与默认顺序 / 内容数量 / 边界按钮；隐藏不删除内容并可重新显示；上移改变顺序、恢复默认同时还原顺序与显隐
- [x] `scripts/qa.mjs` 自动探测 Chrome：支持 `CHROME_PATH` / `PUPPETEER_EXECUTABLE_PATH`，并覆盖 Windows、macOS、Linux 常见安装路径；找不到时输出明确错误并非 0 退出
- [x] CI 在构建后安装 `fonts-noto-cjk`、启动 `next start`，最多等待 60 秒，再执行完整 `npm run qa`；步骤退出时结束服务，失败时上传 `.screenshots`，job 超时放宽到 25 分钟
- [x] 单测新增 7 个（共 156 个，16 个文件）；QA 检查数保持 173 项
- [x] 验证：生产模式 `npm run build` + `npm run start` + `npm run qa` 通过；`npm run lint`、`npx tsc --noEmit`、`npm test`（156 passed）、`npm run build` 通过

### 阶段 31 — 安全响应头（追加）✅
- [x] 新增 `src/lib/securityHeaders.ts`：统一生成 `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、严格 Referrer-Policy、Permissions-Policy、COOP / CORP、HSTS 与 CSP
- [x] CSP：`default-src 'self'`；脚本 / 样式保留 inline 以兼容 Next 启动脚本与行内样式；图片允许 `data:` / `blob:`；`connect-src 'self'`；禁止 object / frame；限制 `base-uri` 与 `form-action`
- [x] 开发模式额外放行 `unsafe-eval` 与 HMR WebSocket；生产模式不含 `unsafe-eval`
- [x] `next.config.ts` 对 `/:path*` 应用全部响应头，并设置 `poweredByHeader: false` 隐藏 `X-Powered-By`
- [x] 单测新增 3 个（共 159 个，17 个文件）：生产基础头与 CSP、开发放行 eval / WebSocket、响应头无重复
- [x] QA 新增 2 项：安全响应头完整、未暴露 `X-Powered-By`（合计 175 项）
- [x] 验证：开发与生产模式 `npm run qa` 均通过；`npx tsc --noEmit`、`npm run lint`、`npm test`（159 passed）、`npm run build` 通过
- [x] 边界：CSP 未使用 nonce，避免把静态页面改为按请求动态渲染；严格 nonce CSP 留作后续部署增强

### 阶段 32 — 岗位库与技能同义词（追加）✅
- [x] 新增 `src/lib/skillSynonyms.ts`：JS / ECMAScript、TS、Node、ReactJS、VueJS、NextJS、K8s、Golang、Postgres / PG、SpringBoot、CPP / C/C++、CSharp / C Sharp、CICD / 持续集成、PowerBI、sklearn、REST、ABTest 等别名归一到规范写法
- [x] 比较键保留 `+` 与 `#`，修复原来 `C` / `C++` / `C#` 被压成同一个键的问题；正文扫描对单字母 `C` 加后缀保护，避免命中 `C++` / `C#`
- [x] `JS` 别名不匹配 `Node.js` / `Next.js` 等 `.js` 后缀，JD 关键词不会凭空多出一个 JavaScript
- [x] `textHasSkill` / `resumeHasSkill` / `skillMatches` 全部走同义词；JD 词库按规范键去重，`K8s` / `Golang` / `Postgres` / `SpringBoot` 输出规范标签
- [x] 岗位画像从 18 类扩到 26 类：Go 后端、数据工程、网络安全、售前 / 实施、供应链 / 采购、法务 / 合规、行政 / 助理、嵌入式；并为现有岗位补充 Spring Boot、K8s、大模型、财务分析等别名
- [x] 单测新增 12 个（4 个同义词 + 8 个新画像参数化用例，合计 171 个，18 个文件）；QA 新增 2 项（网络安全画像、JD 同义词归一，合计 177 项）
- [x] 验证：开发与生产模式 `npm run qa`（177 项）均通过；`npx tsc --noEmit`、`npm run lint`、`npm test`（171 passed）、`npm run build` 通过
- [x] 边界：同义词只收录含义明确的写法，不合并 `Java` / `JavaScript`、`C` / `C++` / `C#`；岗位画像按目标岗位与技能命中挑选，不替代真实招聘数据

### 阶段 33 — 离线缓存 / PWA（追加）✅
- [x] 新增 `public/sw.js`：安装时预缓存 `/`、解析首页 HTML 得到的构建静态资源、manifest 与图标；导航请求网络优先，断网回退预缓存外壳
- [x] `/_next/static/*` 缓存优先（文件名带内容哈希）；同源图标 / manifest / 字体 stale-while-revalidate；`/api/*`、非 GET、跨域与 `_rsc` 请求完全不拦截
- [x] 新版本就绪时底部提示「新版本已就绪」，点击后 `SKIP_WAITING` 并刷新；首次安装没有 controller，不打扰用户
- [x] 新增 `ServiceWorkerRegister` 与 `OfflineBanner` / `useOnlineStatus`：生产环境注册，开发环境主动注销旧 SW 并清空 `resume-workshop-*` 缓存
- [x] `securityHeaders()` 增加 `worker-src 'self'`；新增 `serviceWorkerHeaders()`，`/sw.js` 以 `no-store` 与 `Service-Worker-Allowed: /` 下发
- [x] 单测新增 5 个（3 个 OfflineBanner 组件 + 2 个 SW 响应头，合计 176 passed，19 个文件）
- [x] QA 生产模式新增 8 项（SW 头、注册、缓存内容、接口不入缓存、离线刷新、离线编辑、恢复联网、无控制台错误）；开发模式新增 3 项（SW 头、不注册、无错误）
- [x] 验证：`tsc`、`lint`、`npm test`（176 passed）、开发与生产模式 `npm run qa`、`npm run build` 通过
- [x] 边界：首次访问必须联网；缓存不含简历数据、导入文件与 AI 请求；只在生产环境注册，离线行为需用 `npm run build && npm run start` 验证

## 当前进度

- 最近更新：2026-10-29
- 状态：**阶段 0–33 全部完成；P1–P4、AI 功能完善、可点击链接、整份结构化生成、整库备份、全局撤销 / 重做、技能分组、AI 求职信、投递看板、单份导出 / 合并导入、ATS 文本导出、AI 事实核对、板块显隐 / 排序 / 一页适配、统一 Dialog / 可访问性、数据版本 / 持久化历史、QA 进 CI / 组件测试、安全响应头、岗位库 / 技能同义词与离线缓存全部完成**
- 代码状态：
  - M0：git 仓库、`.env.example`、`scripts/mock-deepseek.mjs` 完成
  - M1：`/api/ai/status`、`/api/ai/generate`、SSE 转换完成
  - M2：编辑页顶部「AI 帮我写」入口 + 简介弹窗 + 流式预览 + 采用/撤销完成
  - M3：简介/工作/项目三板块、写入到现有或新建条目、替换/追加、可编辑预览、按条目撤销完成
  - M4：QA AI 检查、README、lint/build/qa、生产模式真实 Key 联调完成
- P2 进度：3.1 证件照、3.2 自定义板块、3.3 项目起止时间、3.4 教育增强、3.5 多份简历全部完成
- P3 进度：4.1 多标签页防覆盖、4.2 输入校验、4.3 保存时间与备份提醒、4.4 导入校验、4.5 错误边界、4.6 页码开关/打印对比度/可访问性、4.7 推荐门槛与 JD 缺口一键补、4.8 岗位库与城市覆盖全部完成
- AI 增强：参考 JD 定制、优化模式空关键词完成；原「串行生成三段文字」已由阶段 18 的结构化整份生成取代
- P4 进度：Vitest 单元 / 组件测试、GitHub Actions CI（含生产模式浏览器 QA）、SEO/OG、manifest 与图标、静态资源清理全部完成；离线缓存已在阶段 33 补齐
- P2 收尾：网站 / GitHub / 项目 / 自定义板块链接在五套模板与 PDF 中可点击，危险协议降级为纯文本
- 阶段 18：AI 整份生成改为一段自述 → 结构化 JSON（教育/工作/项目/技能），采用时新建简历、旧简历保留
- 阶段 19：JSON 导出升级为整库备份（当前文档 + 其他快照 + activeId），导入兼容旧版单份文件；整库导入整体替换并恢复当前文档
- 阶段 20：新增 `src/lib/history.ts` 与 `useResume` 撤销 / 重做；编辑区顶部按钮与 `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` 快捷键，切换简历时清空历史
- 阶段 20：`/api/ai/full` 已用真实 DeepSeek Key 验证长自述生成合法 JSON（completion 2245 tokens，未触及上限）
- 阶段 21：技能支持分组与熟练度；`skillMeta` / `skillGroups` 仅用于展示，扁平 `skills` 继续驱动匹配与 AI，旧 JSON 自动兼容
- 阶段 22：推荐页新增 AI 求职信；复用 `/api/ai/generate` 的 `cover` 板块，生成后可编辑、复制或下载 `.txt`，不写入简历
- 阶段 23：推荐页新增投递看板；每条投递独立保存 JD 与求职信，整库备份升级到 `version: 3`
- 阶段 24：简历栏新增「导出当前」与「合并导入」；单份文件只含当前简历，合并整库时追加简历与投递记录而不覆盖当前文档
- 阶段 25：预览工具栏新增「ATS 文本」；导出线性纯文本 / Markdown，并按当前 JD 显示关键词覆盖与缺口
- 阶段 26：AI 单段 / 整份 / 求职信预览下新增事实核对；提示素材里没有的数字、技能与学校 / 公司 / 项目名，JD 不作为事实来源
- 阶段 27：编辑区新增「板块显示与排序」；`layout` 保存七个内置板块的顺序与隐藏项，五套模板与 ATS 导出同步遵守
- 阶段 27：预览工具栏新增「一页适配」，可隐藏建议项并实时观察页数，支持恢复打开时状态与一键换用紧凑模板
- 阶段 28：新增统一 `Dialog`，五个弹窗共享 Portal、焦点陷阱、焦点归还、Escape / 遮罩关闭与背景滚动锁
- 阶段 28：补全模态 ARIA、全局键盘焦点环、跳转主内容链接、移动端切换分组语义与 reduced motion 降级
- 阶段 29：`Resume` 与单份 / 整库备份增加 `schemaVersion`；旧数据自动补齐，更高版本的备份明确拒绝导入
- 阶段 29：撤销 / 重做栈写入 sessionStorage（20 步 / 1.5MB 预算），刷新后仍可撤销与重做，切换简历时清除
- 阶段 30：组件测试底座接入 jsdom + Testing Library，覆盖 Dialog 焦点 / 关闭与 SectionLayoutEditor 布局行为
- 阶段 30：QA 自动探测本机 Chrome；CI 构建后启动 `next start` 跑完整 QA，失败上传截图
- 阶段 31：全站增加 CSP、HSTS、nosniff、DENY frame、严格 Referrer-Policy、Permissions-Policy、COOP / CORP，并关闭 `X-Powered-By`
- 阶段 31：CSP 开发模式放行 React 调试 eval 与 HMR WebSocket，生产不含 `unsafe-eval`；图片允许 data / blob
- 阶段 32：新增技能同义词层；`JS` / `TS` / `K8s` / `Golang` / `Postgres` / `SpringBoot` 等归一到规范标签，并保留 `C` / `C++` / `C#` 与 `Java` / `JavaScript` 边界
- 阶段 32：岗位画像扩到 26 类，新增 Go 后端、数据工程、网络安全、售前 / 实施、供应链 / 采购、法务 / 合规、行政 / 助理与嵌入式
- 阶段 33：新增 `public/sw.js` 与生产环境注册组件；应用外壳、构建静态资源、manifest 与图标离线可用，`/api/*` 永远不进缓存
- 阶段 33：离线时顶部提示「编辑、预览与导出仍可使用」，AI 与招聘站链接需联网；新版本就绪时底部提示刷新
- 阶段 33：开发模式主动注销旧 SW 并清理缓存；`/sw.js` 以 `no-store` 下发，CSP 增加 `worker-src 'self'`
- 工程命令：`npm test` 运行单元 / 组件测试（176 个）；CI 覆盖 lint + 类型检查 + 单测 / 组件测试 + 构建 + 生产模式浏览器 QA
- 自检：`npm run qa` 生产模式 185 项 / 开发模式 180 项，含离线缓存、安全响应头、岗位画像与 JD 同义词归一检查
- 本地地址：http://localhost:3000 （推荐页 http://localhost:3000/#jobs）
- 一键自检：先 `npm run dev`，再 `npm run qa`（截图输出到 `.screenshots/`）
- 单一方案文档：**`PLAN.md`**

#### 本次会话日志（2026-10-29）

- 阶段 33：读完 Next 16 的 `progressive-web-apps` 与 `offline-support` 文档，确认 `public/sw.js` + 专用响应头的官方做法，不引入 Serwist 等额外依赖
- 阶段 33：`sw.js` 安装时缓存 `/` 并从 HTML 解析 `/_next/static/*`，保证「访问一次后断网也能打开」；同时解析 CSS 里的 `url()`（当前无字体引用，为后续 next/font 预留）
- 阶段 33：导航网络优先、静态资源缓存优先、图标 stale-while-revalidate；`/api/*`、非 GET、跨域与 `_rsc` 一律不拦截
- 阶段 33：更新采用 `SKIP_WAITING` + 提示刷新，不做静默强制刷新，避免打断编辑
- 阶段 33：开发环境注销旧 SW 并清空 `resume-workshop-*` 缓存；页面用 `data-service-worker` 标记注册状态，供 QA 区分开发 / 生产
- 阶段 33：`securityHeaders` 增加 `worker-src 'self'` 与 `serviceWorkerHeaders()`；实测 `/sw.js` 返回 `Cache-Control: no-cache, no-store, must-revalidate`、`Service-Worker-Allowed: /`
- 阶段 33：新增 5 个单测（合计 176 passed，19 个文件）与 8 / 3 项 QA 检查；生产模式实际断网回放通过，编辑写入 localStorage、恢复联网后提示消失
- 阶段 33 验证：`tsc`、`lint`、`npm test`（176 passed）、生产模式 `npm run qa`、开发模式 `npm run qa`、`npm run build` 全部通过

## 本次会话日志（2026-10-28）

- 阶段 18：新增 `src/lib/ai/fullResume.ts`，整份提示词要求 JSON、白名单解析、缺失字段统计
- 阶段 18：新增 `/api/ai/full`，复用 SSE、限流与上游重试；公共响应工具抽到 `src/lib/ai/http.ts`
- 阶段 18：AI 弹窗「整份简历」改为填写一段自述后一次生成，预览按简介 / 教育 / 工作 / 项目 / 技能展示
- 阶段 18：采用时通过 `useResumeDocuments.createFromResume` 新建一份简历并切换，当前简历保留为快照
- 阶段 18：不生成姓名、邮箱、电话与链接；未提及的字段留空并在预览里列出待补充项
- 阶段 18：mock 上游与 QA 场景更新；新增 6 个单测（合计 55 passed）
- 阶段 18 验证：`tsc`、`lint`、`npm test`（55 passed）、`npm run qa`、`npm run build` 全部通过
- 阶段 19：`storage.ts` 新增 `downloadResumeArchive` / `parseImportFile` 与整库备份类型；旧 `parseResumeJSON` 保持兼容
- 阶段 19：`useResumeDocuments` 新增 `collectAll` / `importLibrary`；导入时重新分配文档 id、标题去重并恢复当前文档模板
- 阶段 19：整库导入前提示会替换全部简历；QA 新增整库导出 / 导入回放，旧照片与自定义板块导出断言改用 `documents[0].resume`
- 阶段 19：新增 6 个单测（合计 61 passed）
- 阶段 19 验证：`tsc`、`lint`、`npm test`（61 passed）、`npm run qa`、`npm run build` 全部通过
- 阶段 20：新增 `src/lib/history.ts`（上限 60、700ms 合并、撤销后新输入另起一步）与 7 个单测
- 阶段 20：`useResume` 在所有修改路径记录快照，撤销 / 重做恢复 `isSample`；文档级操作调用 `history.reset()`
- 阶段 20：编辑区顶部加入按钮，快捷键在非输入控件上生效，输入框保留原生文本撤销
- 阶段 20：QA 增加撤销 / 重做按钮、快捷键、自动保存与新增条目撤销检查，截图 `qa-history.png`
- 阶段 20：真实 Key 调用 `/api/ai/full`，长自述返回合法 JSON；prompt 1489 / completion 2245 tokens，未触及上限
- 阶段 20 验证：`tsc`、`lint`、`npm test`（68 passed）、`npm run qa`、`npm run build` 全部通过
- 阶段 21：新增 `SkillLevel` / `SkillMeta` 与 `skillMeta` / `skillGroups` 字段；`storage.ts` 归一化并校验新字段
- 阶段 21：新增 `src/lib/skills.ts`，五套模板按分组展示，无分组时保持旧排版；编辑表单支持分组增删改排序与逐技能熟练度
- 阶段 21：新增 19 个单测（合计 87 passed）；QA 增加旧数据兼容、表单保存与五模板分组展示检查，截图 `qa-skills.png`
- 阶段 21 验证：`tsc`、`lint`、`npm test`（87 passed）、`npm run qa`、`npm run build` 全部通过
- 阶段 22：`AiSection` 增加 `cover`，提示词与清理函数按求职信格式单独处理；token 预算 1200
- 阶段 22：新增 `CoverLetterWriter` 并挂到推荐页 JD 匹配下方，自带配置检查、流式预览、编辑、复制与下载
- 阶段 22：姓名与联系方式不进入请求；QA 记录实际请求载荷并断言只含岗位、年限、素材与 JD
- 阶段 22：新增 6 个单测（合计 93 passed）；QA 新增 7 项求职信检查，截图 `qa-cover-letter.png`
- 阶段 22 验证：`tsc`、`lint`、`npm test`（93 passed）、`npm run qa`、`npm run build` 全部通过
- 阶段 23：新增 `applications.ts`、`useApplications` 与 `ApplicationBoard`，推荐页加入五列投递看板
- 阶段 23：每条投递独立保存 JD / 求职信 / 备注 / 日期；「设为当前 JD」可把任意记录接回 JD 匹配与 AI 求职信
- 阶段 23：整库备份升级到 `version: 3` 并包含投递记录，旧版 `version: 2` 导入仍兼容
- 阶段 23：新增 10 个单测（合计 103 passed）；QA 新增 8 项投递看板检查，截图 `qa-applications.png`
- 阶段 23 验证：`tsc`、`lint`、`npm test`（103 passed）、`npm run qa`、`npm run build` 全部通过
- 阶段 24：`storage.ts` 新增 `downloadSingleResume` 与 `resume-workshop-single` v1 解析，单份文件不包含文档列表与投递记录
- 阶段 24：`useResumeDocuments.createFromResume` 支持传入模板；新增 `mergeLibrary` 追加简历并重映射 id、标题去重
- 阶段 24：顶栏「导入」保持整库替换，简历栏「合并导入」走追加模式；整库合并同时追加投递记录
- 阶段 24：修复 `mergeLibrary` 重复写入当前文档的问题；QA 文档栏按钮清单更新并新增按钮边界检查
- 阶段 24：新增 2 个单测（合计 105 passed）；QA 新增 4 项单份导出 / 合并导入检查
- 阶段 24 验证：`tsc`、`lint`、`npm test`（105 passed）、`npm run qa`、`npm run build` 全部通过
- 阶段 25：`ats.ts` 生成线性纯文本 / Markdown，隐藏板块、照片、分栏与技能等级不导出；单行描述保留段落，多行转要点
- 阶段 25：新增 `AtsExportDialog`，支持格式切换、实时预览、txt / md 下载，并自动读取已保存 JD 做关键词覆盖检查
- 阶段 25：`jdMatch` 抽出 `extractJdKeywords`，JD 匹配与 ATS 覆盖共用关键词库；`safeFileName` 改为导出供 ATS 下载复用
- 阶段 25：新增 6 个单测（合计 111 passed）；QA 新增 8 项 ATS 检查，截图 `qa-ats.png`
- 阶段 25 验证：`tsc`、`lint`、`npm test`（111 passed）、`npm run qa`、`npm run build` 全部通过
- 阶段 26：新增 `factCheck.ts` 与 `FactCheckPanel`；数字 / 技能 / 名称做字面比对，日期允许格式差异
- 阶段 26：单段 AI 写简历、整份生成与求职信预览均接入；输入变化实时重算，参考 JD 不计入事实来源
- 阶段 26：新增 7 个单测（合计 118 passed）；QA 新增 3 项事实核对检查
- 阶段 26 验证：`tsc`、`lint`、`npm test`（118 passed）、`npm run qa`、`npm run build` 全部通过
- 阶段 27：`types.ts` 新增 `ResumeLayout` / `ResumeSectionKey`，`layout.ts` 负责收敛、排序、显隐与适配建议
- 阶段 27：`OrderedSections` 保留原有模板 JSX，仅按布局重排 / 过滤，不额外包 DOM，避免破坏侧栏间距与打印分页
- 阶段 27：编辑区新增 `SectionLayoutEditor`；预览工具栏新增 `OnePageFitDialog`，页数由 `ResumePreview` 回调实时上报
- 阶段 27：ATS 导出跳过隐藏板块；旧 JSON 缺少 layout 时自动补默认布局，导入校验拒绝未知板块
- 阶段 27：新增 19 个单测（合计 137 passed）；QA 新增 17 项布局 / 适配检查，截图 `qa-layout.png` / `qa-fit.png`
- 阶段 27 验证：`tsc`、`lint`、`npm test`（137 passed）、`npm run qa`（160 项）、`npm run build` 全部通过
- 阶段 28：新增 `ui/Dialog.tsx`，Portal + 焦点陷阱 + 焦点归还 + 背景滚动锁；五个弹窗统一迁移，保留原 `data-qa`
- 阶段 28：`globals.css` 增加 `:focus-visible` 焦点环与 `prefers-reduced-motion`；AppShell 增加跳转主内容链接、main 可聚焦、移动端分组与模板组语义
- 阶段 28：QA 新增 7 项可访问性检查（模态语义、焦点陷阱、Escape / 完成归还焦点、跳转链接、reduced motion），合计 167 项
- 阶段 28 验证：`tsc`、`lint`、`npm test`（137 passed）、`npm run qa`（167 项）、`npm run build` 全部通过
- 阶段 29：新增 `schema.ts`，`Resume` 带 `schemaVersion`；旧裸 JSON 补齐版本，单份 / 整库导出写入版本，未来版本备份拒绝导入
- 阶段 29：新增 `historyStorage.ts`；`History` 支持导出 / 恢复，`useResume` 在保存成功后写入 sessionStorage，刷新可继续撤销 / 重做
- 阶段 29：历史按 20 步与 1.5MB 预算裁剪；配额不足时降级，切换 / 新建 / 导入简历清除历史
- 阶段 29：新增 12 个单测（合计 149 passed）；QA 新增 6 项刷新后撤销 / 重做检查，合计 173 项
- 阶段 29 验证：`tsc`、`lint`、`npm test`（149 passed）、`npm run qa`（173 项）、`npm run build` 全部通过
- 阶段 30：`vitest.config.mts` 改用 jsdom + React 插件 + 原生 tsconfig paths，`src/test/setup.ts` 接入 jest-dom 与 cleanup
- 阶段 30：新增 Dialog 4 个、SectionLayoutEditor 3 个组件测试（合计 156 passed，16 个文件）
- 阶段 30：`qa.mjs` 自动探测 Windows / macOS / Linux Chrome，支持 `CHROME_PATH` / `PUPPETEER_EXECUTABLE_PATH`
- 阶段 30：CI 在构建后安装 `fonts-noto-cjk`、启动 `next start` 并执行 `npm run qa`，失败时上传 `.screenshots`，job 超时 25 分钟
- 阶段 30 验证：生产模式 `npm run build` + `npm run start` + `npm run qa`（173 项）通过；`lint`、`tsc`、`npm test`（156 passed）、`build` 通过
- 阶段 31：新增 `securityHeaders.ts` 与 `next.config.ts` 的 `headers()`，关闭 `X-Powered-By`；CSP 按开发 / 生产区分 eval 与 WebSocket
- 阶段 31：新增 3 个单测（合计 159 passed，17 个文件）与 2 项 QA 检查（合计 175 项）
- 阶段 31 验证：开发与生产模式 `npm run qa`（175 项）均通过；`lint`、`tsc`、`npm test`（159 passed）、`npm run build` 通过
- 阶段 32：新增 `skillSynonyms.ts`，统一同义词映射、规范键与别名组；`matching.ts` 的标签匹配与正文扫描全部改为别名感知
- 阶段 32：比较键保留 `+` / `#`，修复 `C` / `C++` / `C#` 混淆；`JS` 不命中 `.js` 后缀，单字母 `C` 不命中 `C++` / `C#`
- 阶段 32：`jdMatch.ts` 词库按规范键去重；岗位画像新增 8 类并补充现有别名，总数 26 类
- 阶段 32：新增 12 个单测（合计 171 passed，18 个文件）与 2 项 QA（合计 177 项）
- 阶段 32 验证：开发与生产模式 `npm run qa`（177 项）均通过；`lint`、`tsc`、`npm test`（171 passed）、`npm run build` 通过

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
- P2 3.4：`Education` 增加 `gpa / ranking / courses / honors`，旧数据自动补空字符串
- P2 3.4：教育表单增加 GPA、排名、主修课程、荣誉；示例数据补全
- P2 3.4：五套模板按各自字号渲染教育详情，空字段不输出
- P2 3.4 QA：渲染、GPA 编辑落盘、五套模板、JSON 备份、旧 JSON 兼容与空字段隐藏全部通过
- P2 3.4 验证：`tsc`、`npm run lint`、`npm run qa` 通过
- P2 3.5：新增 `src/lib/documents.ts`、`useResumeDocuments` 与 `ResumeDocumentsBar`
- P2 3.5：非当前文档快照写入 `resume-workshop:library:v1`，当前文档继续用 v1，旧数据无需迁移
- P2 3.5：支持新建空白、复制、重命名、切换、删除；切换前同步保存，至少保留一份
- P2 3.5：每份简历独立保存内容与模板；复制后可到推荐页按 JD 调整
- P2 3.5 QA：重命名、复制、切换恢复、刷新保留、删除回退、空白新建/切回、390px 无溢出全部通过
- P2 3.5 验证：`tsc`、`npm run lint`、`npm run qa` 通过
- P3 4.1：`useResume` 保存前比较原始 JSON 与上次写入值，冲突时暂停保存；`storage` 事件提示另一标签页改动
- P3 4.1 QA：双标签页编辑出现冲突条、冲突期间不覆盖、保留本页版本后恢复保存
- P3 4.2：新增 `lib/validate.ts`，表单失焦校验联系方式、链接、薪资与起止时间；错误提示不阻断保存
- P3 4.3：记录最后保存 / 首次使用 / 导出 / 暂停时间；新增 `lib/backupReminder.ts`，7 天未导出提醒、暂停 3 天
- P3 4.4：JSON 导入增加结构、字段类型与 5MB 限制；`normalizeResume` 过滤非对象条目
- P3 4.5：新增 `error.tsx` / `global-error.tsx` / `not-found.tsx`，采用 Next 16 `retry` 回调
- P3 4.6：页码开关切换到命名页；打印浅灰文字压深；主题色圆点 24px；移动端切换加 `aria-pressed`
- P3 4.7：推荐页接受简介 / 经历 / 项目 / 教育内容；关键词回退到简介与最近角色；岗位画像和 JD 缺口技能可点击补进简历
- P3 4.8：新增销售/商务、市场营销、财务/会计、人力资源、客服/客户成功、教师/培训画像；BOSS 城市编码扩到 40 个
- P3 QA：新增冲突、校验、备份提醒、导入拒绝、404、页码开关、对比度、`aria-pressed`、推荐门槛、JD 补技能、岗位与城市编码检查
- P3 验证：`tsc`、`npm run lint`、`npm run qa`、`npm run build` 通过
- AI 增强：`jdStorage.ts` 统一 JD 存储；AI 弹窗自动读取 JD 匹配页内容，支持 4000 字参考 JD
- AI 增强：接口与提示词支持 `jd`，并明确禁止把 JD 要求写成用户已有事实；联系方式在服务端过滤
- AI 增强：优化模式允许空关键词，只传当前板块文本即可润色
- AI 增强：「整份简历」串行生成三块内容、独立预览可改、一次采用（覆盖简介 + 各新增一条空经历/项目）并支持整体撤销
- AI 增强 QA：JD 自动读取、polish 空关键词、请求携带 JD、整份三段生成 / 采用 / 撤销全部通过
- AI 增强验证：`tsc`、`npm run lint`、`npm run qa` 通过；接口实测 polish + 空关键词已通过参数校验
- P4：安装 Vitest 5，`@types/node` 升到 24；新增 4 个测试文件、45 个用例
- P4：单测覆盖 normalize / import 校验、技能匹配与评分、JD 识别、输入校验、SSE 分片与中止
- P4：新增 GitHub Actions，依次执行 lint、`tsc --noEmit`、`npm test`、`npm run build`
- P4：metadata 增加 OG / Twitter / keywords / theme-color；`metadataBase` 支持 `NEXT_PUBLIC_SITE_URL`、Vercel 域名与 localhost 回退
- P4：新增 1200×630 `opengraph-image.tsx`（英文文案避免中文字形缺失）
- P4：新增 `manifest.ts`、192/512 PNG 图标、`icon.svg`、`apple-icon.png`，替换默认 favicon
- P4：删除 `public/` 下未使用的 5 个默认 SVG；QA 增加元数据、manifest 与图标检查
- P4 验证：`tsc`、`lint`、`npm test`（45 passed）、`npm run qa`、`npm run build` 全部通过，构建无 metadataBase 警告
- P2 收尾：新增 `src/lib/links.ts`，`toSafeHref` 只放行 http/https 并自动补协议，`displayUrl` 生成短链接
- P2 收尾：联系人、项目与自定义板块链接改为 `<a>`；`javascript:` 等危险协议只显示文本
- P2 收尾：单测增至 49 个；QA 验证安全链接可点击、危险链接不生成锚点
- P2 收尾验证：`tsc`、`lint`、`npm test`（49 passed）、`npm run qa`、`npm run build` 通过

### 下次继续

1. 先读 `PLAN.md` 与 `PROGRESS.md`「当前进度」
2. 阶段 0–33 全部完成；P1–P4、AI 增强、可点击链接、整份结构化生成、整库备份、全局撤销 / 重做、技能分组、AI 求职信、投递看板、单份导出 / 合并导入、ATS 文本导出、AI 事实核对、板块显隐 / 排序 / 一页适配、统一 Dialog / 可访问性、数据版本 / 持久化历史、QA 进 CI / 组件测试、安全响应头、岗位库 / 技能同义词与离线缓存均已完成
3. 后续可选：双语 / 英文输出、更多模板与字体搭配、职位聚合 API；开始前先确认需求与范围
4. 离线相关改动必须在生产构建下验证：`npm run build && npm run start` 后再跑 `npm run qa`
5. 每完成一项跑 `npm run lint`、`npm test`、`npm run build`、`npm run qa` 并更新本文件

## 可选后续

- [x] AI 写简历（DeepSeek）— M0–M4 完成；详见 `PLAN.md`
- [ ] AI 润色 / JD 匹配改写 / 多语言翻译（AI 首版跑通后再考虑）
- [ ] 接入职位聚合 API（JSearch / Adzuna），用 Next.js Route Handler 隐藏 key
- [ ] 更多字体搭配 / 模板变体（配色已支持）
- [ ] 拖拽排序替换上下按钮（注：阶段 8 已实现拖拽手柄，此处仅剩纯鼠标拖拽体验优化）
- [x] P1 数据安全与打印交付（侧栏跨页、保存失败、覆盖保护、PDF 文件名等；详见 `PLAN.md`）
- [x] P4 工程化与分发（Vitest、CI、SEO/OG、manifest、图标清理）
- [x] 离线缓存 / PWA（应用外壳与静态资源缓存、更新提示、离线提示、生产模式离线 QA）
- [x] 简历链接可点击（网站 / GitHub / 项目 / 自定义板块；危险协议过滤）
- [x] AI 整份简历结构化生成（一段自述 → 教育 / 工作 / 项目 / 技能；采用时新建简历）
- [x] 全局撤销 / 重做（按钮 + 快捷键，连续输入合并，切换简历时清空）
- [x] 真实 DeepSeek Key 验证 `/api/ai/full`（JSON 输出与长文本 token 上限）
- [x] 技能分组与熟练度（分组增删改排序、逐技能熟练度、五套模板展示、旧 JSON 兼容）
- [x] AI 求职信（素材 / 岗位 / JD → 中文求职信，可编辑、复制与下载，不写入简历）
- [x] 投递看板与多 JD（五种状态、独立 JD / 求职信 / 备注、设为当前 JD、整库备份）
- [x] 单份简历导出与合并导入（单份分享文件不含其他简历 / 投递记录；整库合并追加而非覆盖）
- [x] ATS 文本导出与关键词覆盖（纯文本 / Markdown 下载；读取当前 JD 显示覆盖率与缺口）
- [x] 内置板块显隐 / 排序与一页适配（布局编辑、五套模板与 ATS 同步、页数实时提示）
- [x] 统一 Dialog 与可访问性（焦点陷阱 / 焦点归还、滚动锁、模态 ARIA、跳转主内容、键盘焦点环、reduced motion）
- [x] QA 进 CI 与组件测试（生产模式启动后跑完整 QA，失败上传截图；jsdom + Testing Library 覆盖 Dialog 与板块布局）
- [x] 安全响应头（CSP、HSTS、COOP / CORP、Permissions-Policy、Referrer-Policy、nosniff、DENY frame；关闭 X-Powered-By）
- [x] 岗位库与技能同义词（26 类画像；JS/TS、K8s、Golang、Postgres、SpringBoot 等别名归一；保留 C 系与 Java / JavaScript 边界）

## 如何继续

1. 读「当前进度」和 `PLAN.md` 的「P0：AI 写简历」
2. 确认 `.env.local` 里的 `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL`
3. `npm run dev`
4. AI（P0）、AI 增强、P1、P2（3.1–3.5、阶段 17 可点击链接、阶段 20 全局撤销、阶段 21 技能分组）、P3（4.1–4.8）、P4、阶段 18 整份生成、阶段 19 整库备份、阶段 22 AI 求职信、阶段 23 投递看板、阶段 24 单份导出 / 合并导入、阶段 25 ATS 文本导出、阶段 26 AI 事实核对、阶段 27 板块显隐 / 排序 / 一页适配、阶段 28 统一 Dialog / 可访问性、阶段 29 数据版本 / 持久化历史、阶段 30 QA 进 CI / 组件测试、阶段 31 安全响应头、阶段 32 岗位库 / 技能同义词与阶段 33 离线缓存均已完成
5. 每完成一步更新本文件，尤其是「当前进度」「关机交接」与对应阶段勾选项

## 文件地图

```
src/
  app/                  layout.tsx / page.tsx / error.tsx / global-error.tsx / not-found.tsx / globals.css（含打印样式）
    api/ai/             status / generate / full Route Handlers
    manifest.ts         Web App Manifest
    opengraph-image.tsx 1200×630 分享卡片
    icon.svg / apple-icon.png / favicon.ico
  components/
    AppShell.tsx        顶栏、标签页、导入导出、打印、客户端挂载门控
    OfflineBanner.tsx   离线提示（编辑可用，AI / 招聘链接需联网）
    ServiceWorkerRegister.tsx 生产环境注册 SW、更新提示、开发环境清理旧缓存
    resume/
      ResumeForm.tsx    编辑表单与重复条目
      ResumeDocumentsBar.tsx 多份简历切换、导出当前与合并导入
      AtsExportDialog.tsx ATS 纯文本 / Markdown 预览、下载与 JD 覆盖检查
      SectionLayoutEditor.tsx 内置板块显隐、排序与恢复默认
      OnePageFitDialog.tsx 一页适配：隐藏建议项、实时页数与回滚
      ResumePreview.tsx A4 容器与自动缩放、分页估算、页数上报
      ThemePicker.tsx   主题色预设与自定义取色
      templates.tsx     现代 / 经典 / 紧凑 / 侧栏 / 时间轴
    jobs/
      JobsPanel.tsx     匹配结果、建议、招聘站入口
      JdMatcher.tsx     粘贴 JD 测匹配度
      CoverLetterWriter.tsx AI 求职信生成、编辑、复制与下载
      ApplicationBoard.tsx 投递看板、状态流转与多 JD 管理
      SkillChip.tsx     技能标签
    ui/                 Field / Button / SectionCard / Dialog（Portal、焦点陷阱、焦点归还与滚动锁）
  hooks/useResume.ts    初始化、自动保存、清空、示例、撤销 / 重做与会话恢复
  hooks/useResumeDocuments.ts 多份简历快照、切换、合并导入与删除
  hooks/useApplications.ts 投递记录状态、跨标签页同步
  hooks/useOnlineStatus.ts 浏览器在线 / 离线状态订阅
  lib/
    types.ts            类型、板块 key 与空白工厂
    schema.ts           简历 schema 版本与未来版本判断
    securityHeaders.ts  全站安全响应头、CSP（含 worker-src）与 /sw.js 缓存头
    historyStorage.ts   撤销 / 重做栈的会话持久化、裁剪与配额兜底
    layout.ts           板块布局收敛、排序、显隐与一页适配建议
    defaultResume.ts    示例数据
    storage.ts          localStorage、整库 / 单份导出、导入解析与校验
    backupReminder.ts   备份提醒状态（7 天 / 暂停 3 天）
    history.ts          通用撤销 / 重做栈（合并窗口、上限、reset）
    applications.ts     投递记录类型、状态、日期收敛与本地存储
    ats.ts              ATS 纯文本 / Markdown 生成、关键词覆盖与下载
    skills.ts           技能分组视图、熟练度格式化与旧排版判断
    validate.ts         邮箱、手机、链接、薪资与起止时间校验
    jobProfiles.ts      岗位画像库
    matching.ts         技能匹配、评分、建议
    skillSynonyms.ts    技能同义词归一与规范标签
    jdMatch.ts          JD 关键词识别、覆盖率、年限/学历核验
    jdStorage.ts        JD 本地保存与 AI 参考 JD 读取
    links.ts            安全链接判断与展示用短链接
    jobBoards.ts        招聘站 URL 与城市编码
    theme.ts            主题色校验、可读性压暗与 CSS 变量
    ai/                 types / config / prompt / fullResume / factCheck / http / deepseek / client
    __tests__/          Vitest：storage / matching / skillSynonyms / jdMatch / validate / links / SSE / 整份解析 / 撤销栈与会话持久化 / 技能分组 / 提示词 / 投递 / ATS / 事实核对 / 板块布局 / 安全响应头（176 个，19 个文件）
  components/resume/__tests__/  SectionLayoutEditor 隐藏 / 排序 / 恢复默认
  components/ui/__tests__/      Dialog 模态语义 / 焦点陷阱 / 关闭与焦点归还
  components/__tests__/         OfflineBanner 在线隐藏 / 离线提示 / 网络恢复
  test/setup.ts         jest-dom 匹配器与每例 cleanup
public/
  sw.js                   Service Worker：外壳 / 静态资源离线缓存、更新与缓存清理
  icon-192.png / icon-512.png  安装清单图标
next.config.ts          全站 headers、/sw.js no-store、关闭 X-Powered-By、Turbopack / Cache Components
scripts/qa.mjs          无头浏览器截图、溢出检查、分页 / PDF 页数、弹窗焦点、安全响应头、可访问性与离线缓存自检
.github/workflows/ci.yml lint + 类型检查 + 单测 / 组件测试 + 构建 + 生产模式浏览器 QA
vitest.config.mts       jsdom + React 插件 + tsconfig paths
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
src/components/resume/AiWriter.tsx ✅ 单板块/整份生成、参考 JD、可编辑流式预览、撤销
src/app/api/ai/models/route.ts     ⬜ 可选，暂不实现
```

### 阶段 18 新增文件

```
src/app/api/ai/full/route.ts       ✅ 自述校验、限流、整份 SSE 转发
src/lib/ai/fullResume.ts           ✅ 整份提示词、JSON 白名单解析、待补充项统计
src/lib/ai/http.ts                 ✅ SSE 编码、限流、错误响应
src/lib/__tests__/fullResume.test.ts ✅ 6 个解析与 payload 用例
scripts/qa.mjs                     ✅ 改为拦截 /api/ai/full，验证新建简历与旧简历保留
```

### 阶段 33 新增文件

```
public/sw.js                              ✅ 安装预缓存、导航 / 静态资源 / 图标策略、版本清理
src/components/ServiceWorkerRegister.tsx  ✅ 生产环境注册、更新提示、开发环境注销与清缓存
src/components/OfflineBanner.tsx          ✅ 离线状态提示
src/hooks/useOnlineStatus.ts              ✅ online / offline 事件订阅
src/components/__tests__/OfflineBanner.test.tsx ✅ 3 个在线 / 离线 / 恢复用例
src/lib/securityHeaders.ts                ✅ 增加 worker-src 与 serviceWorkerHeaders()
scripts/qa.mjs                            ✅ 生产 8 项 / 开发 3 项离线缓存检查
```
