import { describe, expect, it } from "vitest";
import { analyzeResume } from "../matching";
import { createEmptyResume, type Resume } from "../types";

/** 真实写法的简历夹具：锁定岗位识别，避免扩画像 / 调权重时悄悄跑偏。 */

function mk(patch: {
  name: string;
  headline: string;
  role: string;
  summary: string;
  skills: string[];
  experiences: { company: string; role: string; description: string }[];
}): Resume {
  const base = createEmptyResume();
  return {
    ...base,
    basic: {
      ...base.basic,
      name: patch.name,
      headline: patch.headline,
      summary: patch.summary,
    },
    intent: { ...base.intent, targetRole: patch.role },
    skills: patch.skills,
    experiences: patch.experiences.map((item, index) => ({
      id: `e${index}`,
      company: item.company,
      role: item.role,
      start: "2021.03",
      end: "2024.06",
      description: item.description,
    })),
  };
}

const CASES: { expect: string; label: string; resume: Resume }[] = [
  {
    expect: "frontend",
    label: "React 前端",
    resume: mk({
      name: "A",
      headline: "前端工程师",
      role: "高级前端工程师",
      summary: "5 年前端经验，负责中后台系统与组件库建设。",
      skills: ["React", "TypeScript", "Webpack", "Vite", "Node.js"],
      experiences: [
        {
          company: "某厂",
          role: "前端工程师",
          description:
            "使用 React 与 TypeScript 开发中后台管理系统，封装 40+ 业务组件；接入 Vite 构建，首屏时间下降 45%。",
        },
      ],
    }),
  },
  {
    expect: "backend-java",
    label: "Java 后端",
    resume: mk({
      name: "B",
      headline: "Java 工程师",
      role: "Java 后端工程师",
      summary: "6 年 Java 服务端开发，熟悉 Spring 生态与高并发。",
      skills: ["Java", "Spring Boot", "MySQL", "Redis", "Kafka"],
      experiences: [
        {
          company: "某金融",
          role: "后端工程师",
          description:
            "基于 Spring Boot 与 MyBatis 搭建交易服务，QPS 8000；用 Redis 缓存与 Kafka 削峰。",
        },
      ],
    }),
  },
  {
    expect: "go-backend",
    label: "Go 后端",
    resume: mk({
      name: "C",
      headline: "Go 后端工程师",
      role: "后端开发工程师",
      summary: "4 年 Go 服务端经验，做云原生与微服务。",
      skills: ["Go", "Gin", "gRPC", "Kubernetes", "MySQL"],
      experiences: [
        {
          company: "某云",
          role: "后端工程师",
          description:
            "用 Go 与 Gin 开发网关服务，基于 gRPC 拆分微服务，部署在 Kubernetes 上。",
        },
      ],
    }),
  },
  {
    expect: "algorithm",
    label: "算法",
    resume: mk({
      name: "D",
      headline: "算法工程师",
      role: "算法工程师",
      summary: "3 年推荐算法经验，熟悉深度学习与大模型微调。",
      skills: ["Python", "PyTorch", "机器学习", "深度学习", "NLP"],
      experiences: [
        {
          company: "某电商",
          role: "算法工程师",
          description:
            "基于 PyTorch 训练召回与排序模型，CTR 提升 6%；用 LLM 做商品标题生成。",
        },
      ],
    }),
  },
  {
    expect: "product",
    label: "产品经理",
    resume: mk({
      name: "E",
      headline: "产品经理",
      role: "B 端产品经理",
      summary: "4 年 B 端产品经验，负责客服工单系统从 0 到 1。",
      skills: ["需求分析", "PRD", "原型", "Axure", "数据分析"],
      experiences: [
        {
          company: "某 SaaS",
          role: "产品经理",
          description:
            "调研 30 家客户，输出 PRD 与原型；上线后工单处理效率提升 40%。",
        },
      ],
    }),
  },
  {
    expect: "design",
    label: "UI/UX 设计",
    resume: mk({
      name: "F",
      headline: "UI 设计师",
      role: "UI 设计师",
      summary: "5 年 B 端设计经验，负责设计规范与组件库。",
      skills: ["Figma", "Sketch", "交互设计", "视觉设计", "设计规范"],
      experiences: [
        {
          company: "某厂",
          role: "UI 设计师",
          description:
            "用 Figma 搭建设计规范与组件库，覆盖 12 条产品线；主导可用性测试。",
        },
      ],
    }),
  },
  {
    expect: "qa",
    label: "测试开发",
    resume: mk({
      name: "G",
      headline: "测试工程师",
      role: "测试开发工程师",
      summary: "4 年测试经验，做接口自动化与性能测试。",
      skills: ["Python", "Selenium", "接口测试", "JMeter", "自动化测试"],
      experiences: [
        {
          company: "某厂",
          role: "测试工程师",
          description:
            "用 Python + Selenium 搭建 UI 自动化，覆盖 200 条用例；JMeter 压测定位瓶颈。",
        },
      ],
    }),
  },
  {
    expect: "devops",
    label: "运维/SRE",
    resume: mk({
      name: "H",
      headline: "运维工程师",
      role: "SRE",
      summary: "5 年运维经验，负责 Kubernetes 集群与 CI/CD。",
      skills: ["Linux", "Kubernetes", "Docker", "Shell", "CI/CD"],
      experiences: [
        {
          company: "某云",
          role: "运维工程师",
          description:
            "维护 200 台 Linux 服务器与 Kubernetes 集群；用 Jenkins 做 CI/CD，发布耗时降 60%。",
        },
      ],
    }),
  },
  {
    expect: "data-engineering",
    label: "数据工程",
    resume: mk({
      name: "I",
      headline: "数据开发工程师",
      role: "大数据开发",
      summary: "4 年数仓建设经验，做实时与离线链路。",
      skills: ["SQL", "Python", "Spark", "Hive", "Flink"],
      experiences: [
        {
          company: "某电商",
          role: "数据开发",
          description:
            "用 Hive 与 Spark 搭建离线数仓，日处理 20T；Flink 做实时宽表，延迟 3 秒。",
        },
      ],
    }),
  },
  {
    expect: "sales",
    label: "销售/BD",
    resume: mk({
      name: "J",
      headline: "大客户销售",
      role: "大客户销售经理",
      summary: "6 年 ToB 销售经验，负责华东区大客户。",
      skills: ["客户开发", "商务谈判", "合同", "回款", "渠道管理"],
      experiences: [
        {
          company: "某软件",
          role: "销售经理",
          description:
            "独立开拓 20 家大客户，年度签约 3000 万；负责合同条款与回款跟进。",
        },
      ],
    }),
  },
  {
    expect: "finance",
    label: "财务",
    resume: mk({
      name: "K",
      headline: "财务经理",
      role: "财务经理",
      summary: "8 年财务经验，负责总账、税务与预算。",
      skills: ["财务报表", "会计准则", "税务", "预算", "Excel"],
      experiences: [
        {
          company: "某制造",
          role: "财务主管",
          description:
            "负责月度结账与财务报表编制，主导税务筹划，年度节税 200 万。",
        },
      ],
    }),
  },
  {
    expect: "hr",
    label: "HR",
    resume: mk({
      name: "L",
      headline: "HRBP",
      role: "HRBP",
      summary: "5 年人力资源经验，负责招聘与组织发展。",
      skills: ["招聘", "员工关系", "薪酬绩效", "劳动法", "HRBP"],
      experiences: [
        {
          company: "某互联网",
          role: "HRBP",
          description:
            "支撑 300 人业务线招聘，年入职 120 人；落地 OKR 与人才盘点。",
        },
      ],
    }),
  },
  {
    expect: "embedded",
    label: "嵌入式",
    resume: mk({
      name: "M",
      headline: "嵌入式软件工程师",
      role: "嵌入式软件工程师",
      summary: "4 年嵌入式开发，做 STM32 与 RTOS。",
      skills: ["C", "C++", "STM32", "RTOS", "单片机"],
      experiences: [
        {
          company: "某硬件",
          role: "嵌入式工程师",
          description:
            "基于 STM32 与 FreeRTOS 开发电机控制固件；用 C 写驱动，功耗降 30%。",
        },
      ],
    }),
  },
  {
    expect: "security",
    label: "网络安全",
    resume: mk({
      name: "N",
      headline: "安全工程师",
      role: "渗透测试工程师",
      summary: "4 年安全经验，做渗透测试与等保。",
      skills: ["网络安全", "渗透测试", "漏洞挖掘", "Linux", "Web安全"],
      experiences: [
        {
          company: "某安全",
          role: "安全工程师",
          description:
            "对 30 个系统做渗透测试，输出漏洞报告并复测；协助客户过等保三级。",
        },
      ],
    }),
  },
  {
    expect: "fullstack",
    label: "全栈",
    resume: mk({
      name: "O",
      headline: "全栈工程师",
      role: "全栈工程师",
      summary: "5 年全栈经验，前后端都能独立交付。",
      skills: ["React", "TypeScript", "Node.js", "MySQL", "Redis"],
      experiences: [
        {
          company: "某创业",
          role: "全栈工程师",
          description:
            "用 React + Node.js 独立交付 SaaS 产品，负责前端页面、接口与 MySQL 表设计。",
        },
      ],
    }),
  },
];

/**
 * 岗位识别回归夹具：15 份真实写法的简历必须落到正确画像。
 * 这份用例锁的是「扩画像 / 调权重」时最容易悄悄弄坏的东西——岗位识别。
 */
describe("岗位识别夹具", () => {
  it.each(CASES.map((item) => [item.label, item.expect, item.resume] as const))(
    "%s → %s",
    (_label, expected, resume) => {
      const result = analyzeResume(resume);
      expect(result.profile?.id).toBe(expected);
      expect(result.coreTotal).toBeGreaterThan(0);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
    },
  );

  it("React 开发者不会被建议补 Vue", () => {
    const reactCase = CASES.find((item) => item.expect === "frontend");
    expect(reactCase).toBeDefined();
    if (!reactCase) return;
    const result = analyzeResume(reactCase.resume);
    expect(result.missingCore.join(" ")).not.toContain("Vue");
    expect(result.missingSkills).not.toContain("Vue");
  });
});
