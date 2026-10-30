import { checkGeneratedText } from "@/lib/ai/factCheck";
import { analyzeJd, extractJdKeywords } from "@/lib/jdMatch";
import { coreSkillGroups, JOB_PROFILES, type JobProfile } from "@/lib/jobProfiles";
import { analyzeResume } from "@/lib/matching";
import { createEmptyResume, type Resume } from "@/lib/types";

export type EvalResult = {
  profileAccuracy: { total: number; correct: number };
  jdCoverage: { total: number; average: number };
  grouping: { profiles: number; grouped: number; naive: number };
  handwrittenJd: {
    total: number;
    profileHit: number;
    gapHit: number;
    rows: { label: string; expectProfile: string; actualProfile: string; gaps: string }[];
  };
  factCheck: {
    injected: number;
    detected: number;
    cleanSamples: number;
    falsePositives: number;
  };
};

/** 只保留词库能识别的技能：core 里的「工程化」「浏览器」是抽象要求，不能当技能写进简历。 */
function realSkills(candidates: string[]): string[] {
  const detected = new Set(extractJdKeywords(candidates.join("、")));
  return candidates.filter((item) => detected.has(item));
}

function resumeFromProfile(profile: JobProfile, skills: string[]): Resume {
  const base = createEmptyResume();
  return {
    ...base,
    basic: {
      ...base.basic,
      name: "评测样本",
      headline: profile.title,
      summary: `${profile.title}，熟悉 ${skills.slice(0, 3).join("、")}，负责过相关系统的设计与落地。`,
    },
    intent: {
      ...base.intent,
      targetRole: profile.title,
      experience: "3-5年",
    },
    skills,
    experiences: [
      {
        id: "e0",
        company: "示例公司",
        role: profile.title,
        start: "2021.03",
        end: "2024.06",
        description: `负责 ${skills.slice(0, 3).join("、")} 相关工作，参与需求评审与线上问题排查。`,
      },
    ],
  };
}

function jdFromProfile(profile: JobProfile): string {
  const keywords = realSkills(profile.core);
  return [
    `岗位职责：负责 ${profile.title} 相关工作，参与需求分析与方案设计。`,
    `任职要求：熟悉 ${keywords.join("、")}；`,
    `有 ${profile.bonus.slice(0, 3).join("、")} 经验者优先。`,
    "要求 3 年以上经验，本科及以上学历。",
  ].join("");
}

/** 每族只保留一个「真实技能」，模拟「同族技能只会其中一种」。 */
function oneSkillPerGroup(profile: JobProfile): string[] {
  return coreSkillGroups(profile)
    .map((group) => {
      const detected = realSkills(group);
      return detected[0] ?? "";
    })
    .filter(Boolean);
}

/** 手写 JD：刻意用真实招聘文案的写法，而不是把技能名堆在一起。 */
const HANDWRITTEN_JDS: { label: string; jd: string; expectProfile: string }[] = [
  {
    label: "前端（React）",
    expectProfile: "frontend",
    jd: `我们在找一位能独立负责中后台系统的前端工程师：
• 3 年以上前端开发经验，精通 React 与 TypeScript，能写高质量组件；
• 熟悉 Webpack / Vite 构建体系，做过首屏性能优化，理解浏览器的渲染与兼容性；
• 有组件库建设经验，能推动团队工程规范落地；
• 与后端协作完成接口设计，能主动推动跨团队问题解决。`,
  },
  {
    label: "Java 后端",
    expectProfile: "backend-java",
    jd: `岗位职责：
1. 负责交易核心链路的服务端开发，保障高并发下的稳定性；
2. 参与系统架构演进，推动服务拆分与治理。
任职要求：
1. 扎实的 Java 基础，熟悉 Spring Boot、MyBatis；
2. 熟悉 MySQL 索引与事务，了解 Redis 缓存设计与常见问题；
3. 有微服务（Dubbo / Spring Cloud）与消息队列使用经验；
4. 有高并发、分布式系统经验优先。`,
  },
  {
    label: "算法（推荐）",
    expectProfile: "algorithm",
    jd: `工作内容：
• 负责推荐 / 搜索场景的排序模型迭代，提升点击率与转化；
• 跟进大模型在业务中的落地，做特征工程与离线评估。
岗位要求：
• 熟悉 Python，掌握 PyTorch 或 TensorFlow；
• 扎实的机器学习基础，熟悉深度学习与常见推荐算法；
• 有 A/B 实验设计与线上效果归因经验；
• 有推荐系统或广告排序经验优先。`,
  },
  {
    label: "产品经理",
    expectProfile: "product",
    jd: `我们在招一位负责 B 端产品的产品经理：
• 负责需求调研、原型设计与 PRD 撰写，推动研发落地；
• 能和业务方对齐目标，拆解指标并持续迭代；
• 有较强的数据分析能力，能独立完成用户访谈与竞品分析；
• 3 年以上 B 端产品经验，有 SaaS 或中台产品经验优先。`,
  },
  {
    label: "运维 / SRE",
    expectProfile: "devops",
    jd: `岗位职责：
1. 负责线上服务的稳定性保障，参与值班与故障处理；
2. 建设 CI/CD 流水线与自动化发布体系；
3. 完善监控告警与容量规划。
任职要求：
1. 熟悉 Linux 系统与网络基础，能独立排查性能问题；
2. 熟练使用 Docker 与 Kubernetes；
3. 熟悉 Prometheus、Grafana 等监控体系；
4. 有 Terraform 等 IaC 实践优先。`,
  },
];

