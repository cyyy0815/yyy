# 简历工坊 (Resume Workshop)

浏览器里的简历制作 + 求职搜索推荐工具。纯前端，无后端、无登录，数据保存在本机 localStorage。

参考 UP简历 的基础能力，并增加了「根据简历内容推荐国内招聘网站搜索入口」的功能。

## 功能

### 简历制作

- 左表单 / 右 A4 实时预览
- 基本信息、求职意向、工作经历、项目经历、教育经历、技能标签
- 经历条目支持增删、拖拽排序（移动端保留上下按钮）
- 5 套模板：现代（双栏）、经典（衬线单栏）、紧凑（高信息密度）、侧栏（左侧深色信息栏）、时间轴（经历时间线）
- 主题色：8 种预设 + 任意自定义颜色，随简历保存；浅色会自动压暗，保证正文与侧栏文字可读
- 按目标岗位推荐缺失技能，点击即可添加
- 防抖自动保存到 localStorage，并显示「保存中 / 已保存」状态
- A4 页数估算，超过 1 页时提示精简
- 手动分页：工作 / 项目条目可设置「从此条起另起一页」，预览中显示分页标记
- JSON 导入 / 导出，便于备份与迁移
- 浏览器打印导出 PDF：只输出简历，A4 全宽；首页贴顶、续页上下留白，页脚自动带「第 N / M 页」页码

### 求职推荐

- 本地岗位画像库（前端、Java/Python 后端、全栈、产品、设计、数据、测试、算法、运营、移动端、运维）
- 技能命中分析：同时扫描技能标签与经历/项目/简介正文，避免 `Java` 误命中 `JavaScript`
- 匹配分 = 核心技能 55% + 加分技能 20% + 简历完整度 25%
- 输出缺失技能与简历优化建议
- **粘贴目标 JD 测匹配度**：技能关键词覆盖率、年限/学历要求核验、缺口建议，JD 内容仅保存在本机
- 生成 BOSS直聘、拉勾、猎聘、智联招聘、前程无忧的精准搜索链接
- 支持城市参数（BOSS直聘使用城市编码，拉勾/智联带城市名）

> 招聘平台没有公开的职位 API，本工具不抓取职位数据，只生成合法合规的搜索入口；职位以平台实时结果为准。

## 技术栈

- Next.js 16（App Router）+ React 19 + TypeScript
- Tailwind CSS 4
- localStorage 持久化
- puppeteer-core（仅开发时用于截图自检，不参与构建）

## 开发

```bash
npm install
npm run dev       # http://localhost:3000
npm run lint
npm run build
```

打开 `http://localhost:3000/#jobs` 可直接进入职位推荐页。

### 视觉自检

先启动 dev server，再执行：

```bash
npm run qa
```

会在 `.screenshots/` 生成桌面、移动端、五套模板、主题色、分页和打印视图的截图，并检查横向溢出、纸面页数与 PDF 实际页数。
默认使用本机 Chrome，可通过环境变量覆盖：

```bash
CHROME_PATH="C:/path/to/chrome.exe" QA_BASE="http://localhost:3000" npm run qa
```

## 目录结构

```
src/
  app/                  layout / page / 全局样式（含打印样式）
  components/
    AppShell.tsx        顶栏、标签页、导入导出、打印、自动保存门控
    resume/
      ResumeForm.tsx    全部编辑表单与重复条目
      ResumePreview.tsx A4 容器与自动缩放、分页估算
      ThemePicker.tsx   主题色预设与自定义取色
      templates.tsx     现代 / 经典 / 紧凑 / 侧栏 / 时间轴模板
    jobs/
      JobsPanel.tsx     匹配结果、优化建议、招聘站入口
      JdMatcher.tsx     粘贴 JD 测匹配度
      SkillChip.tsx     技能标签
    ui/                 Field / Button / SectionCard
  hooks/useResume.ts    初始化、自动保存、清空、示例
  lib/
    types.ts            简历类型与空白工厂
    defaultResume.ts    示例简历
    storage.ts          localStorage、JSON 导入导出与校验
    jobProfiles.ts      岗位画像库
    matching.ts         技能匹配、评分、建议
    jdMatch.ts          JD 关键词识别、覆盖率、年限/学历核验
    jobBoards.ts        招聘站 URL 与城市编码
    theme.ts            主题色校验、可读性压暗与 CSS 变量
scripts/qa.mjs          截图、溢出检查、分页与 PDF 页数自检
PROGRESS.md             工作流与进度（中断后从这里继续）
```

## 已知边界

- 不做真实职位抓取、账号体系、云端同步
- 推荐页展示的是搜索入口，不是职位列表
- AI 润色 / JD 匹配改写 / 多语言未接入，服务层已在 `lib/` 中预留位置（本地关键词版 JD 匹配已完成）
- 超长简历会自然跨页，页码由浏览器按 `@page` 自动生成；预览中的页数、分页线为估算值（手动分页与条目内空隙无法精确预判），实际以打印预览为准
