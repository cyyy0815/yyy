import { JOB_PROFILES, type JobProfile } from "./jobProfiles";
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

function textHasAlias(text: string, alias: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerAlias = alias.toLowerCase().trim();
  if (!lowerAlias) return false;
  if (hasCJK(lowerAlias)) return lowerText.includes(lowerAlias);

  const escaped = escapeRegExp(lowerAlias);
  // JS 不能命中 Node.js / Next.js 这类 .js 名字；C 不能命中 C++ / C#。
  const before = lowerAlias === "js" ? "(^|[^a-z0-9.])" : "(^|[^a-z0-9])";
  const after =
    lowerAlias === "c"
      ? "(?![a-z0-9+#])"
      : /[+#]$/.test(lowerAlias)
        ? // C++11 / C# 8.0 这类版本号仍算命中
          "(?![a-z])"
        : "([^a-z0-9]|$)";
  return new RegExp(`${before}${escaped}${after}`).test(lowerText);
}

/** 在自由文本（经历、项目、简介、JD）里找技能，支持同义词且避免 Java / JavaScript 互相误命中。 */
export function textHasSkill(text: string, skill: string): boolean {
  return skillAliases(skill).some((alias) => textHasAlias(text, alias));
}

export function buildResumeText(resume: Resume): string {
  return [
    resume.basic.summary,
    ...resume.experiences.map((item) => `${item.role} ${item.description}`),
    ...resume.projects.map((item) => `${item.role} ${item.description}`),
    ...resume.skills,
  ].join(" ");
}

/** 技能标签或经历/项目正文任一处出现过，就算简历具备该技能。 */
export function resumeHasSkill(resume: Resume, skill: string): boolean {
  return (
    resume.skills.some((userSkill) => skillMatches(userSkill, skill)) ||
    textHasSkill(buildResumeText(resume), skill)
  );
}

export type MatchResult = {
  profile: JobProfile | null;
  inferredRole: string;
  score: number;
  label: string;
  matchedCore: string[];
  missingCore: string[];
  matchedBonus: string[];
  /** 0-100 */
  completeness: number;
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

  let best: JobProfile | null = null;
  let bestScore = 0;

  for (const profile of JOB_PROFILES) {
    let score = 0;
    for (const alias of [profile.title, ...profile.aliases]) {
      if (textHasAlias(roleText, alias)) {
        score += 10 + alias.length;
      }
    }
    const coreHits = profile.core.filter((skill) =>
      resumeHasSkill(resume, skill),
    ).length;
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
      matchedBonus: [],
      completeness,
      keywords,
      suggestions: buildSuggestions(resume, [], [], completeness),
    };
  }

  const matchedCore = best.core.filter((skill) => resumeHasSkill(resume, skill));
  const missingCore = best.core.filter((skill) => !matchedCore.includes(skill));
  const matchedBonus = best.bonus.filter((skill) => resumeHasSkill(resume, skill));

  const coreRatio = best.core.length ? matchedCore.length / best.core.length : 0;
  const bonusRatio = best.bonus.length ? matchedBonus.length / best.bonus.length : 0;
  const score = Math.round(
    55 * coreRatio + 20 * bonusRatio + 25 * (completeness / 100),
  );

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
    matchedBonus,
    completeness,
    keywords,
    suggestions: buildSuggestions(resume, matchedCore, missingCore, completeness),
  };
}
