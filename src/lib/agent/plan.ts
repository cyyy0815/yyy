import { analyzeJd } from "@/lib/jdMatch";
import { analyzeResume } from "@/lib/matching";
import type { Resume } from "@/lib/types";
import type { AgentStep } from "./types";

/**
 * 生成一次「投递准备」计划。
 *
 * 计划是确定性的（不调模型），但内容会随简历与 JD 变化：
 * 简介为空时是「起草」，已有内容时是「改写」；JD 里一个技能都没识别出来时，
 * 计划会先提示补全 JD，而不是硬着头皮改写。
 *
 * 这样做的取舍：计划本身不依赖 API Key，演示时没有 Key 也能跑完前两步；
 * 改写与求职信这两步需要模型，缺 Key 时在 UI 里标成「需配置 AI」并跳过。
 */
export function buildPlan({
  resume,
  jd,
  aiReady,
}: {
  resume: Resume;
  jd: string;
  aiReady: boolean;
}): AgentStep[] {
  const text = jd.trim();
  const analysis = analyzeJd(text, resume);
  const match = analyzeResume(resume);
  const profile = match.profile;
  const role =
    resume.intent.targetRole.trim() ||
    resume.basic.headline.trim() ||
    profile?.title ||
    "目标岗位";
  const hasSummary = Boolean(resume.basic.summary.trim());

  const steps: AgentStep[] = [
    {
      id: "analyze_jd",
      title: "解析岗位要求",
      rationale:
        text.length < 40
          ? "JD 太短，先看看能识别出多少关键词"
          : analysis.keywordCount > 0
            ? `从这段 JD 里识别出 ${analysis.keywordCount} 个技能关键词，先确认岗位在要什么`
            : "这段 JD 里没有命中词库的技能，先看能提取出哪些岗位信号",
      requiresAi: false,
    },
    {
      id: "diagnose_gaps",
      title: "诊断能力差距",
      rationale:
        match.coreTotal > 0
          ? `对照「${profile?.title ?? "通用"}」画像，你现在命中 ${match.coreHit}/${match.coreTotal} 项核心要求`
          : "先看你与岗位画像的整体差距，再决定改哪里",
      requiresAi: false,
    },
    {
      id: "rewrite_summary",
      title: hasSummary ? "按岗位改写个人简介" : "起草个人简介",
      rationale: hasSummary
        ? `把简介改写成面向「${role}」的版本，只用你已有的事实，不编造数字`
        : "简介还是空的，先起草一版，再逐句改",
      requiresAi: true,
    },
    {
      id: "cover_letter",
      title: "生成求职信",
      rationale: `基于同一份材料写给「${role}」，生成后可直接复制或下载`,
      requiresAi: true,
    },
  ];

  // 没有配置 AI 时把依赖说明写进理由，UI 直接跳过这两步，不假装执行过。
  if (aiReady) return steps;
  return steps.map((step) =>
    step.requiresAi
      ? { ...step, rationale: `${step.rationale}（需要先配置 AI Key）` }
      : step,
  );
}
