# 简历工坊 (Resume Workshop)

浏览器里的简历制作 + 求职搜索推荐工具。简历数据只保存在本机 localStorage，无账号、无云端同步。可选的「AI 写简历」通过本项目的 Next.js 服务端路由调用 DeepSeek，API Key 不会进入浏览器。

参考 UP简历 的基础能力，并增加了「根据简历内容推荐国内招聘网站搜索入口」的功能。

## 功能

### 简历制作

- 左表单 / 右 A4 实时预览
- 基本信息、求职意向、工作经历、项目经历（含起止时间）、教育经历（GPA、排名、主修课程、荣誉可选）、技能标签
- 可选证件照：上传后自动居中裁成 400×400 JPEG 并压缩，五套模板均有照片位；只保存在本机
- 自定义板块：证书、获奖、语言、校园经历、作品集或空白板块；条目增删、上下排序，板块可隐藏
- 多份简历：文档栏新建、复制、重命名、切换、删除；每份独立保存内容与模板；复制后可到职位推荐页按 JD 调整
- 经历条目支持增删、拖拽排序（移动端保留上下按钮）；删除后 8 秒内可撤销
- 导入 JSON、载入示例覆盖当前简历前需要确认；存储写入失败时提示导出备份
- 5 套模板：现代（双栏）、经典（衬线单栏）、紧凑（高信息密度）、侧栏（左侧深色信息栏）、时间轴（经历时间线）
- 主题色：8 种预设 + 任意自定义颜色，随简历保存；浅色会自动压暗，保证正文与侧栏文字可读
- 按目标岗位推荐缺失技能，点击即可添加
- 防抖自动保存到 localStorage，显示「保存中 / 已保存」与最后保存时间；超过 7 天未导出时提醒备份，可暂停 3 天
- 多标签页同时编辑时检测冲突并暂停保存，由你选择「重新载入对方版本」或「保留本页版本」，避免静默覆盖
- 失焦校验邮箱、手机号、链接、薪资区间与起止时间，不阻断写作
- A4 页数估算，超过 1 页时提示精简
- 手动分页：工作 / 项目条目可设置「从此条起另起一页」，预览中显示分页标记
- JSON 导入 / 导出，便于备份与迁移；导入校验结构、字段类型与 5MB 大小上限，备份包含照片、自定义板块、主题色与当前模板，旧备份仍可导入
- 手机端也可导入 JSON
- 浏览器打印导出 PDF：只输出简历，A4 全宽；首页贴顶、续页上下留白，页脚自动带「第 N / M 页」页码，可一键关闭页码；默认文件名取「姓名-求职头衔」
- 编辑与错误页面兜底：自定义 `error.tsx` / `global-error.tsx` / `not-found.tsx`，出错时可直接重试或刷新

### AI 写简历（可选，需配置 DeepSeek Key）

- 个人简介 / 工作经历 / 项目经历三个板块，按目标岗位、年限、关键词生成
- 流式预览，生成中可停止；生成结果可以直接修改后再采用
- 写入现有条目（替换或追加）或新建工作 / 项目条目
- 覆盖非空内容需二次确认；采用后 8 秒内可撤销，新建条目的撤销会一并删除该条目
- 个人简介保持单段；工作 / 项目输出 3–5 条要点
- 未配置 Key 时弹窗内显示配置步骤，不影响原有编辑
- 只发送当前板块与面板填写内容；服务端会过滤邮箱、手机号、链接，不发送姓名与整份简历
- 生成内容会发送到 DeepSeek；请勿在关键词里粘贴敏感信息

### 求职推荐

- 本地岗位画像库（前端、Java/Python 后端、全栈、产品、设计、数据、测试、算法、运营、移动端、运维、销售/商务、市场营销、财务/会计、人力资源、客服/客户成功、教师/培训）
- 推荐页门槛放宽：期望岗位、简介、技能或任意一段经历/教育内容都可进入分析
- 技能命中分析：同时扫描技能标签与经历/项目/简介正文，避免 `Java` 误命中 `JavaScript`
- 匹配分 = 核心技能 55% + 加分技能 20% + 简历完整度 25%
- 输出缺失技能与简历优化建议；缺失的核心技能可点击补进简历
- **粘贴目标 JD 测匹配度**：技能关键词覆盖率、年限/学历要求核验、缺口建议，JD 内容仅保存在本机；「简历未体现」的技能可一键加入简历
- 生成 BOSS直聘、拉勾、猎聘、智联招聘、前程无忧的精准搜索链接
- 支持城市参数（BOSS直聘覆盖 40 个城市编码，拉勾/智联带城市名）