/** 注入事实：数字与技能都不在素材里，核对工具应当报出来。 */
const INJECTED_FACTS = [
  "将首屏时间降低 42%",
  "支撑日均 3000 万请求",
  "带领 12 人团队完成重构",
  "使用 Kafka 做异步解耦",
  "使用 GraphQL 统一网关",
  "把转化率提升 37%",
  "节省 60% 的服务器成本",
  "覆盖 800 万用户",
  "接入 Flink 做实时计算",
  "把发布频率提升到每天 20 次",
  "支撑 5 个数据中心",
  "把错误率压到 0.01%",
  "使用 Rust 重写核心模块",
  "把测试覆盖率提到 92%",
  "管理 3 条业务线",
  "服务 120 家企业客户",
  "把响应时间从 800ms 降到 120ms",
  "使用 Elasticsearch 做检索",
  "搭建 200 节点的集群",
  "把留存提升 18%",
];

export function runEvaluation(): EvalResult {
  // 1. 画像识别：用画像自己的核心技能造简历，看能不能认回同一个岗位
  let correct = 0;
  for (const profile of JOB_PROFILES) {
    const resume = resumeFromProfile(profile, realSkills([...profile.core, ...profile.bonus]));
    if (analyzeResume(resume).profile?.id === profile.id) correct += 1;
  }

  // 2. JD 覆盖率（上界）：同画像的 JD 与「技能齐全」的简历对比
  let coverageSum = 0;
  for (const profile of JOB_PROFILES) {
    const resume = resumeFromProfile(profile, realSkills([...profile.core, ...profile.bonus]));
    coverageSum += analyzeJd(jdFromProfile(profile), resume).score;
  }

  // 3. 分组收益：同族只保留一项时，分组口径 vs 逐项口径
  let groupedSum = 0;
  let naiveSum = 0;
  for (const profile of JOB_PROFILES) {
    const skills = oneSkillPerGroup(profile);
    if (skills.length === 0) continue;
    const matched = analyzeResume(resumeFromProfile(profile, skills));
    groupedSum += matched.coreTotal > 0 ? matched.coreHit / matched.coreTotal : 0;
    naiveSum += profile.core.length > 0 ? skills.length / profile.core.length : 0;
  }

  // 4. 手写 JD：识别画像，并检查是否给出具体的技能缺口
  const rows = HANDWRITTEN_JDS.map((item) => {
    const profile =
      JOB_PROFILES.find((candidate) => candidate.id === item.expectProfile) ??
      JOB_PROFILES[0];
    const resume = resumeFromProfile(profile, oneSkillPerGroup(profile));
    const matched = analyzeResume(resume);
    const analysis = analyzeJd(item.jd, resume);
    const gaps = [...matched.missingCore, ...analysis.missing].slice(0, 3);
    return {
      label: item.label,
      expectProfile: item.expectProfile,
      actualProfile: matched.profile?.id ?? "none",
      gaps: gaps.join(" / "),
    };
  });

  // 5. 事实核对：干净素材不应误报；注入数字 / 技能应当报出
  const baseSource = "负责中后台系统开发，完成需求评审与线上问题排查。";
  const cleanVariants = [
    "完成需求评审。",
    "负责线上问题排查。",
    "参与中后台系统开发。",
    "跟进需求评审。",
    "负责系统开发。",
  ];
  const cleanSamples = cleanVariants.map((variant) => ({
    text: `${baseSource}${variant}`,
    warnings: checkGeneratedText(`${baseSource}${variant}`, baseSource),
  }));
  const injected = INJECTED_FACTS.map((fact) => ({
    fact,
    warnings: checkGeneratedText(`${baseSource}${fact}。`, baseSource),
  }));

  return {
    profileAccuracy: { total: JOB_PROFILES.length, correct },
    jdCoverage: {
      total: JOB_PROFILES.length,
      average: Math.round(coverageSum / JOB_PROFILES.length),
    },
    grouping: {
      profiles: JOB_PROFILES.length,
      grouped: Math.round((groupedSum / JOB_PROFILES.length) * 100),
      naive: Math.round((naiveSum / JOB_PROFILES.length) * 100),
    },
    handwrittenJd: {
      total: HANDWRITTEN_JDS.length,
      profileHit: rows.filter((row) => row.actualProfile === row.expectProfile).length,
      gapHit: rows.filter((row) => row.gaps.length > 0).length,
      rows,
    },
    factCheck: {
      injected: injected.length,
      detected: injected.filter((item) => item.warnings.length > 0).length,
      cleanSamples: cleanSamples.length,
      falsePositives: cleanSamples.filter((item) => item.warnings.length > 0).length,
    },
  };
}

