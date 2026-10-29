import {
  coreSkillGroups,
  JOB_PROFILES,
  type JobProfile,
} from "./jobProfiles";
import { canonicalSkillKey, skillAliases } from "./skillSynonyms";
import type { Resume } from "./types";

function hasCJK(value: string): boolean {
  return /[一-鿿]/.test(value);
}

export function skillMatches(userSkill: string, target: string): boolean {
  const a = canonicalSkillKey(userSkill);
  const b = canonicalSkillKey(target);
  if (!a || !b) return false;
  if (a === b) return true;
  // 中文用包含关系（如「性能优化」vs「前端性能优化」）；英文必须精确，避免 java 命中 javascript
  if (hasCJK(target) || hasCJK(userSkill)) {
    return a.includes(b) || b.includes(a);
  }
  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 别名对应的正则只编译一次。
 * 分析一次简历会对 200+ 个技能各跑一遍匹配，每次新建 RegExp 纯属浪费；
 * 别名集合是静态的，缓存不会无限增长。
 */
const aliasPatterns = new Map<string, RegExp>();

function aliasPattern(alias: string): RegExp {
  const cached = aliasPatterns.get(alias);
  if (cached) return cached;

  const escaped = escapeRegExp(alias);
  // JS 不能命中 Node.js / Next.js 这类 .js 名字；C 不能命中 C++ / C#。
  const before = alias === "js" ? "(^|[^a-z0-9.])" : "(^|[^a-z0-9])";
  const after =
    alias === "c"
      ? "(?![a-z0-9+#])"
      : /[+#]$/.test(alias)
        ? // C++11 / C# 8.0 这类版本号仍算命中
          "(?![a-z])"
        : "([^a-z0-9]|$)";
  const pattern = new RegExp(`${before}${escaped}${after}`);
  aliasPatterns.set(alias, pattern);
  return pattern;
}

/** `lowerText` 需已转小写；批量匹配时复用同一份小写文本。 */
function aliasMatchesText(lowerText: string, alias: string): boolean {
  const lowerAlias = alias.toLowerCase().trim();
  if (!lowerAlias) return false;
  if (hasCJK(lowerAlias)) return lowerText.includes(lowerAlias);
  return aliasPattern(lowerAlias).test(lowerText);
}

function textHasAlias(text: string, alias: string): boolean {
  return aliasMatchesText(text.toLowerCase(), alias);
}

/** 同一段文本要反复匹配多个技能时用它，避免每次都重建小写副本。 */
export function createTextSkillMatcher(
  text: string,
): (skill: string) => boolean {
  const lowerText = text.toLowerCase();
  return (skill) =>
    skillAliases(skill).some((alias) => aliasMatchesText(lowerText, alias));
}

/** 在自由文本（经历、项目、简介、JD）里找技能，支持同义词且避免 Java / JavaScript 互相误命中。 */
export function textHasSkill(text: string, skill: string): boolean {
  return createTextSkillMatcher(text)(skill);
}

export function buildResumeText(resume: Resume): string {
  return [
    resume.basic.summary,
    ...resume.experiences.map((item) => `${item.role} ${item.description}`),
    ...resume.projects.map((item) => `${item.role} ${item.description}`),
    ...resume.skills,
  ].join(" ");
}

/**
 * 批量检查简历技能时先拼一次正文，避免「每判断一个技能就重建整份经历文本」。
 */
export function createResumeSkillMatcher(
  resume: Resume,
): (skill: string) => boolean {
  const lowerText = buildResumeText(resume).toLowerCase();
  return (skill) =>
    resume.skills.some((userSkill) => skillMatches(userSkill, skill)) ||
    skillAliases(skill).some((alias) => aliasMatchesText(lowerText, alias));
}

/** 技能标签或经历/项目正文任一处出现过，就算简历具备该技能。 */
export function resumeHasSkill(resume: Resume, skill: string): boolean {
  return createResumeSkillMatcher(resume)(skill);
}

export type MatchResult = {
  profile: JobProfile | null;
  inferredRole: string;
  score: number;
  label: string;
  /** 命中的核心技能（扁平，按画像分组顺序） */
  matchedCore: string[];
  /** 未满足的核心要求；同族技能合并成「React / Vue」这样的一条 */
  missingCore: string[];
  /** 未满足要求里的具体技能（可点击补进简历，避免把「React / Vue」当技能名添加） */
  missingSkills: string[];
  matchedBonus: string[];
  /** 已满足的核心要求（可读标签，如「JavaScript / TypeScript」「工程化」） */
  matchedRequirements: string[];
  /** 已满足的核心要求数（按分组口径，同族技能算一项） */
  coreHit: number;
  /** 核心要求总数（按分组口径） */
  coreTotal: number;
  /** 0-100 */
  completeness: number;
  /** 匹配分的三个组成部分，相加等于 score */
  breakdown: { core: number; bonus: number; completeness: number };
  keywords: string[];
  suggestions: string[];
};

function resumeCompleteness(resume: Resume): number {
  let total = 0;
  let filled = 0;

  const check = (condition: boolean, weight: number) => {
    total += weight;
    if (condition) filled += weight;
  };

  check(resume.basic.name.trim().length > 0, 1);
  check(resume.basic.headline.trim().length > 0, 0.5);
  check(resume.basic.email.includes("@"), 0.5);
  check(resume.basic.phone.trim().length >= 7, 0.5);
  check(resume.intent.targetRole.trim().length > 0, 1);
  check(resume.intent.targetCity.trim().length > 0, 0.5);
  check(resume.basic.summary.trim().length >= 40, 0.5);
  check(resume.experiences.length > 0, 2);
  check(
    resume.experiences.some((item) => item.description.trim().length >= 60),
    1,
  );
  check(resume.educations.length > 0, 1);
  check(resume.projects.length > 0, 0.5);
  check(resume.skills.length >= 5, 1);

  return Math.round((filled / total) * 100);
}

function buildSuggestions(
  resume: Resume,
  matchedCore: string[],
  missingCore: string[],
  completeness: number,
): string[] {
  const suggestions: string[] = [];
  const roleText = `${resume.intent.targetRole} ${resume.basic.headline}`.toLowerCase();

  if (!resume.intent.targetRole.trim()) {
    suggestions.push("填写「期望岗位」，岗位匹配和搜索链接会更准确");
  }
  if (!resume.intent.targetCity.trim()) {
    suggestions.push("填写「期望城市」，BOSS直聘等平台可直接定位到目标城市");
  }
  if (missingCore.length > 0) {
    suggestions.push(
      `目标岗位常见要求中你还没有体现：${missingCore.slice(0, 4).join("、")}。会的话补进技能或经历里`,
    );
  }
  if (matchedCore.length === 0 && roleText.trim()) {
    suggestions.push("技能与目标岗位重合度较低，建议先补充 5 个以上岗位核心技能");
  }
  if (resume.basic.summary.trim().length < 40) {
    suggestions.push("写一段 3~4 行的个人简介：年限 + 技术栈 + 一个量化成果");
  }
  if (resume.experiences.length === 0) {
    suggestions.push("补充工作经历，推荐逻辑会结合经历中的技能做匹配");
  }
  const descriptions = resume.experiences.map((item) => item.description).join(" ");
  if (descriptions && !/\d/.test(descriptions)) {
    suggestions.push("经历描述缺少数字，建议补充规模、百分比、耗时等量化结果");
  }
  if (resume.skills.length < 5) {
    suggestions.push("技能标签偏少，至少填写 5 个与目标岗位相关的技能");
  }
  if (completeness >= 100) {
    suggestions.push("简历信息已完整，可以切换模板、导出 PDF 并开始投递");
  }

  return suggestions.slice(0, 5);
}

export function analyzeResume(resume: Resume): MatchResult {
  const completeness = resumeCompleteness(resume);
  const roleText = `${resume.intent.targetRole} ${resume.basic.headline}`.trim();
  // 简历正文只拼一次：下面 26 个画像会对 200+ 个技能反复调用它。
  const hasSkill = createResumeSkillMatcher(resume);

  let best: JobProfile | null = null;
  let bestScore = 0;

  for (const profile of JOB_PROFILES) {
    let score = 0;
    for (const alias of [profile.title, ...profile.aliases]) {
      if (textHasAlias(roleText, alias)) {
        score += 10 + alias.length;
      }
    }
    const coreHits = profile.core.filter(hasSkill).length;
    score += coreHits * 2;

    if (score > bestScore) {
      bestScore = score;
      best = profile;
    }
  }

  if (!best || bestScore < 4) {
    const keywords = Array.from(
      new Set(
        [
          resume.intent.targetRole,
          resume.basic.headline,
          resume.experiences[0]?.role ?? "",
          resume.projects[0]?.role ?? "",
          ...resume.skills.slice(0, 5),
        ].filter(Boolean),
      ),
    ).slice(0, 6);

    return {
      profile: null,
      inferredRole:
        resume.intent.targetRole ||
        resume.basic.headline ||
        resume.experiences[0]?.role ||
        resume.projects[0]?.role ||
        "通用岗位",
      score: Math.round(completeness * 0.8),
      label: "岗位画像未收录",
      matchedCore: [],
      missingCore: [],
      missingSkills: [],
      matchedBonus: [],
      matchedRequirements: [],
      coreHit: 0,
      coreTotal: 0,
      completeness,
      breakdown: {
        core: 0,
        bonus: 0,
        completeness: Math.round(25 * (completeness / 100)),
      },
      keywords,
      suggestions: buildSuggestions(resume, [], [], completeness),
    };
  }

  // 核心要求按「同族技能任选其一」分组计算：只会 React 也算满足前端框架要求，
  // 不会因此被判定"缺 Vue"。分组里还可以放可检测的等价信号（如用 Webpack 代表
  // 「工程化」），但匹配结果只回填 core 里的规范技能名，避免把信号词当技能。
  const groups = coreSkillGroups(best);
  const coreSet = new Set(best.core);
  const hitLists = groups.map((group) => group.filter(hasSkill));
  const matchedCore = Array.from(
    new Set(hitLists.flat().filter((skill) => coreSet.has(skill))),
  );
  const missingGroups = groups.filter((_, index) => hitLists[index].length === 0);
  const missingCore = missingGroups.map((group) =>
    group.filter((skill) => coreSet.has(skill)).join(" / "),
  );
  const missingSkills = Array.from(
    new Set(missingGroups.flat().filter((skill) => coreSet.has(skill))),
  );
  const matchedRequirements = groups
    .filter((_, index) => hitLists[index].length > 0)
    .map((group) => group.filter((skill) => coreSet.has(skill)).join(" / "));
  const coreHit = hitLists.filter((list) => list.length > 0).length;
  const coreTotal = groups.length;
  const matchedBonus = best.bonus.filter(hasSkill);

  const coreRatio = coreTotal ? coreHit / coreTotal : 0;
  const bonusRatio = best.bonus.length ? matchedBonus.length / best.bonus.length : 0;
  const breakdown = {
    core: Math.round(55 * coreRatio),
    bonus: Math.round(20 * bonusRatio),
    completeness: Math.round(25 * (completeness / 100)),
  };
  const score = breakdown.core + breakdown.bonus + breakdown.completeness;

  const label =
    score >= 80
      ? "高度匹配"
      : score >= 60
        ? "较匹配"
        : score >= 40
          ? "有提升空间"
          : "信息不足";

  const keywords = Array.from(
    new Set(
      [
        resume.intent.targetRole.trim() || resume.basic.headline.trim() || best.title,
        ...best.searchKeywords,
        ...matchedCore.slice(0, 3),
      ].filter(Boolean),
    ),
  ).slice(0, 6);

  return {
    profile: best,
    inferredRole:
      resume.intent.targetRole.trim() ||
      resume.basic.headline.trim() ||
      best.title,
    score,
    label,
    matchedCore,
    missingCore,
    missingSkills,
    matchedBonus,
    matchedRequirements,
    coreHit,
    coreTotal,
    completeness,
    breakdown,
    keywords,
    suggestions: buildSuggestions(resume, matchedCore, missingCore, completeness),
  };
}
