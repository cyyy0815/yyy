"use client";

import { analyzeResume } from "@/lib/matching";
import { buildJobBoardUrl, JOB_BOARDS } from "@/lib/jobBoards";
import type { Resume } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { CoverLetterWriter } from "./CoverLetterWriter";
import { JdMatcher } from "./JdMatcher";
import { SkillChip } from "./SkillChip";

function ScoreRing({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div
      className="relative h-[112px] w-[112px] shrink-0 rounded-full"
      style={{
        background: `conic-gradient(${color} ${value * 3.6}deg, #e7e5e4 0deg)`,
      }}
    >
      <div className="absolute inset-[7px] flex flex-col items-center justify-center rounded-full bg-white">
        <span className="text-[30px] font-semibold leading-none tabular-nums tracking-tight text-zinc-900">
          {value}
        </span>
        <span className="mt-1 text-[10px] tracking-wide text-zinc-400">{label}</span>
      </div>
    </div>
  );
}

function JobBoardCard({
  board,
  keyword,
  city,
  alternates,
}: {
  board: (typeof JOB_BOARDS)[number];
  keyword: string;
  city: string;
  alternates: string[];
}) {
  const primaryUrl = buildJobBoardUrl(board.id, keyword, city);

  return (
    <div className="group rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-zinc-300 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: board.brand }}
          />
          <h3 className="text-[14px] font-semibold tracking-tight text-zinc-900">
            {board.name}
          </h3>
        </div>
        <a
          href={primaryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-zinc-700"
        >
          去搜索
          <span aria-hidden="true">↗</span>
        </a>
      </div>

      <p className="mt-2 text-[12px] leading-5 text-zinc-500">{board.description}</p>

      <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5">
        <p className="text-[11px] text-zinc-400">当前搜索</p>
        <p className="mt-0.5 truncate text-[13px] font-medium text-zinc-800">
          {keyword}
          {city ? (
            <span className="ml-1.5 font-normal text-zinc-500">· {city}</span>
          ) : null}
        </p>
      </div>

      {alternates.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {alternates.map((alternate) => (
            <a
              key={alternate}
              href={buildJobBoardUrl(board.id, alternate, city)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
            >
              {alternate} ↗
            </a>
          ))}
        </div>
      ) : null}

      {board.note ? (
        <p className="mt-3 text-[10.5px] text-zinc-400">{board.note}</p>
      ) : null}
    </div>
  );
}

function hasJobInputs(resume: Resume): boolean {
  return Boolean(
    resume.intent.targetRole.trim() ||
      resume.basic.headline.trim() ||
      resume.basic.summary.trim() ||
      resume.skills.length ||
      resume.experiences.some(
        (item) => item.company.trim() || item.role.trim() || item.description.trim(),
      ) ||
      resume.projects.some(
        (item) => item.name.trim() || item.role.trim() || item.description.trim(),
      ) ||
      resume.educations.some(
        (item) => item.school.trim() || item.major.trim() || item.courses.trim(),
      ),
  );
}

export function JobsPanel({
  resume,
  onGoEdit,
  onAddSkill,
}: {
  resume: Resume;
  onGoEdit: () => void;
  onAddSkill: (skill: string) => void;
}) {
  const analysis = analyzeResume(resume);

  if (!hasJobInputs(resume)) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-zinc-200/80 bg-white px-6 py-16 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-[20px]">
            ⌕
          </div>
          <h2 className="mt-4 text-[18px] font-semibold tracking-tight text-zinc-900">
            先填写简历，才能推荐文章
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-zinc-500">
            填写期望岗位、个人简介、技能或任意一段经历，我们会据此分析岗位匹配度，并生成招聘网站的搜索入口。
          </p>
          <Button variant="primary" className="mt-6" onClick={onGoEdit}>
            去填写
          </Button>
        </div>
      </div>
    );
  }

  const city = resume.intent.targetCity.trim() || resume.basic.city.trim();
  const primaryKeyword =
    resume.intent.targetRole.trim() ||
    analysis.profile?.title ||
    analysis.keywords[0] ||
    resume.basic.headline.trim() ||
    resume.experiences[0]?.role.trim() ||
    resume.projects[0]?.role.trim() ||
    "";
  const alternates = analysis.keywords.filter(
    (keyword) => keyword !== primaryKeyword,
  );
  const ringColor =
    analysis.profile && analysis.score >= 80
      ? "#059669"
      : analysis.profile && analysis.score >= 60
        ? "#1d4ed8"
        : "#d97706";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-medium tracking-[0.18em] text-zinc-400">
          JOB MATCH &amp; SEARCH
        </p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-zinc-900">
          根据简历，找到该搜的岗位
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-zinc-500">
          先做本地岗位画像匹配，发现技能缺口；再生成国内主流招聘网站的精准搜索入口。
          所有分析都在你的浏览器里完成，简历不会上传。
        </p>
      </header>

      <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <ScoreRing
            value={analysis.profile ? analysis.score : analysis.completeness}
            label={analysis.profile ? "匹配度" : "完整度"}
            color={ringColor}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] tracking-widest text-zinc-400">
                目标岗位
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-600">
                {analysis.label}
              </span>
            </div>
            <h2 className="mt-1.5 truncate text-[24px] font-semibold tracking-tight text-zinc-900">
              {analysis.inferredRole}
            </h2>
            <p className="mt-1 text-[12.5px] leading-6 text-zinc-500">
              {analysis.profile ? (
                <>
                  命中核心技能 {analysis.matchedCore.length}/
                  {analysis.matchedCore.length + analysis.missingCore.length} ·
                  加分技能 {analysis.matchedBonus.length} 项 · 简历完整度{" "}
                  {analysis.completeness}%
                </>
              ) : (
                <>
                  暂未收录该岗位的技能画像，先按简历完整度评估（
                  {analysis.completeness}%）。使用更常见的岗位名称可得到技能匹配分析。
                </>
              )}
            </p>
            <div className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-zinc-900/80 transition-all"
                style={{ width: `${analysis.completeness}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <h3 className="text-[14px] font-semibold tracking-tight text-zinc-900">
            技能匹配
          </h3>
          {analysis.profile ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 text-[11px] text-zinc-400">
                  已命中核心技能（{analysis.matchedCore.length}）
                </p>
                {analysis.matchedCore.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.matchedCore.map((skill) => (
                      <SkillChip key={skill} tone="matched">
                        {skill}
                      </SkillChip>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-zinc-400">暂无命中</p>
                )}
              </div>

              <div>
                <p className="mb-2 text-[11px] text-zinc-400">
                  缺失核心技能（{analysis.missingCore.length}）
                  {analysis.missingCore.length > 0 ? (
                    <span className="ml-1 text-zinc-300">
                      · 若你掌握，点击补进简历
                    </span>
                  ) : null}
                </p>
                {analysis.missingCore.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.missingCore.map((skill) => (
                      <SkillChip
                        key={skill}
                        tone="missing"
                        onClick={() => onAddSkill(skill)}
                        title="点击添加到简历技能"
                      >
                        {skill}
                      </SkillChip>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-zinc-400">
                    核心技能已覆盖，继续保持
                  </p>
                )}
              </div>

              {analysis.matchedBonus.length > 0 ? (
                <div>
                  <p className="mb-2 text-[11px] text-zinc-400">
                    加分技能（{analysis.matchedBonus.length}）
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.matchedBonus.map((skill) => (
                      <SkillChip key={skill} tone="bonus">
                        {skill}
                      </SkillChip>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-[12px] leading-6 text-zinc-500">
              岗位画像中没有「{analysis.inferredRole}」。你可以填写更通用的岗位名称（如
              前端工程师、产品经理、数据分析师），或直接使用下方搜索入口。
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <h3 className="text-[14px] font-semibold tracking-tight text-zinc-900">
            简历优化建议
          </h3>
          <ol className="mt-4 space-y-3">
            {analysis.suggestions.map((suggestion, index) => (
              <li key={suggestion} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-medium text-zinc-500">
                  {index + 1}
                </span>
                <span className="text-[12.5px] leading-6 text-zinc-600">
                  {suggestion}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <JdMatcher resume={resume} onAddSkill={onAddSkill} />

      <CoverLetterWriter resume={resume} />

      <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight text-zinc-900">
              搜索策略
            </h3>
            <p className="mt-1 text-[12px] text-zinc-500">
              以下关键词会用于生成各招聘平台的搜索链接
            </p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] text-zinc-500">
            城市：{city || "未设置"}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {analysis.keywords.map((keyword, index) => (
            <span
              key={keyword}
              className={
                index === 0
                  ? "rounded-full bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-white"
                  : "rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[12px] text-zinc-600"
              }
            >
              {keyword}
            </span>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-semibold tracking-tight text-zinc-900">
              去这些平台搜索
            </h3>
            <p className="mt-1 text-[12px] text-zinc-500">
              点击后将在新标签页打开对应平台的搜索结果
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {JOB_BOARDS.map((board) => (
            <JobBoardCard
              key={board.id}
              board={board}
              keyword={primaryKeyword}
              city={city}
              alternates={alternates.slice(0, 3)}
            />
          ))}
        </div>
      </section>

      <p className="rounded-2xl border border-dashed border-zinc-200 bg-white/60 px-4 py-3 text-[11.5px] leading-5 text-zinc-400">
        说明：BOSS直聘、拉勾等平台没有公开的职位 API，本工具不抓取职位数据，而是根据你的简历生成精准搜索入口；职位数量、薪资与排序以平台实时结果为准。期望薪资{" "}
        {resume.intent.salaryMin || resume.intent.salaryMax
          ? `${resume.intent.salaryMin || "?"}–${resume.intent.salaryMax || "?"}K`
          : "未填写"}
        ，可在平台内进一步筛选。
      </p>
    </div>
  );
}