> 招聘平台没有公开的职位 API，本工具不抓取职位数据，只生成合法合规的搜索入口；职位以平台实时结果为准。

## 技术栈

- Next.js 16（App Router）+ React 19 + TypeScript
- Tailwind CSS 4
- localStorage 持久化
- DeepSeek Chat Completions（OpenAI 兼容，SSE 流式），仅服务端调用
- puppeteer-core（仅开发时用于截图自检，不参与构建）

## 开发

```bash
npm install
npm run dev       # http://localhost:3000
npm run lint
npm run build
```

打开 `http://localhost:3000/#jobs` 可直接进入职位推荐页。

### AI 配置（可选）

不配置 Key 也能使用全部简历编辑与求职推荐功能，只是 AI 弹窗会显示配置步骤。

1. 复制示例文件：

   ```bash
   cp .env.example .env.local
   # Windows PowerShell: copy .env.example .env.local
   ```

2. 填入 DeepSeek Key：

   ```dotenv
   DEEPSEEK_API_KEY=sk-...
   DEEPSEEK_MODEL=deepseek-flash
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   ```

   - `DEEPSEEK_API_KEY`：必填，只在服务端读取。
   - `DEEPSEEK_MODEL`：默认 `deepseek-flash`；也可换成账号可用的其他模型。
   - `DEEPSEEK_BASE_URL`：默认 `https://api.deepseek.com`，一般不用改。

3. 重启 `npm run dev`（修改 `.env.local` 后需要重启）。

`.env.local` 已被 `.gitignore` 忽略。不要把 Key 写进 `NEXT_PUBLIC_*`、前端代码、localStorage 或导出的 JSON。

### 用 mock 联调（不消耗额度）

```bash
node scripts/mock-deepseek.mjs
# 另开终端：
DEEPSEEK_API_KEY=test DEEPSEEK_MODEL=mock \
DEEPSEEK_BASE_URL=http://127.0.0.1:8787 npm run dev
```

mock 默认监听 8787；被占用时用 `MOCK_PORT=8790` 启动，并同步修改 `DEEPSEEK_BASE_URL`。`MOCK_FAIL=401|429|500|hang` 可模拟上游错误。

### 视觉与 AI 自检

先启动 dev server，再执行：

```bash
npm run qa
```

会在 `.screenshots/` 生成桌面、移动端、五套模板、主题色、分页、打印视图，以及 AI 弹窗、AI 移动端、未配置 Key 的截图，并检查横向溢出、纸面页数与 PDF 实际页数。另含侧栏模板多页回归：打印时侧栏只作用于首页，续页正文不得保留 62mm 侧栏缩进。还覆盖保存失败提示、删除撤销、导入 / 载入示例确认、手机导入、模板随 JSON 备份、打印文件名等数据安全场景，以及证件照压缩、自定义板块排序 / 显隐 / 删除撤销、项目起止时间编辑、教育增强字段编辑、多份简历切换 / 复制 / 重命名 / 刷新保留与五套模板渲染。P3 新增回归：多标签页冲突与阻止覆盖、表单格式校验、7 天备份提醒与暂停、导入结构与 5MB 限制、页码开关、打印对比度、移动端 `aria-pressed`、自定义 404、推荐页放宽门槛、JD 缺口一键补、非技术岗位画像与新增城市编码。AI 部分通过拦截接口返回固定 SSE 来验证弹窗、采用、撤销与未配置状态，不消耗真实额度；任一检查失败时命令以非 0 退出。

默认使用本机 Chrome，可通过环境变量覆盖：

```bash
CHROME_PATH="C:/path/to/chrome.exe" QA_BASE="http://localhost:3000" npm run qa
```

## 隐私与部署

