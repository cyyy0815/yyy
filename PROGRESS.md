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

## 关机交接（2026-10-28）

- 当前提交：阶段 18 提交（`feat(ai): 支持一段自述生成整份结构化简历`），工作区干净。
- 阶段 0–18 全部完成；最新验证为 `tsc`、`lint`、`npm test`（55 passed）、`npm run qa`、`npm run build` 全部通过。
- 下次先读本文件的「当前进度 / 下次继续」与 `PLAN.md`，再运行：

  ```bash
  npm run dev
  ```

  打开 http://localhost:3000 ；AI 功能依赖 `.env.local` 中的 DeepSeek 配置，改动环境变量后需重启 dev server。
- 尚未开始的可选项：全局撤销、技能分组、双语简历、AI 求职信 / 英文输出、离线缓存。开始前先确认需求。

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

## 当前进度

- 最近更新：2026-10-28
- 状态：**阶段 0–18 全部完成；P1–P4、AI 功能完善、可点击链接与整份结构化生成全部完成**
- 代码状态：
  - M0：git 仓库、`.env.example`、`scripts/mock-deepseek.mjs` 完成
  - M1：`/api/ai/status`、`/api/ai/generate`、SSE 转换完成
  - M2：编辑页顶部「AI 帮我写」入口 + 简介弹窗 + 流式预览 + 采用/撤销完成
  - M3：简介/工作/项目三板块、写入到现有或新建条目、替换/追加、可编辑预览、按条目撤销完成
  - M4：QA AI 检查、README、lint/build/qa、生产模式真实 Key 联调完成
- P2 进度：3.1 证件照、3.2 自定义板块、3.3 项目起止时间、3.4 教育增强、3.5 多份简历全部完成
- P3 进度：4.1 多标签页防覆盖、4.2 输入校验、4.3 保存时间与备份提醒、4.4 导入校验、4.5 错误边界、4.6 页码开关/打印对比度/可访问性、4.7 推荐门槛与 JD 缺口一键补、4.8 岗位库与城市覆盖全部完成
- AI 增强：参考 JD 定制、优化模式空关键词完成；原「串行生成三段文字」已由阶段 18 的结构化整份生成取代
- P4 进度：Vitest 单元测试、GitHub Actions CI、SEO/OG、manifest 与图标、静态资源清理全部完成；离线缓存未实现
- P2 收尾：网站 / GitHub / 项目 / 自定义板块链接在五套模板与 PDF 中可点击，危险协议降级为纯文本
- 阶段 18：AI 整份生成改为一段自述 → 结构化 JSON（教育/工作/项目/技能），采用时新建简历、旧简历保留
- 工程命令：`npm test` 运行单元测试（55 个）；CI 覆盖 lint + 类型检查 + 单测 + 构建
- 本地地址：http://localhost:3000 （推荐页 http://localhost:3000/#jobs）
- 一键自检：先 `npm run dev`，再 `npm run qa`（截图输出到 `.screenshots/`）
- 单一方案文档：**`PLAN.md`**

### 本次会话日志（2026-10-28）

- 阶段 18：新增 `src/lib/ai/fullResume.ts`，整份提示词要求 JSON、白名单解析、缺失字段统计
- 阶段 18：新增 `/api/ai/full`，复用 SSE、限流与上游重试；公共响应工具抽到 `src/lib/ai/http.ts`
- 阶段 18：AI 弹窗「整份简历」改为填写一段自述后一次生成，预览按简介 / 教育 / 工作 / 项目 / 技能展示
- 阶段 18：采用时通过 `useResumeDocuments.createFromResume` 新建一份简历并切换，当前简历保留为快照
- 阶段 18：不生成姓名、邮箱、电话与链接；未提及的字段留空并在预览里列出待补充项
- 阶段 18：mock 上游与 QA 场景更新；新增 6 个单测（合计 55 passed）
- 阶段 18 验证：`tsc`、`lint`、`npm test`（55 passed）、`npm run qa`、`npm run build` 全部通过

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
2. 阶段 0–18 全部完成；P1–P4、AI 增强、可点击链接与整份结构化生成均已完成
3. 可选后续：P2 剩余缺口（全局撤销、技能分组、双语）、AI 求职信 / 英文输出、离线缓存
4. 每完成一项跑 `npm run lint`、`npm test`、`npm run build`、`npm run qa` 并更新本文件

## 可选后续

- [x] AI 写简历（DeepSeek）— M0–M4 完成；详见 `PLAN.md`
- [ ] AI 润色 / JD 匹配改写 / 多语言翻译（AI 首版跑通后再考虑）
- [ ] 接入职位聚合 API（JSearch / Adzuna），用 Next.js Route Handler 隐藏 key
- [ ] 更多字体搭配 / 模板变体（配色已支持）
- [ ] 拖拽排序替换上下按钮（注：阶段 8 已实现拖拽手柄，此处仅剩纯鼠标拖拽体验优化）
- [x] P1 数据安全与打印交付（侧栏跨页、保存失败、覆盖保护、PDF 文件名等；详见 `PLAN.md`）
- [x] P4 工程化与分发（Vitest、CI、SEO/OG、manifest、图标清理；离线缓存未做）
- [x] 简历链接可点击（网站 / GitHub / 项目 / 自定义板块；危险协议过滤）
- [x] AI 整份简历结构化生成（一段自述 → 教育 / 工作 / 项目 / 技能；采用时新建简历）

## 如何继续

1. 读「当前进度」和 `PLAN.md` 的「P0：AI 写简历」
2. 确认 `.env.local` 里的 `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL`
3. `npm run dev`
4. AI（P0）、AI 增强、P1、P2（3.1–3.5 及阶段 17 可点击链接）、P3（4.1–4.8）、P4 与阶段 18 整份生成均已完成
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
    backupReminder.ts   备份提醒状态（7 天 / 暂停 3 天）
    validate.ts         邮箱、手机、链接、薪资与起止时间校验
    jobProfiles.ts      岗位画像库
    matching.ts         技能匹配、评分、建议
    jdMatch.ts          JD 关键词识别、覆盖率、年限/学历核验
    jdStorage.ts        JD 本地保存与 AI 参考 JD 读取
    links.ts            安全链接判断与展示用短链接
    jobBoards.ts        招聘站 URL 与城市编码
    theme.ts            主题色校验、可读性压暗与 CSS 变量
    ai/                 types / config / prompt / fullResume / http / deepseek / client
    __tests__/          Vitest：storage / matching / jdMatch / validate / SSE / 整份解析（55 个）
public/
  icon-192.png / icon-512.png  安装清单图标
scripts/qa.mjs          无头浏览器截图、溢出检查、分页与 PDF 页数自检
.github/workflows/ci.yml lint + 类型检查 + 单测 + 构建
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
