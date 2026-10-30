import {
  createEmptyApplication,
  type JobApplication,
} from "@/lib/applications";
import { createEmptyResume, type Resume } from "@/lib/types";

/**
 * 演示场景：一个 2026 届应届生的真实困境——简历偏薄、方向不明确，
 * 三个岗位的匹配度差距明显，正好用来演示「诊断 → 定向改写 → 投递」。
 *
 * 数据全部本地生成，不包含任何真实个人信息。
 */
export const DEMO_TITLE = "小林 · 2026 届前端";

export const DEMO_JOBS: { company: string; role: string; jd: string }[] = [
  {
    company: "云图科技",
    role: "前端开发工程师（应届）",
    jd: `岗位职责：
1. 参与公司 SaaS 产品的前端开发，负责中后台页面的实现与优化；
2. 与设计、后端协作，持续改进交互细节与页面性能。
任职要求：
1. 2026 届本科及以上学历，计算机相关专业；
2. 熟悉 HTML、CSS、JavaScript，了解 React 或 Vue；
3. 了解 TypeScript、Webpack / Vite 等工程化工具；
4. 有实际项目或实习经历者优先，关注前端性能优化。`,
  },
  {
    company: "明策数据",
    role: "数据产品前端（校招）",
    jd: `工作内容：
1. 负责数据看板与报表页面的前端开发，把分析结论做成可交互的可视化；
2. 与数据分析师协作，优化图表交互与加载性能。
岗位要求：
1. 本科及以上，计算机、统计相关专业；
2. 熟悉 HTML、CSS、JavaScript，会使用 React；
3. 有 ECharts 等可视化库的使用经验；
4. 会写 SQL 查询，了解 Excel 与 Python（pandas）的数据处理方式者优先。`,
  },
  {
    company: "恒信银行",
    role: "Java 后端开发（校招）",
    jd: `岗位职责：
1. 参与核心业务系统的服务端开发与维护；
2. 参与接口设计、性能优化与线上问题排查。
任职要求：
1. 2026 届本科及以上，计算机相关专业；
2. 熟悉 Java 基础与面向对象设计，了解 Spring Boot、MyBatis；
3. 熟悉 MySQL 常用语法与索引优化，了解 Redis；
4. 了解微服务架构与消息队列者优先。`,
  },
];

export function createDemoResume(): Resume {
  const base = createEmptyResume();
  return {
    ...base,
    basic: {
      ...base.basic,
      name: "小林",
      headline: "2026 届本科 · 前端方向",
      email: "lin.xiao@example.com",
      phone: "138-0000-0000",
      city: "杭州",
      github: "github.com/example",
      summary:
        "计算机科学与技术专业应届生，做过几个课程项目，对前端开发有兴趣，希望找一份前端相关的工作。",
    },
    intent: {
      ...base.intent,
      targetRole: "前端开发工程师",
      targetCity: "杭州",
      salaryMin: "8",
      salaryMax: "12",
      jobType: "校招",
      experience: "应届生",
    },
    educations: [
      {
        id: "edu-1",
        school: "浙江某大学",
        major: "计算机科学与技术",
        degree: "本科",
        start: "2022.09",
        end: "2026.06",
        gpa: "3.4 / 4.0",
        ranking: "",
        courses: "数据结构、操作系统、计算机网络、数据库原理",
        honors: "校级三等奖学金",
      },
    ],
    experiences: [
      {
        id: "exp-1",
        company: "某创业公司",
        role: "前端实习生",
        start: "2025.07",
        end: "2025.09",
        description:
          "参与后台管理系统的页面开发，使用 React 完成表格与表单模块；配合后端联调接口，修复线上样式问题。",
      },
    ],
    projects: [
      {
        id: "proj-1",
        name: "校园二手交易平台",
        role: "前端负责人",
        start: "2025.03",
        end: "2025.06",
        description:
          "课程项目，使用 React + TypeScript 实现商品列表、发布与搜索；用 Vite 搭建开发环境，部署到云服务器。",
        link: "",
      },
      {
        id: "proj-2",
        name: "数据可视化大屏",
        role: "前端开发",
        start: "2024.10",
        end: "2024.12",
        description:
          "用 ECharts 实现销售数据看板，包含折线图、地图与排行榜；处理了移动端适配问题。",
        link: "",
      },
    ],
    skills: ["HTML", "CSS", "JavaScript", "React", "TypeScript", "Git"],
    theme: { accent: "#1d4ed8" },
  };
}

export function createDemoApplications(now = Date.now()): JobApplication[] {
  return DEMO_JOBS.map((job, index) => ({
    ...createEmptyApplication(DEMO_TITLE, now + index),
    company: job.company,
    role: job.role,
    jd: job.jd,
  }));
}
