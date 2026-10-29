import { JOB_PROFILES } from "./jobProfiles";
import {
  createResumeSkillMatcher,
  createTextSkillMatcher,
} from "./matching";
import { canonicalSkillKey } from "./skillSynonyms";
import type { Resume } from "./types";

/** 岗位画像之外的常见技术/工具关键词 */
const EXTRA_SKILLS = [
  "HTML",
  "CSS",
  "JavaScript",
  "TypeScript",
  "React",
  "Vue",
  "Angular",
  "Next.js",
  "Nuxt",
  "Node.js",
  "Java",
  "Spring",
  "Spring Boot",
  "MyBatis",
  "Python",
  "Django",
  "Flask",
  "FastAPI",
  "Go",
  "C++",
  "C#",
  "PHP",
  "Ruby",
  "Rust",
  "Swift",
  "Kotlin",
  "Flutter",
  "React Native",
  "MySQL",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "Elasticsearch",
  "Kafka",
  "RabbitMQ",
  "RocketMQ",
  "Docker",
  "Kubernetes",
  "Linux",
  "Shell",
  "Git",
  "Jenkins",
  "CI/CD",
  "Nginx",
  "AWS",
  "阿里云",
  "腾讯云",
  "微服务",
  "分布式",
  "高并发",
  "Hive",
  "Spark",
  "Flink",
  "Hadoop",
  "Pandas",
  "NumPy",
  "TensorFlow",
  "PyTorch",
  "Scikit-learn",
  "机器学习",
  "深度学习",
  "NLP",
  "计算机视觉",
  "大模型",
  "LLM",
  "SQL",
  "Excel",
  "Tableau",
  "Power BI",
  "Figma",
  "Sketch",
  "Axure",
  "Photoshop",
  "Illustrator",
  "设计规范",
  "交互设计",
  "用户研究",
  "数据分析",
  "数据可视化",
  "A/B测试",
  "SEO",
  "SEM",
  "项目管理",
  "PRD",
  "原型",
  "性能优化",
  "小程序",
  "Webpack",
  "Vite",
  "ECharts",
  "Three.js",
  "WebGL",
  "GraphQL",
  "RESTful",
  "Jest",
  "Cypress",
  "Playwright",
  "Selenium",
  "JMeter",
  "Appium",
];

const DICTIONARY: string[] = (() => {
  const all = [
    ...JOB_PROFILES.flatMap((profile) => [...profile.core, ...profile.bonus]),
    ...EXTRA_SKILLS,
  ];
  const seen = new Set<string>();
  return all.filter((skill) => {
    // 同义写法只保留第一个规范标签，避免 JS / JavaScript 在结果里重复出现。
    const key = canonicalSkillKey(skill);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
})();

const DEGREE_RANK: Record<string, number> = {
  大专: 1,
  本科: 2,
  硕士: 3,
  博士: 4,
  其他: 0,
};

const EXPERIENCE_YEARS: Record<string, number> = {
  应届生: 0,
  "1年以内": 0.5,
  "1-3年": 1,
  "3-5年": 3,
  "5-10年": 5,
  "10年以上": 10,
};

function parseMinYears(text: string): number | null {
  const range = text.match(/(\d+)\s*[-~至]\s*(\d+)\s*年/);
  if (range) return Number(range[1]);

  const above = text.match(/(\d+)\s*年(?:及以上|以上)/);
  if (above) return Number(above[1]);

  const single = text.match(/(\d+)\s*年[^。\n]{0,8}?(?:工作)?经验/);
  if (single) return Number(single[1]);

  return null;
}

function parseRequiredDegree(text: string): string | null {
  const match = text.match(/(大专|本科|硕士|博士)(?:学历)?(?:及以上|以上)/);
  return match ? match[1] : null;
}

function highestDegree(degrees: string[]): string | null {
  let best: string | null = null;
  for (const degree of degrees) {
    if (!(degree in DEGREE_RANK)) continue;
    if (best === null || DEGREE_RANK[degree] > DEGREE_RANK[best]) {
      best = degree;
    }
  }
  return best;
}

export type JdAnalysis = {
  keywordCount: number;
  matched: string[];
  missing: string[];
  score: number;
  label: string;
  minYears: number | null;
  requiredDegree: string | null;
  suggestions: string[];
};

/** 从 JD 中识别岗位画像与常见技能库里的关键词。 */
export function extractJdKeywords(jd: string): string[] {
  const text = jd.trim();
  return text ? DICTIONARY.filter(createTextSkillMatcher(text)) : [];
}

export function analyzeJd(jd: string, resume: Resume): JdAnalysis {
  const text = jd.trim();
  const jdKeywords = extractJdKeywords(text);
  const matched = jdKeywords.filter(createResumeSkillMatcher(resume));
  const missing = jdKeywords.filter((skill) => !matched.includes(skill));
  const keywordCount = jdKeywords.length;
  const score =
    keywordCount > 0 ? Math.round((matched.length / keywordCount) * 100) : 0;

  const label =
    score >= 75
      ? "匹配度较高"
      : score >= 50
        ? "部分匹配"
        : score >= 25
          ? "差距较大"
          : "匹配度低";

  const minYears = parseMinYears(text);
  const requiredDegree = parseRequiredDegree(text);
  const resumeYears = EXPERIENCE_YEARS[resume.intent.experience] ?? null;
  const resumeDegree = highestDegree(
    resume.educations.map((education) => education.degree),
  );

  const suggestions: string[] = [];

  if (keywordCount === 0) {
    suggestions.push("没有识别到常见的技能关键词，试试粘贴更完整的岗位描述");
  } else {
    if (missing.length > 0) {
      suggestions.push(
        `JD 中出现、简历未体现：${missing.slice(0, 6).join("、")}。如果具备，补进技能或经历里`,
      );
    }
    if (minYears !== null) {
      if (resumeYears === null) {
        suggestions.push(
          `JD 要求 ${minYears} 年以上经验，你的求职意向还没填写工作年限`,
        );
      } else if (resumeYears < minYears) {
        suggestions.push(
          `JD 要求 ${minYears} 年以上经验，你填写的是「${resume.intent.experience}」，投递前建议确认年限是否匹配`,
        );
      }
    }
    if (requiredDegree) {
      if (!resumeDegree) {
        suggestions.push(
          `JD 要求 ${requiredDegree}及以上，你的教育经历还没填写学历`,
        );
      } else if (DEGREE_RANK[resumeDegree] < DEGREE_RANK[requiredDegree]) {
        suggestions.push(
          `JD 要求 ${requiredDegree}及以上，你的最高学历是${resumeDegree}`,
        );
      }
    }

    if (suggestions.length === 0) {
      suggestions.push(
        score >= 75
          ? "技能与经验要求基本覆盖，可以优先投递；建议在简介里复用 JD 的关键词表达"
          : "建议对照 JD 补充 2~3 个核心技能，再调整简历表述",
      );
    } else if (score >= 75) {
      suggestions.push("整体覆盖度较高，可以优先投递；记得在简介里复用 JD 的关键词");
    }
  }

  return {
    keywordCount,
    matched,
    missing,
    score,
    label,
    minYears,
    requiredDegree,
    suggestions: suggestions.slice(0, 4),
  };
}
