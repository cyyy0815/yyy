/**
 * 技能同义词。键是展示用的规范写法，值是招聘 JD / 简历里常见的别名。
 * 只收录含义明确的缩写与写法，避免把 Java / JavaScript、C / C++ / C# 混为一谈。
 */
export const SKILL_SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  JavaScript: ["JS", "ECMAScript"],
  TypeScript: ["TS"],
  "Node.js": ["Node", "NodeJS"],
  React: ["React.js", "ReactJS"],
  Vue: ["Vue.js", "VueJS"],
  "Next.js": ["NextJS"],
  Kubernetes: ["K8s"],
  Go: ["Golang"],
  PostgreSQL: ["Postgres", "PG"],
  "Spring Boot": ["SpringBoot"],
  "C++": ["CPP", "Cpp", "C/C++"],
  "C#": ["CSharp", "C Sharp"],
  "CI/CD": ["CICD", "CI CD", "持续集成"],
  "Power BI": ["PowerBI"],
  "Scikit-learn": ["sklearn", "Scikit Learn"],
  RESTful: ["REST", "REST API"],
  "A/B测试": ["AB测试", "ABTest", "A/B Test"],
  性能优化: ["性能调优"],
  微服务: ["Microservice", "Microservices"],
  前端: ["Frontend", "Front-end"],
  后端: ["Backend", "Back-end"],
  NLP: ["自然语言处理"],
  交互设计: ["Interaction Design"],
  视觉设计: ["Visual Design"],
  用户研究: ["User Research"],
  需求分析: ["Requirement Analysis"],
  项目管理: ["Project Management"],
  测试用例: ["Test Case"],
  自动化测试: ["Automated Testing", "Test Automation"],
  接口测试: ["API Testing"],
  网络安全: ["Cybersecurity", "Network Security"],
  渗透测试: ["Penetration Testing", "Pentest"],
  等保: ["等级保护"],
  数据分析: ["Data Analysis"],
  数据可视化: ["Data Visualization"],
};

/**
 * 统一比较键：小写，去空格与常见分隔符，去掉 .js 后缀。
 * 保留 + 与 #，否则 C / C++ / C# 会互相命中。
 */
function normalizedKey(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[\s._\-/]/g, "")
    .trim();
  if (normalized.length > 3 && normalized.endsWith("js")) {
    return normalized.slice(0, -2);
  }
  return normalized;
}

const CANONICAL_BY_KEY = new Map<string, string>();

for (const [canonical, aliases] of Object.entries(SKILL_SYNONYMS)) {
  CANONICAL_BY_KEY.set(normalizedKey(canonical), canonical);
  for (const alias of aliases) {
    const key = normalizedKey(alias);
    // 规范写法优先；别名之间也保持先到先得，避免一个缩写指向两个技能。
    if (!CANONICAL_BY_KEY.has(key)) {
      CANONICAL_BY_KEY.set(key, canonical);
    }
  }
}

/** 把任意写法归一到同义词表里的规范写法；未收录的原样返回。 */
export function canonicalSkill(value: string): string {
  return CANONICAL_BY_KEY.get(normalizedKey(value)) ?? value.trim();
}

/** 比较技能是否相同用的键。 */
export function canonicalSkillKey(value: string): string {
  return normalizedKey(canonicalSkill(value));
}

/** 规范写法 + 全部别名，供正文扫描逐个尝试。 */
export function skillAliases(value: string): string[] {
  const canonical = canonicalSkill(value);
  return [canonical, ...(SKILL_SYNONYMS[canonical] ?? [])];
}
