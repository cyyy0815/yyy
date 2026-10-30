import { analyzeJd } from "@/lib/jdMatch";
import { analyzeResume } from "@/lib/matching";
import type { AgentContext, AgentStepResult, AgentToolId } from "./types";

const MAX_ITEMS = 8;

/**
 * 工具清单：既是前端渲染用的标题，也是规划提示词里给模型的菜单。
 * requiresAi 决定「没有 Key 时跳过」与「执行前需要人工确认」。
 */
export const TOOL_SPECS: Record<
  AgentToolId,
  { title: string; requiresAi: boolean; description: string }
> = {
  analyze_jd: {
    title: "解析岗位要求",
    requiresAi: false,
    description: "识别 JD 里的技能关键词、年限与学历要求，给出匹配分",
  },
  diagnose_gaps: {
    title: "诊断能力差距",
    requiresAi: false,
    description: "对照岗位画像的核心要求，列出缺口与可补的技能",
  },
  rewrite_summary: {
    title: "按岗位改写个人简介",
    requiresAi: true,
    description: "重写个人简介使其贴合该 JD，只使用简历里已有的事实",
  },
  cover_letter: {
    title: "生成求职信",
    requiresAi: true,
    description: "基于简历与 JD 生成一段可直接发送的求职信",
  },
};

function joinItems(items: string[], max = MAX_ITEMS): string {
  if (items.length <= max) return items.join("、");
  return `${items.slice(0, max).join("、")}…`;
}

/**
 * 工具一：解析 JD。
 * 只做本地词库匹配，不发任何数据；结果同时给用户看，也作为后面改写的依据。
 */
export function runAnalyzeJd({ resume, jd }: AgentContext): AgentStepResult {
  const analysis = analyzeJd(jd, resume);
  const lines = [
    `匹配分 ${analysis.score} · ${analysis.label}`,
    analysis.matched.length > 0
      ? `已覆盖 ${analysis.matched.length} 个：${joinItems(analysis.matched)}`
      : "JD 里的技能没有出现在简历里",
    analysis.missing.length > 0
      ? `还差 ${analysis.missing.length} 个：${joinItems(analysis.missing)}`
      : "JD 提到的技能在简历里都有对应",
  ];

  if (analysis.minYears) lines.push(`年限要求：${analysis.minYears} 年以上`);
  if (analysis.requiredDegree) lines.push(`学历要求：${analysis.requiredDegree}`);
  if (analysis.suggestions.length > 0) {
    lines.push(`方向建议：${joinItems(analysis.suggestions, 3)}`);
  }

  return {
    summary:
      analysis.keywordCount > 0
        ? `匹配分 ${analysis.score}，覆盖 ${analysis.matched.length}/${analysis.keywordCount} 个关键词`
        : "JD 里没有识别到词库技能",
    detail: lines.join("\n"),
  };
}

/**
 * 工具二：诊断差距。
 * 用岗位画像判断「核心要求」缺口，比单纯数关键词更接近 HR 的读法。
 */
export function runDiagnoseGaps({ resume }: AgentContext): AgentStepResult {
  const match = analyzeResume(resume);
  const profileName = match.profile?.title || match.inferredRole || "通用";
  const lines = [
    `画像：${profileName}（匹配分 ${match.score} · ${match.label}）`,
    `核心要求 ${match.coreHit}/${match.coreTotal} 项：${
      match.matchedRequirements.length > 0
        ? joinItems(match.matchedRequirements)
        : "暂无"
    }`,
  ];

  if (match.missingCore.length > 0) {
    lines.push(`缺口：${joinItems(match.missingCore)}`);
  }
  if (match.missingSkills.length > 0) {
    lines.push(`可以补的技能：${joinItems(match.missingSkills)}`);
  }
  lines.push(
    `分值构成：核心 ${match.breakdown.core} + 加分 ${match.breakdown.bonus} + 完整度 ${match.breakdown.completeness}`,
  );

  return {
    summary:
      match.missingCore.length > 0
        ? `缺 ${match.missingCore.length} 项核心要求`
        : "核心要求已全部覆盖",
    detail: lines.join("\n"),
  };
}

/** 本地工具注册表；AI 步骤由面板直接调流式接口，不进这里。 */
export const LOCAL_TOOLS = {
  analyze_jd: runAnalyzeJd,
  diagnose_gaps: runDiagnoseGaps,
} as const;
