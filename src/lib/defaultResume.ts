import { DEFAULT_RESUME_FONT } from "./fonts";
import { DEFAULT_RESUME_LANGUAGE } from "./language";
import { RESUME_SCHEMA_VERSION } from "./schema";
import { DEFAULT_ACCENT } from "./theme";
import { DEFAULT_SECTION_ORDER, newId, type Resume } from "./types";

/** 首次访问时展示的示例数据，便于直接看到成品效果。 */
export function createSampleResume(): Resume {
  const experienceOne = newId();
  const experienceTwo = newId();
  const projectOne = newId();
  const projectTwo = newId();
  const educationOne = newId();

  return {
    schemaVersion: RESUME_SCHEMA_VERSION,
    basic: {
      name: "林一",
      headline: "前端工程师",
      email: "linyi@example.com",
      phone: "138-0000-0000",
      city: "上海",
      website: "linyi.dev",
      github: "github.com/linyi",
      summary:
        "4 年前端开发经验，专注 React 技术栈与性能优化。主导过日活 20 万的中后台产品重构，首屏加载时间降低 42%。熟悉 TypeScript、工程化与数据可视化，乐于推动团队规范落地。",
      photo: "",
    },
    intent: {
      targetRole: "前端工程师",
      targetCity: "上海",
      salaryMin: "20",
      salaryMax: "30",
      jobType: "全职",
      experience: "3-5年",
    },
    experiences: [
      {
        id: experienceOne,
        company: "星野科技",
        role: "高级前端工程师",
        start: "2023.03",
        end: "至今",
        description:
          "主导 B 端数据平台前端架构升级，从 Vue 2 迁移至 React 18 + TypeScript，构建时间缩短 55%\n设计并落地组件库与脚手架，覆盖 12 条业务线，重复开发工时下降约 30%\n建设前端监控与性能指标看板，线上白屏率由 1.2% 降至 0.3%",
      },
      {
        id: experienceTwo,
        company: "云图网络",
        role: "前端工程师",
        start: "2021.07",
        end: "2023.02",
        description:
          "负责电商活动页与小程序开发，支撑大促峰值 8 万 QPS 的静态页面投放\n通过图片懒加载、路由分包与 CDN 缓存策略，将移动端首屏时间优化至 1.4s",
      },
    ],
    projects: [
      {
        id: projectOne,
        name: "可视化运营后台",
        role: "技术负责人",
        start: "2023.05",
        end: "2024.06",
        description:
          "基于 React + ECharts 搭建拖拽式报表平台，支持 30+ 图表组件与权限配置，服务内部 200+ 运营人员。",
        link: "",
      },
      {
        id: projectTwo,
        name: "开源组件库 Resuikit",
        role: "作者",
        start: "2022.08",
        end: "至今",
        description:
          "维护 20+ 高复用组件，GitHub 1.2k stars，配套完整文档与单元测试。",
        link: "github.com/linyi/resuikit",
      },
    ],
    educations: [
      {
        id: educationOne,
        school: "华东理工大学",
        major: "计算机科学与技术",
        degree: "本科",
        start: "2017.09",
        end: "2021.06",
        gpa: "3.8/4.0",
        ranking: "前 10%",
        courses: "数据结构、操作系统、计算机网络、数据库原理",
        honors: "校级一等奖学金（2019、2020）",
      },
    ],
    customSections: [],
    skills: [
      "React",
      "TypeScript",
      "JavaScript",
      "Vue",
      "Next.js",
      "Tailwind CSS",
      "Node.js",
      "ECharts",
      "Webpack",
      "Vite",
      "性能优化",
      "小程序",
    ],
    skillGroups: ["前端开发", "工程化"],
    skillMeta: {
      React: { level: "精通", group: "前端开发" },
      TypeScript: { level: "熟练", group: "前端开发" },
      JavaScript: { level: "熟练", group: "前端开发" },
      Vue: { level: "熟练", group: "前端开发" },
      "Next.js": { level: "熟练", group: "前端开发" },
      "Tailwind CSS": { level: "熟练", group: "前端开发" },
      小程序: { level: "了解", group: "前端开发" },
      "Node.js": { level: "熟练", group: "工程化" },
      ECharts: { level: "熟练", group: "工程化" },
      Webpack: { level: "熟练", group: "工程化" },
      Vite: { level: "熟练", group: "工程化" },
      性能优化: { level: "熟练", group: "工程化" },
    },
    theme: { accent: DEFAULT_ACCENT },
    font: DEFAULT_RESUME_FONT,
    layout: { order: [...DEFAULT_SECTION_ORDER], hidden: [] },
    language: DEFAULT_RESUME_LANGUAGE,
    translation: {
      basic: {
        name: "Lin Yi",
        headline: "Frontend Engineer",
        city: "Shanghai",
        summary:
          "Frontend engineer with 4 years of experience specializing in React and performance optimization. Led the rebuild of a B2B product serving 200k daily users, cutting first-contentful-paint by 42%. Comfortable with TypeScript, build tooling, and data visualization; enjoys turning team conventions into reusable tooling.",
      },
      intent: {
        targetRole: "Frontend Engineer",
        targetCity: "Shanghai",
        jobType: "Full-time",
        experience: "3–5 years",
      },
      experiences: {
        [experienceOne]: {
          company: "Xingye Technology",
          role: "Senior Frontend Engineer",
          description:
            "Led the frontend architecture upgrade of a B2B data platform, migrating from Vue 2 to React 18 + TypeScript and reducing build time by 55%\nDesigned and shipped the component library and scaffolding used by 12 business lines, cutting duplicated development effort by about 30%\nBuilt frontend monitoring and performance dashboards, lowering the blank-screen rate from 1.2% to 0.3%",
        },
        [experienceTwo]: {
          company: "Yuntu Network",
          role: "Frontend Engineer",
          description:
            "Built e-commerce campaign pages and mini programs, supporting static page delivery at a peak of 80k QPS\nOptimized mobile first-screen time to 1.4s with lazy loading, route-level code splitting, and CDN caching",
        },
      },
      projects: {
        [projectOne]: {
          name: "Visual Operations Console",
          role: "Tech Lead",
          description:
            "Built a drag-and-drop reporting platform with React and ECharts, supporting 30+ chart types and permission configuration for 200+ internal operators.",
        },
        [projectTwo]: {
          name: "Open-source UI Library Resuikit",
          role: "Author",
          description:
            "Maintains 20+ reusable components with full documentation and unit tests; 1.2k GitHub stars.",
        },
      },
      educations: {
        [educationOne]: {
          school: "East China University of Science and Technology",
          major: "Computer Science and Technology",
          degree: "Bachelor",
          ranking: "Top 10%",
          courses:
            "Data Structures, Operating Systems, Computer Networks, Database Systems",
          honors: "First-class University Scholarship (2019, 2020)",
        },
      },
      customSections: {},
      skills: {
        小程序: "Mini Programs",
        性能优化: "Performance Optimization",
      },
      skillGroups: {
        前端开发: "Frontend",
        工程化: "Tooling",
      },
    },
  };
}