- 简历与 JD 只保存在浏览器 localStorage；没有账号与云同步。
- AI 只把当前板块文本、目标岗位、年限、关键词发给 DeepSeek；服务端会移除邮箱、手机号、网址和 GitHub 链接。日志只记录状态码、耗时和 token 数，不记录 Key、提示词或生成内容。
- 生成接口限制请求体大小（64KB），并按 IP 做简单限流（10 次 / 10 分钟，内存实现）。多实例部署需换成 Redis / KV 等共享存储；公网部署建议再加登录或访问控制。
- AI 路由需要 Node.js 运行时（`next start` 或 Vercel 等），不能再使用纯静态导出；不要从浏览器直连 DeepSeek。

## 目录结构

```
src/
  app/                  layout / page / error / global-error / not-found / 全局样式（含打印样式）
    api/ai/
      status/route.ts   Key / 模型状态（运行时读取）
      generate/route.ts 校验、限流、SSE 转换
  components/
    AppShell.tsx        顶栏、标签页、导入导出、打印、自动保存门控
    resume/
      ResumeForm.tsx    全部编辑表单与重复条目
      ResumeDocumentsBar.tsx 多份简历切换、新建、复制、重命名、删除
      CustomSectionsEditor.tsx 自定义板块、条目与显隐/排序
      deleteTarget.ts   各类删除的统一目标类型与文案
      AiWriter.tsx      AI 弹窗、流式预览、采用/撤销
      ResumePreview.tsx A4 容器与自动缩放、分页估算
      ThemePicker.tsx   主题色预设与自定义取色
      templates.tsx     现代 / 经典 / 紧凑 / 侧栏 / 时间轴模板
    jobs/
      JobsPanel.tsx     匹配结果、优化建议、招聘站入口
      JdMatcher.tsx     粘贴 JD 测匹配度
      SkillChip.tsx     技能标签
    ui/                 Field / Button / SectionCard
  hooks/
    useResume.ts        初始化、自动保存、清空、示例
    useResumeDocuments.ts 多份简历快照、切换与删除
  lib/
    types.ts            简历类型与空白工厂
    defaultResume.ts    示例简历
    photo.ts            证件照裁切、压缩与 Data URL 校验
    documents.ts        多份简历快照的校验与存取
    storage.ts          localStorage、JSON 导入导出与校验
    backupReminder.ts   备份提醒状态（7 天 / 暂停 3 天）
    validate.ts         邮箱、手机、链接、薪资与起止时间校验
    jobProfiles.ts      岗位画像库
    matching.ts         技能匹配、评分、建议
    jdMatch.ts          JD 关键词识别、覆盖率、年限/学历核验
    jobBoards.ts        招聘站 URL 与城市编码
    theme.ts            主题色校验、可读性压暗与 CSS 变量
    ai/
      types.ts          请求 / 事件 / 状态类型
      config.ts         环境变量读取
      prompt.ts         提示词、payload、输出清洗、联系方式过滤
      deepseek.ts       上游请求、重试、SSE 解析
      client.ts         浏览器端 SSE 客户端
scripts/qa.mjs          截图、溢出检查、分页与 PDF 页数、AI/照片/自定义板块/多简历自检
scripts/mock-deepseek.mjs 本地 mock 上游（开发自测）
.env.example            环境变量示例
PROGRESS.md             工作流与进度（中断后从这里继续）
```

## 已知边界

- 不做真实职位抓取、账号体系、云端同步
- 推荐页展示的是搜索入口，不是职位列表
- AI 目前只做个人简介 / 工作经历 / 项目经历三板块写作；整份生成、JD 改写、多语言未接入
- AI 生成内容需要人工核对，尤其是数字、项目结果与时间；模型可能给出不准确的表述
- 超长简历会自然跨页，页码由浏览器按 `@page` 自动生成；预览中的页数、分页线为估算值（手动分页与条目内空隙无法精确预判），实际以打印预览为准
- 打印页码依赖 Chrome / Edge 的 `@page` margin box，Firefox 与 Safari 不会显示「第 N / M 页」，但简历正文、分页与配色仍可正常打印。导出 PDF 建议使用 Chrome / Edge；其他浏览器可在打印对话框中关闭页眉页脚，或关闭本工具的页码开关后自行添加页码
- 证件照只在浏览器内压缩为 400×400 JPEG，不保留原图，也不做抠图或美颜；照片会增加 JSON 备份与 localStorage 的体积
- 多份简历只保存在当前浏览器；JSON 导出只包含当前一份，其他简历不会进入备份；删除简历不可撤销