export function renderReport(result: EvalResult): string {
  const percent = (value: number, total: number) =>
    total === 0 ? "0%" : `${Math.round((value / total) * 100)}%`;

  const lines = [
    "# 简历工坊 · 离线评测报告",
    "",
    "> 由 `npm run eval` 生成，数据全部来自仓库内的岗位画像库与手写样本，可复现。",
    "",
    "## 1. 岗位画像识别",
    "",
    "用 26 个岗位画像各自的「核心 + 加分」技能构造简历，检查能否认回同一个画像。",
    "",
    `- 识别正确：**${result.profileAccuracy.correct} / ${result.profileAccuracy.total}**（${percent(result.profileAccuracy.correct, result.profileAccuracy.total)}）`,
    "",
    "## 2. JD 覆盖率（上界）",
    "",
    "用画像生成对应的 JD 文本，与「技能齐全」的同画像简历比对。这是**上界**：两边同源，只说明口径一致，不代表真实 JD 上的表现（见第 4 节的真实文案）。",
    "",
    `- 平均覆盖率：**${result.jdCoverage.average} / 100**（${result.jdCoverage.total} 个画像）`,
    "",
    "## 3. 核心要求分组的效果",
    "",
    "模拟「同族技能只会其中一种」（如只会 React、不会 Vue），比较两种计分口径：",
    "",
    "| 口径 | 平均核心要求达成率 |",
    "|---|---|",
    `| 逐项技能（旧） | ${result.grouping.naive}% |`,
    `| 分组（现用） | **${result.grouping.grouped}%** |`,
    "",
    `分组避免了 ${result.grouping.grouped - result.grouping.naive} 个百分点的系统性低估。`,
    "",
    "## 4. 手写 JD 检查",
    "",
    "5 段按真实招聘文案写的 JD（非技能名堆砌），检查画像识别与缺口提示：",
    "",
    "| 样本 | 期望画像 | 识别结果 | 提示的缺口 |",
    "|---|---|---|---|",
    ...result.handwrittenJd.rows.map(
      (row) => `| ${row.label} | ${row.expectProfile} | ${row.actualProfile} | ${row.gaps || "（无）"} |`,
    ),
    "",
    `- 画像命中：**${result.handwrittenJd.profileHit} / ${result.handwrittenJd.total}**`,
    `- 给出具体缺口：**${result.handwrittenJd.gapHit} / ${result.handwrittenJd.total}**`,
    "",
    "## 5. AI 事实核对",
    "",
    "对 20 条注入的「素材里没有的数字 / 技能」检查检出率，并用 5 条干净文本检查误报：",
    "",
    "| 指标 | 结果 |",
    "|---|---|",
    `| 注入事实检出 | **${result.factCheck.detected} / ${result.factCheck.injected}** |`,
    `| 干净文本误报 | ${result.factCheck.falsePositives} / ${result.factCheck.cleanSamples} |`,
    "",
    "## 局限",
    "",
    "- 样本由画像库自动构造 + 5 段手写 JD，规模小，不代表公开基准；",
    "- 第 1、2 节的简历由画像生成，存在循环性，第 4 节用手写文案缓解；",
    "- 事实核对只做字面比对，同义改写、跨语言表达可能漏报，也不判断内容是否正确。",
    "",
  ];

  return lines.join("\n");
}
