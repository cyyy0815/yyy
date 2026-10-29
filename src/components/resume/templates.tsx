import {
  Children,
  Fragment,
  isValidElement,
  memo,
  type ReactNode,
} from "react";
import { resumeFontStyle } from "@/lib/fonts";
import {
  localizedResume,
  resumeLabels,
  type ResumeLabels,
} from "@/lib/language";
import {
  customItemHasContent,
  hasVisibleSection,
  isResumeSectionKey,
  isSectionVisible,
  resolveSectionLayout,
} from "@/lib/layout";
import { displayUrl, toSafeHref } from "@/lib/links";
import {
  formatSkill,
  groupSkills,
  hasSkillDetails,
  skillGroupKey,
} from "@/lib/skills";
import { accentStyle } from "@/lib/theme";
import type {
  CustomSection,
  Education,
  Resume,
  ResumeSectionKey,
  TemplateId,
} from "@/lib/types";

const FLOW_KEYS = ["summary", "experience", "projects", "custom"] as const;
const CLASSIC_KEYS = [
  "summary",
  "experience",
  "projects",
  "custom",
  "education",
  "skills",
] as const;
const ASIDE_KEYS = ["intent", "skills", "education"] as const;
const FOOTER_KEYS = ["education", "skills"] as const;
const FULL_KEYS = [
  "summary",
  "experience",
  "projects",
  "custom",
  "education",
  "skills",
  "intent",
] as const;
const SERIF_STACK =
  'var(--resume-font-body, Georgia, "Songti SC", "SimSun", "Noto Serif SC", serif)';
const SANS_STACK = "var(--resume-font-body, var(--font-sans))";

type SectionEntry = {
  node: React.ReactElement<{ "data-section"?: unknown }>;
  key: ResumeSectionKey;
  index: number;
  rank: number;
};

/**
 * 保留各模板原有的 JSX 分块，只按布局重排与隐藏。
 * 返回 Fragment 而不是新容器，避免破坏 aside 的 space-y 与打印分页。
 */
function OrderedSections({
  resume,
  keys,
  children,
}: {
  resume: Resume;
  keys: readonly ResumeSectionKey[];
  children: ReactNode;
}) {
  const layout = resolveSectionLayout(resume);
  const entries: SectionEntry[] = [];
  Children.toArray(children).forEach((node, index) => {
    if (!isValidElement<{ "data-section"?: unknown }>(node)) return;
    const key = node.props["data-section"];
    if (!isResumeSectionKey(key) || !keys.includes(key)) return;
    if (layout.hidden.includes(key)) return;
    const found = layout.order.indexOf(key);
    entries.push({
      node,
      key,
      index,
      rank: found < 0 ? layout.order.length : found,
    });
  });
  entries.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return (
    <>
      {entries.map((entry) => (
        <Fragment key={`${entry.key}-${entry.index}`}>
          {entry.node}
        </Fragment>
      ))}
    </>
  );
}

function range(start: string, end: string): string {
  return [start, end].filter(Boolean).join(" – ");
}

type ContactItem = { key: string; label: string; href: string | null };

function contactItems(resume: Resume): ContactItem[] {
  return [
    { key: "phone", label: resume.basic.phone.trim(), href: null },
    { key: "email", label: resume.basic.email.trim(), href: null },
    { key: "city", label: resume.basic.city.trim(), href: null },
    {
      key: "website",
      label: displayUrl(resume.basic.website),
      href: toSafeHref(resume.basic.website),
    },
    {
      key: "github",
      label: displayUrl(resume.basic.github),
      href: toSafeHref(resume.basic.github),
    },
  ].filter((item) => item.label.length > 0);
}

/** 网站 / GitHub / 项目 / 自定义板块链接：安全地址渲染 <a>，非法地址只显示文本。 */
function ResumeLink({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const href = toSafeHref(value);
  const label = displayUrl(value);
  if (!href) return <span className={className}>{label}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={`${className} underline decoration-current/40 underline-offset-2 hover:opacity-75`}
    >
      {label}
    </a>
  );
}

/** 纯文本模板：没有分组/熟练度时保持旧的单行展示；有则按组分行。 */
function SkillText({
  resume,
  separator,
  className,
  titleClassName = "",
}: {
  resume: Resume;
  separator: string;
  className: string;
  titleClassName?: string;
}) {
  const labels = resumeLabels(resume.language);
  if (!hasSkillDetails(resume)) {
    return <p className={className}>{resume.skills.join(separator)}</p>;
  }
  return (
    <div className={className}>
      {groupSkills(resume).map((group) => (
        <p key={skillGroupKey(group)}>
          {group.title ? (
            <span className={titleClassName}>
              {group.title}
              {labels.colon}
            </span>
          ) : null}
          {group.skills
            .map((entry) => formatSkill(entry, resume.language))
            .join(separator)}
        </p>
      ))}
    </div>
  );
}

/** 标签模板：有分组时按组显示，没有时沿用原来的扁平标签。 */
function SkillChips({
  resume,
  chipClassName,
  titleClassName = "",
}: {
  resume: Resume;
  chipClassName: string;
  titleClassName?: string;
}) {
  if (!hasSkillDetails(resume)) {
    return (
      <div className="flex flex-wrap gap-1">
        {resume.skills.map((skill) => (
          <span key={skill} className={chipClassName}>
            {skill}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {groupSkills(resume).map((group) => (
        <div key={skillGroupKey(group)}>
          {group.title ? <p className={titleClassName}>{group.title}</p> : null}
          <div className="flex flex-wrap gap-1">
            {group.skills.map((entry) => (
              <span key={entry.name} className={chipClassName}>
                {formatSkill(entry, resume.language)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactLink({ item }: { item: ContactItem }) {
  if (!item.href) return <>{item.label}</>;
  return (
    <a
      href={item.href}
      target="_blank"
      rel="noreferrer noopener"
      className="underline decoration-current/40 underline-offset-2 hover:opacity-75"
    >
      {item.label}
    </a>
  );
}

/** GPA / 排名 / 主修课程 / 荣誉，只有填写时才输出。 */
function EducationDetails({
  item,
  labels,
  className = "",
}: {
  item: Education;
  labels: ResumeLabels;
  className?: string;
}) {
  const meta = [
    item.gpa ? `GPA ${item.gpa}` : "",
    item.ranking ? `${labels.rank} ${item.ranking}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  if (!meta && !item.courses && !item.honors) return null;
  return (
    <div className={`space-y-0.5 ${className}`}>
      {meta ? <p>{meta}</p> : null}
      {item.courses ? (
        <p>
          {labels.courses}
          {labels.colon}
          {item.courses}
        </p>
      ) : null}
      {item.honors ? (
        <p>
          {labels.honors}
          {labels.colon}
          {item.honors}
        </p>
      ) : null}
    </div>
  );
}

/** 只渲染显示中且有内容的板块，空条目留给表单继续编辑。 */
function visibleCustomSections(resume: Resume): CustomSection[] {
  return resume.customSections.filter(
    (section) => section.visible && section.items.some(customItemHasContent),
  );
}

function customSectionTitle(section: CustomSection): string {
  return section.title.trim() || "其他信息";
}

function CustomItems({
  section,
  titleClassName,
  subtitleClassName,
  dateClassName,
  bodyClassName,
  linkClassName,
  gapClassName = "space-y-3",
}: {
  section: CustomSection;
  titleClassName: string;
  subtitleClassName: string;
  dateClassName: string;
  bodyClassName: string;
  linkClassName: string;
  gapClassName?: string;
}) {
  const items = section.items.filter(customItemHasContent);
  if (items.length === 0) return null;

  return (
    <div className={gapClassName}>
      {items.map((item) => {
        const description = item.description.trim();
        const multiline = /\r?\n/.test(description);
        return (
          <div key={item.id} className="break-inside-avoid">
            {item.title || item.subtitle || item.date ? (
              <div className="flex items-baseline justify-between gap-3">
                <p className={titleClassName}>
                  {item.title ? (
                    <span className="font-semibold text-zinc-900">
                      {item.title}
                    </span>
                  ) : null}
                  {item.subtitle ? (
                    <span className={subtitleClassName}>
                      {item.title ? " · " : ""}
                      {item.subtitle}
                    </span>
                  ) : null}
                </p>
                {item.date ? (
                  <span className={`shrink-0 tabular-nums ${dateClassName}`}>
                    {item.date}
                  </span>
                ) : null}
              </div>
            ) : null}
            {description ? (
              multiline ? (
                <Bullets text={description} className={bodyClassName} />
              ) : (
                <p className={bodyClassName}>{description}</p>
              )
            ) : null}
            {item.link ? (
              <p className={linkClassName}>
                <ResumeLink value={item.link} />
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** 证件照统一走 object-cover，避免不同尺寸的原图撑破版式。 */
function ResumePhoto({
  src,
  className = "",
}: {
  src: string;
  className?: string;
}) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      data-resume-photo="true"
      className={`shrink-0 object-cover ${className}`}
    />
  );
}

function Bullets({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•·]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  return (
    <ul className={`space-y-[2px] ${className}`}>
      {lines.map((line, index) => (
        <li key={index} className="flex gap-1.5">
          <span className="resume-dot mt-[0.62em] h-[3px] w-[3px] shrink-0 rounded-full opacity-60" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

/** 手动分页符：屏幕预览显示虚线，打印时隐藏并让条目从新页开始。 */
function PageBreakMarker({
  before,
  label = "分页",
}: {
  before?: boolean;
  label?: string;
}) {
  if (!before) return null;
  return (
    <div className="print-hide mb-1.5 flex items-center gap-2 text-[8px] tracking-[0.18em] text-zinc-300">
      <span className="h-px flex-1 border-t border-dashed border-zinc-200" />
      {label}
      <span className="h-px flex-1 border-t border-dashed border-zinc-200" />
    </div>
  );
}

function ContactList({
  resume,
  className = "",
}: {
  resume: Resume;
  className?: string;
}) {
  return (
    <div className={className}>
      {contactItems(resume).map((item) => (
        <div key={item.key}>
          <ContactLink item={item} />
        </div>
      ))}
    </div>
  );
}

function SalaryRange({ resume }: { resume: Resume }) {
  const { salaryMin, salaryMax } = resume.intent;
  if (!salaryMin && !salaryMax) return null;
  return (
    <span>
      {salaryMin || "?"}
      {salaryMax ? `–${salaryMax}` : ""}K
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 现代模板：主栏 + 右侧信息栏                                           */
/* ------------------------------------------------------------------ */

function AccentSectionTitle({
  children,
  className = "mb-2",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`flex items-center gap-2 break-after-avoid text-[10px] font-semibold tracking-[0.18em] resume-ink ${className}`}
    >
      {children}
      <span className="h-px flex-1 resume-rule" />
    </h2>
  );
}

function ModernTemplate({ resume }: { resume: Resume }) {
  const customSections = visibleCustomSections(resume);
  const L = resumeLabels(resume.language);
  const hasAside = hasVisibleSection(resume, ASIDE_KEYS);

  return (
    <article
      className="resume-paper bg-white text-zinc-800"
      style={{
        padding: "14mm",
        fontFamily: SANS_STACK,
        ...resumeFontStyle(resume.font),
        ...accentStyle(resume.theme.accent),
      }}
    >
      <header className="flex items-start justify-between gap-6 border-b-2 border-zinc-900 pb-5">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold leading-none tracking-tight text-zinc-900">
            {resume.basic.name || "你的姓名"}
          </h1>
          <p className="resume-ink mt-2 text-[13px] font-medium">
            {resume.basic.headline || "求职头衔"}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-4">
          <ContactList
            resume={resume}
            className="space-y-0.5 text-right text-[10.5px] leading-[1.6] text-zinc-500"
          />
          <ResumePhoto
            src={resume.basic.photo}
            className="h-[24mm] w-[24mm] rounded-xl ring-1 ring-zinc-200"
          />
        </div>
      </header>

      <div
        className={`resume-columns mt-6 grid gap-8 ${
          hasAside ? "resume-aside-grid grid-cols-[1fr_56mm]" : "grid-cols-1"
        }`}
      >
        {hasAside ? (
          <aside className="col-start-2 row-start-1 space-y-5 border-l border-zinc-200 pl-6">
            {isSectionVisible(resume, "intent") ? (
              <section>
                <AccentSectionTitle>{L.intent}</AccentSectionTitle>
                <div className="space-y-1 text-[10.5px] leading-[1.6] text-zinc-600">
                  {resume.intent.targetRole ? (
                    <p className="text-[11.5px] font-medium text-zinc-800">
                      {resume.intent.targetRole}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-x-2 text-zinc-500">
                    {resume.intent.targetCity ? (
                      <span>{resume.intent.targetCity}</span>
                    ) : null}
                    {resume.intent.jobType ? <span>{resume.intent.jobType}</span> : null}
                    {resume.intent.experience ? (
                      <span>{resume.intent.experience}</span>
                    ) : null}
                    <SalaryRange resume={resume} />
                  </div>
                </div>
              </section>
            ) : null}

            {isSectionVisible(resume, "skills") ? (
              <section>
                <AccentSectionTitle>{L.skills}</AccentSectionTitle>
                <SkillChips
                  resume={resume}
                  chipClassName="resume-soft rounded px-1.5 py-0.5 text-[9.5px] leading-[1.5] text-zinc-600"
                  titleClassName="mb-0.5 text-[9px] font-medium text-zinc-400"
                />
              </section>
            ) : null}

            {isSectionVisible(resume, "education") ? (
              <section>
                <AccentSectionTitle>{L.education}</AccentSectionTitle>
                <div className="space-y-2.5">
                  {resume.educations.map((item) => (
                    <div key={item.id} className="break-inside-avoid">
                      <p className="text-[11px] font-medium leading-snug text-zinc-800">
                        {item.school || "学校名称"}
                      </p>
                      <p className="text-[10px] leading-[1.6] text-zinc-500">
                        {[item.major, item.degree].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-[9.5px] tabular-nums text-zinc-400">
                        {range(item.start, item.end)}
                      </p>
                      <EducationDetails
                        item={item}
                        labels={L}
                        className="pt-0.5 text-[9px] leading-[1.55] text-zinc-500"
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        ) : null}

        <div className="resume-main col-start-1 row-start-1 min-w-0">
          <OrderedSections resume={resume} keys={FLOW_KEYS}>
          {resume.basic.summary ? (
            <section data-section="summary" className="mb-5">
              <AccentSectionTitle>{L.summary}</AccentSectionTitle>
              <p className="text-[11.5px] leading-[1.75] text-zinc-600">
                {resume.basic.summary}
              </p>
            </section>
          ) : null}

          {resume.experiences.length > 0 ? (
            <section data-section="experience" className="mb-5">
              <AccentSectionTitle>{L.experience}</AccentSectionTitle>
              <div className="space-y-3.5">
                {resume.experiences.map((item, index) => (
                  <div
                    key={item.id}
                    className={`break-inside-avoid ${
                      index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                    }`}
                  >
                    <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[12.5px] leading-snug">
                        <span className="font-semibold text-zinc-900">
                          {item.role || "职位"}
                        </span>
                        {item.company ? (
                          <span className="text-zinc-600"> · {item.company}</span>
                        ) : null}
                      </p>
                      <span className="shrink-0 text-[10px] tabular-nums text-zinc-400">
                        {range(item.start, item.end)}
                      </span>
                    </div>
                    <Bullets
                      text={item.description}
                      className="mt-1.5 text-[11.5px] leading-[1.7] text-zinc-600"
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {resume.projects.length > 0 ? (
            <section data-section="projects" className="mb-5">
              <AccentSectionTitle>{L.projects}</AccentSectionTitle>
              <div className="space-y-3">
                {resume.projects.map((item, index) => (
                  <div
                    key={item.id}
                    className={`break-inside-avoid ${
                      index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                    }`}
                  >
                    <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[12.5px] leading-snug">
                        <span className="font-semibold text-zinc-900">
                          {item.name || "项目名称"}
                        </span>
                        {item.role ? (
                          <span className="text-zinc-500"> · {item.role}</span>
                        ) : null}
                      </p>
                      {item.link || item.start || item.end ? (
                        <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                          {range(item.start, item.end) ? (
                            <span className="text-[9.5px] tabular-nums text-zinc-400">
                              {range(item.start, item.end)}
                            </span>
                          ) : null}
                          {item.link ? (
                            <span className="max-w-[50mm] break-all text-[9px] text-zinc-400">
                              <ResumeLink value={item.link} />
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11.5px] leading-[1.7] text-zinc-600">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {customSections.map((section) => (
            <section
              key={section.id}
              data-section="custom"
              className="mb-5"
            >
              <AccentSectionTitle>
                {customSectionTitle(section)}
              </AccentSectionTitle>
              <CustomItems
                section={section}
                titleClassName="text-[12px] leading-snug"
                subtitleClassName="text-zinc-500"
                dateClassName="text-[9.5px] text-zinc-400"
                bodyClassName="mt-1 text-[11px] leading-[1.7] text-zinc-600"
                linkClassName="mt-0.5 text-[9px] text-zinc-400"
              />
            </section>
          ))}
          </OrderedSections>

          {!hasVisibleSection(resume, FLOW_KEYS) ? (
            <p className="py-10 text-center text-[12px] text-zinc-300">
              {L.emptyPreview}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* 经典模板：居中页眉 + 单栏                                             */
/* ------------------------------------------------------------------ */

function ClassicSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2.5 flex items-center gap-3 break-after-avoid">
      <span className="resume-ink text-[11.5px] font-semibold tracking-[0.22em]">
        {children}
      </span>
      <span className="h-px flex-1 bg-zinc-300" />
    </h2>
  );
}

function ClassicTemplate({ resume }: { resume: Resume }) {
  const customSections = visibleCustomSections(resume);
  const L = resumeLabels(resume.language);
  const contact = contactItems(resume);

  return (
    <article
      className="resume-paper bg-white text-zinc-800"
      style={{
        padding: "16mm",
        fontFamily: SERIF_STACK,
        ...resumeFontStyle(resume.font),
        ...accentStyle(resume.theme.accent),
      }}
    >
      <header className="border-b border-zinc-300 pb-4">
        <div className="flex items-center gap-5">
          {resume.basic.photo ? (
            <span aria-hidden="true" className="w-[24mm] shrink-0" />
          ) : null}
          <div className="min-w-0 flex-1 text-center">
            <h1 className="text-[28px] font-semibold tracking-[0.12em] text-zinc-900">
              {resume.basic.name || "你的姓名"}
            </h1>
            <p className="mt-1 text-[12px] tracking-[0.16em] text-zinc-600">
              {resume.basic.headline || "求职头衔"}
            </p>
            {contact.length > 0 ? (
              <p className="mt-2.5 text-[9.5px] leading-relaxed tracking-wide text-zinc-500">
                {contact.map((item, index) => (
                  <span key={item.key}>
                    {index > 0 ? "   ｜   " : ""}
                    <ContactLink item={item} />
                  </span>
                ))}
              </p>
            ) : null}
          </div>
          <ResumePhoto
            src={resume.basic.photo}
            className="h-[24mm] w-[24mm] rounded-sm ring-1 ring-zinc-200"
          />
        </div>
      </header>

      <OrderedSections resume={resume} keys={CLASSIC_KEYS}>
      {resume.basic.summary ? (
        <section data-section="summary" className="mt-5">
          <ClassicSectionTitle>{L.summary}</ClassicSectionTitle>
          <p className="text-[11px] leading-[1.8] text-zinc-600">
            {resume.basic.summary}
          </p>
        </section>
      ) : null}

      {resume.experiences.length > 0 ? (
        <section data-section="experience" className="mt-5">
          <ClassicSectionTitle>{L.experience}</ClassicSectionTitle>
          <div className="space-y-4">
            {resume.experiences.map((item, index) => (
              <div
                key={item.id}
                className={`break-inside-avoid ${
                  index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                }`}
              >
                <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[11.5px]">
                    <span className="font-semibold text-zinc-900">
                      {item.company || "公司名称"}
                    </span>
                    {item.role ? (
                      <span className="text-zinc-600"> / {item.role}</span>
                    ) : null}
                  </p>
                  <span className="shrink-0 text-[9.5px] tabular-nums text-zinc-400">
                    {range(item.start, item.end)}
                  </span>
                </div>
                <Bullets
                  text={item.description}
                  className="mt-1.5 text-[10.5px] leading-[1.8] text-zinc-600"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {resume.projects.length > 0 ? (
        <section data-section="projects" className="mt-5">
          <ClassicSectionTitle>{L.projects}</ClassicSectionTitle>
          <div className="space-y-3.5">
            {resume.projects.map((item, index) => (
              <div
                key={item.id}
                className={`break-inside-avoid ${
                  index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                }`}
              >
                <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[11.5px]">
                    <span className="font-semibold text-zinc-900">
                      {item.name || "项目名称"}
                    </span>
                    {item.role ? (
                      <span className="text-zinc-600"> / {item.role}</span>
                    ) : null}
                  </p>
                  {item.link || item.start || item.end ? (
                    <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                      {range(item.start, item.end) ? (
                        <span className="text-[9px] tabular-nums text-zinc-400">
                          {range(item.start, item.end)}
                        </span>
                      ) : null}
                      {item.link ? (
                        <span className="max-w-[50mm] break-all text-[9px] text-zinc-400">
                          <ResumeLink value={item.link} />
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <p className="mt-1 text-[10.5px] leading-[1.8] text-zinc-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {customSections.map((section) => (
        <section key={section.id} data-section="custom" className="mt-5">
          <ClassicSectionTitle>
            {customSectionTitle(section)}
          </ClassicSectionTitle>
          <CustomItems
            section={section}
            titleClassName="text-[11.5px] leading-snug"
            subtitleClassName="text-zinc-600"
            dateClassName="text-[9.5px] text-zinc-400"
            bodyClassName="mt-1 text-[10.5px] leading-[1.8] text-zinc-600"
            linkClassName="mt-0.5 text-[9px] text-zinc-400"
            gapClassName="space-y-3"
          />
        </section>
      ))}

      {resume.educations.length > 0 ? (
        <section data-section="education" className="mt-5">
          <ClassicSectionTitle>{L.education}</ClassicSectionTitle>
          <div className="space-y-2">
            {resume.educations.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[11px] text-zinc-700">
                    <span className="font-semibold text-zinc-900">
                      {item.school || "学校名称"}
                    </span>
                    <span className="text-zinc-500">
                      {[item.major, item.degree].filter(Boolean).length > 0
                        ? ` ｜ ${[item.major, item.degree].filter(Boolean).join(" · ")}`
                        : ""}
                    </span>
                  </p>
                  <span className="shrink-0 text-[9.5px] tabular-nums text-zinc-400">
                    {range(item.start, item.end)}
                  </span>
                </div>
                <EducationDetails
                  item={item}
                  labels={L}
                  className="mt-0.5 text-[9.5px] leading-[1.65] text-zinc-500"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {resume.skills.length > 0 ? (
        <section data-section="skills" className="mt-5">
          <ClassicSectionTitle>{L.skillsProfessional}</ClassicSectionTitle>
          <SkillText
            resume={resume}
            separator="、"
            className="text-[10.5px] leading-[1.8] text-zinc-600"
            titleClassName="font-semibold text-zinc-700"
          />
        </section>
      ) : null}
      </OrderedSections>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* 紧凑模板：信息密度优先                                               */
/* ------------------------------------------------------------------ */

function CompactSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1.5 flex items-center gap-1.5 break-after-avoid text-[10px] font-bold tracking-[0.14em] text-zinc-900">
      <span className="resume-accent-bg h-2.5 w-[3px] rounded-sm" />
      {children}
    </h2>
  );
}

function CompactTemplate({ resume }: { resume: Resume }) {
  const customSections = visibleCustomSections(resume);
  const L = resumeLabels(resume.language);
  const contact = contactItems(resume);

  return (
    <article
      className="resume-paper bg-white text-zinc-800"
      style={{
        padding: "12mm",
        fontFamily: SANS_STACK,
        fontSize: "10.5px",
        ...resumeFontStyle(resume.font),
        ...accentStyle(resume.theme.accent),
      }}
    >
      <header className="flex items-start justify-between gap-5 border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-[23px] font-bold leading-none tracking-tight text-zinc-900">
            {resume.basic.name || "你的姓名"}
          </h1>
          <p className="resume-ink mt-1.5 text-[11px] font-medium">
            {resume.basic.headline || "求职头衔"}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-3">
          <div className="max-w-[82mm] text-right text-[9px] leading-[1.6] text-zinc-500">
            {contact.map((item, index) => (
              <span key={item.key}>
                {index > 0 ? "  ·  " : ""}
                <ContactLink item={item} />
              </span>
            ))}
          </div>
          <ResumePhoto
            src={resume.basic.photo}
            className="h-[18mm] w-[18mm] rounded-md ring-1 ring-zinc-200"
          />
        </div>
      </header>

      <OrderedSections resume={resume} keys={FLOW_KEYS}>
      {resume.basic.summary ? (
        <section data-section="summary" className="mt-3">
          <CompactSectionTitle>{L.summary}</CompactSectionTitle>
          <p className="text-[10px] leading-[1.65] text-zinc-600">
            {resume.basic.summary}
          </p>
        </section>
      ) : null}

      {resume.experiences.length > 0 ? (
        <section data-section="experience" className="mt-3">
          <CompactSectionTitle>{L.experience}</CompactSectionTitle>
          <div className="space-y-2.5">
            {resume.experiences.map((item, index) => (
              <div
                key={item.id}
                className={`break-inside-avoid ${
                  index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                }`}
              >
                <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[10.5px]">
                    <span className="font-semibold text-zinc-900">
                      {item.company || "公司名称"}
                    </span>
                    {item.role ? (
                      <span className="text-zinc-600"> ｜ {item.role}</span>
                    ) : null}
                  </p>
                  <span className="shrink-0 text-[9px] tabular-nums text-zinc-400">
                    {range(item.start, item.end)}
                  </span>
                </div>
                <Bullets
                  text={item.description}
                  className="mt-1 text-[9.5px] leading-[1.65] text-zinc-600"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {resume.projects.length > 0 ? (
        <section data-section="projects" className="mt-3">
          <CompactSectionTitle>{L.projects}</CompactSectionTitle>
          <div className="space-y-2">
            {resume.projects.map((item, index) => (
              <div
                key={item.id}
                className={`break-inside-avoid ${
                  index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                }`}
              >
                <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[10.5px]">
                    <span className="font-semibold text-zinc-900">
                      {item.name || "项目名称"}
                    </span>
                    {item.role ? (
                      <span className="text-zinc-500"> ｜ {item.role}</span>
                    ) : null}
                  </p>
                  {item.link || item.start || item.end ? (
                    <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                      {range(item.start, item.end) ? (
                        <span className="text-[8.5px] tabular-nums text-zinc-400">
                          {range(item.start, item.end)}
                        </span>
                      ) : null}
                      {item.link ? (
                        <span className="max-w-[45mm] break-all text-[8.5px] text-zinc-400">
                          <ResumeLink value={item.link} />
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[9.5px] leading-[1.65] text-zinc-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {customSections.map((section) => (
        <section key={section.id} data-section="custom" className="mt-3">
          <CompactSectionTitle>
            {customSectionTitle(section)}
          </CompactSectionTitle>
          <CustomItems
            section={section}
            titleClassName="text-[10.5px] leading-snug"
            subtitleClassName="text-zinc-500"
            dateClassName="text-[8.5px] text-zinc-400"
            bodyClassName="mt-0.5 text-[9.5px] leading-[1.65] text-zinc-600"
            linkClassName="mt-0.5 text-[8.5px] text-zinc-400"
            gapClassName="space-y-2"
          />
        </section>
      ))}
      </OrderedSections>

      {isSectionVisible(resume, "education") ||
      isSectionVisible(resume, "skills") ? (
      <div className="mt-3 grid grid-cols-[1fr_1fr] gap-x-6">
        <OrderedSections resume={resume} keys={FOOTER_KEYS}>
        {resume.educations.length > 0 ? (
          <section data-section="education">
            <CompactSectionTitle>{L.education}</CompactSectionTitle>
            <div className="space-y-1">
              {resume.educations.map((item) => (
                <div key={item.id} className="break-inside-avoid">
                  <p className="text-[10px] font-medium text-zinc-800">
                    {item.school || "学校名称"}
                    <span className="ml-1 font-normal text-zinc-400">
                      {range(item.start, item.end)}
                    </span>
                  </p>
                  <p className="text-[9px] text-zinc-500">
                    {[item.major, item.degree].filter(Boolean).join(" · ")}
                  </p>
                  <EducationDetails
                    item={item}
                    labels={L}
                    className="text-[8.5px] leading-[1.5] text-zinc-500"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {resume.skills.length > 0 ? (
          <section data-section="skills">
            <CompactSectionTitle>{L.skillsProfessional}</CompactSectionTitle>
            <SkillText
              resume={resume}
              separator=" · "
              className="text-[9.5px] leading-[1.7] text-zinc-600"
              titleClassName="font-semibold text-zinc-700"
            />
          </section>
        ) : null}
        </OrderedSections>
      </div>
      ) : null}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* 侧栏模板：左侧深色信息栏 + 右侧主栏                                   */
/* ------------------------------------------------------------------ */

function SidebarHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 break-after-avoid border-b border-white/15 pb-1 text-[9px] font-semibold tracking-[0.2em] text-white/55">
      {children}
    </h2>
  );
}

function SidebarTemplate({ resume }: { resume: Resume }) {
  const customSections = visibleCustomSections(resume);
  const L = resumeLabels(resume.language);
  const contact = contactItems(resume);

  return (
    <article
      className="resume-paper resume-paper-sidebar flex min-h-[289mm] bg-white text-zinc-800"
      style={{
        fontFamily: SANS_STACK,
        ...resumeFontStyle(resume.font),
        ...accentStyle(resume.theme.accent),
      }}
    >
      <aside className="resume-side w-[62mm] shrink-0 px-[8mm] py-[12mm]">
        <header>
          <ResumePhoto
            src={resume.basic.photo}
            className="mb-4 h-[30mm] w-[30mm] rounded-full ring-4 ring-white/10"
          />
          <h1 className="text-[26px] font-semibold leading-[1.15] tracking-tight text-white">
            {resume.basic.name || "你的姓名"}
          </h1>
          <p className="mt-1.5 text-[11.5px] font-medium text-white/70">
            {resume.basic.headline || "求职头衔"}
          </p>
        </header>

        {contact.length > 0 ? (
          <section className="mt-6">
            <SidebarHeading>联系方式</SidebarHeading>
            <div className="space-y-1 text-[9.5px] leading-[1.6] text-white/75">
              {contact.map((item) => (
                <p key={item.key} className="break-all">
                  <ContactLink item={item} />
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {isSectionVisible(resume, "intent") ? (
          <section className="mt-5">
            <SidebarHeading>{L.intent}</SidebarHeading>
            <div className="space-y-1 text-[9.5px] leading-[1.6] text-white/75">
              {resume.intent.targetRole ? (
                <p className="text-[11px] font-medium text-white">
                  {resume.intent.targetRole}
                </p>
              ) : null}
              <p>
                {[
                  resume.intent.targetCity,
                  resume.intent.jobType,
                  resume.intent.experience,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {resume.intent.salaryMin || resume.intent.salaryMax ? (
                <p>
                  {resume.intent.salaryMin || "?"}
                  {resume.intent.salaryMax ? `–${resume.intent.salaryMax}` : ""}K /{" "}
                  {L.month}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {isSectionVisible(resume, "skills") ? (
          <section className="mt-5">
            <SidebarHeading>{L.skills}</SidebarHeading>
            <SkillChips
              resume={resume}
              chipClassName="rounded bg-white/10 px-1.5 py-0.5 text-[9px] leading-[1.5] text-white/80"
              titleClassName="mb-1 text-[8.5px] font-medium tracking-wide text-white/45"
            />
          </section>
        ) : null}

        {isSectionVisible(resume, "education") ? (
          <section className="mt-5">
            <SidebarHeading>{L.education}</SidebarHeading>
            <div className="space-y-2.5">
              {resume.educations.map((item) => (
                <div key={item.id} className="break-inside-avoid">
                  <p className="text-[10px] font-medium leading-snug text-white">
                    {item.school || "学校名称"}
                  </p>
                  <p className="text-[9px] leading-[1.6] text-white/65">
                    {[item.major, item.degree].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-[8.5px] tabular-nums text-white/50">
                    {range(item.start, item.end)}
                  </p>
                  <EducationDetails
                    item={item}
                    labels={L}
                    className="text-[8.5px] leading-[1.6] text-white/55"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </aside>

      <div className="min-w-0 flex-1 px-[10mm] py-[12mm]">
        <OrderedSections resume={resume} keys={FLOW_KEYS}>
        {resume.basic.summary ? (
          <section data-section="summary" className="mb-5">
            <AccentSectionTitle>{L.summary}</AccentSectionTitle>
            <p className="text-[11.5px] leading-[1.75] text-zinc-600">
              {resume.basic.summary}
            </p>
          </section>
        ) : null}

        {resume.experiences.length > 0 ? (
          <section data-section="experience" className="mb-5">
            <AccentSectionTitle>{L.experience}</AccentSectionTitle>
            <div className="space-y-3.5">
              {resume.experiences.map((item, index) => (
                <div
                  key={item.id}
                  className={`break-inside-avoid ${
                    index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                  }`}
                >
                  <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[12.5px] leading-snug">
                      <span className="font-semibold text-zinc-900">
                        {item.role || "职位"}
                      </span>
                      {item.company ? (
                        <span className="text-zinc-600"> · {item.company}</span>
                      ) : null}
                    </p>
                    <span className="shrink-0 text-[10px] tabular-nums text-zinc-400">
                      {range(item.start, item.end)}
                    </span>
                  </div>
                  <Bullets
                    text={item.description}
                    className="mt-1.5 text-[11.5px] leading-[1.7] text-zinc-600"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {resume.projects.length > 0 ? (
          <section data-section="projects" className="mb-5">
            <AccentSectionTitle>{L.projects}</AccentSectionTitle>
            <div className="space-y-3">
              {resume.projects.map((item, index) => (
                <div
                  key={item.id}
                  className={`break-inside-avoid ${
                    index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                  }`}
                >
                  <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[12.5px] leading-snug">
                      <span className="font-semibold text-zinc-900">
                        {item.name || "项目名称"}
                      </span>
                      {item.role ? (
                        <span className="text-zinc-500"> · {item.role}</span>
                      ) : null}
                    </p>
                    {item.link || item.start || item.end ? (
                      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                        {range(item.start, item.end) ? (
                          <span className="text-[9.5px] tabular-nums text-zinc-400">
                            {range(item.start, item.end)}
                          </span>
                        ) : null}
                        {item.link ? (
                          <span className="max-w-[50mm] break-all text-[9px] text-zinc-400">
                            <ResumeLink value={item.link} />
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11.5px] leading-[1.7] text-zinc-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {customSections.map((section) => (
          <section
            key={section.id}
            data-section="custom"
            className="mb-5"
          >
            <AccentSectionTitle>
              {customSectionTitle(section)}
            </AccentSectionTitle>
            <CustomItems
              section={section}
              titleClassName="text-[12px] leading-snug"
              subtitleClassName="text-zinc-500"
              dateClassName="text-[9.5px] text-zinc-400"
              bodyClassName="mt-1 text-[11px] leading-[1.7] text-zinc-600"
              linkClassName="mt-0.5 text-[9px] text-zinc-400"
            />
          </section>
        ))}
        </OrderedSections>

        {!hasVisibleSection(resume, FLOW_KEYS) ? (
          <p className="py-10 text-center text-[12px] text-zinc-300">
            {L.emptyPreview}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* 时间轴模板：单栏 + 经历时间线                                          */
/* ------------------------------------------------------------------ */

function TimelineTemplate({ resume }: { resume: Resume }) {
  const customSections = visibleCustomSections(resume);
  const L = resumeLabels(resume.language);
  const contact = contactItems(resume);

  return (
    <article
      className="resume-paper bg-white px-[15mm] py-[13mm] text-zinc-800"
      style={{
        fontFamily: SANS_STACK,
        ...resumeFontStyle(resume.font),
        ...accentStyle(resume.theme.accent),
      }}
    >
      <header className="flex items-end justify-between gap-6 border-b-2 border-zinc-900 pb-4">
        <div className="min-w-0">
          <h1 className="text-[29px] font-semibold leading-none tracking-tight text-zinc-900">
            {resume.basic.name || "你的姓名"}
          </h1>
          <p className="resume-ink mt-2 text-[12px] font-medium">
            {resume.basic.headline || "求职头衔"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-5">
          <div className="space-y-0.5 text-right text-[9.5px] leading-[1.6] text-zinc-500">
            {contact.map((item) => (
              <div key={item.key} className="break-all">
                <ContactLink item={item} />
              </div>
            ))}
          </div>
          <ResumePhoto
            src={resume.basic.photo}
            className="h-[22mm] w-[22mm] rounded-full ring-2 ring-zinc-100"
          />
        </div>
      </header>

      <OrderedSections resume={resume} keys={FLOW_KEYS}>
      {resume.basic.summary ? (
        <section data-section="summary" className="mt-5">
          <AccentSectionTitle>{L.summary}</AccentSectionTitle>
          <p className="text-[11.5px] leading-[1.75] text-zinc-600">
            {resume.basic.summary}
          </p>
        </section>
      ) : null}

      {resume.experiences.length > 0 ? (
        <section data-section="experience" className="mt-5">
          <AccentSectionTitle className="mb-2.5">{L.experience}</AccentSectionTitle>
          <div className="space-y-3.5">
            {resume.experiences.map((item, index) => (
              <div
                key={item.id}
                className={`relative break-inside-avoid pl-5 ${
                  index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                }`}
              >
                <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                <span className="resume-dot absolute left-0 top-[5px] h-[7px] w-[7px] rounded-full ring-2 ring-white" />
                {index < resume.experiences.length - 1 ? (
                  <span className="resume-timeline-line absolute left-[3px] top-[16px] h-[calc(100%_+_14px)] w-px" />
                ) : null}
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[12px] leading-snug">
                    <span className="font-semibold text-zinc-900">
                      {item.role || "职位"}
                    </span>
                    {item.company ? (
                      <span className="text-zinc-600"> · {item.company}</span>
                    ) : null}
                  </p>
                  <span className="shrink-0 text-[9.5px] tabular-nums text-zinc-400">
                    {range(item.start, item.end)}
                  </span>
                </div>
                <Bullets
                  text={item.description}
                  className="mt-1.5 text-[11px] leading-[1.7] text-zinc-600"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {resume.projects.length > 0 ? (
        <section data-section="projects" className="mt-5">
          <AccentSectionTitle className="mb-2.5">{L.projects}</AccentSectionTitle>
          <div className="space-y-3">
            {resume.projects.map((item, index) => (
              <div
                key={item.id}
                className={`relative break-inside-avoid pl-5 ${
                  index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                }`}
              >
                <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                <span className="resume-dot absolute left-0 top-[5px] h-[7px] w-[7px] rounded-full ring-2 ring-white" />
                {index < resume.projects.length - 1 ? (
                  <span className="resume-timeline-line absolute left-[3px] top-[16px] h-[calc(100%_+_12px)] w-px" />
                ) : null}
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[12px] leading-snug">
                    <span className="font-semibold text-zinc-900">
                      {item.name || "项目名称"}
                    </span>
                    {item.role ? (
                      <span className="text-zinc-500"> · {item.role}</span>
                    ) : null}
                  </p>
                  {item.link || item.start || item.end ? (
                    <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                      {range(item.start, item.end) ? (
                        <span className="text-[9px] tabular-nums text-zinc-400">
                          {range(item.start, item.end)}
                        </span>
                      ) : null}
                      {item.link ? (
                        <span className="max-w-[50mm] break-all text-[9px] text-zinc-400">
                          <ResumeLink value={item.link} />
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] leading-[1.7] text-zinc-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {customSections.map((section) => (
        <section key={section.id} data-section="custom" className="mt-5">
          <AccentSectionTitle className="mb-2.5">
            {customSectionTitle(section)}
          </AccentSectionTitle>
          <CustomItems
            section={section}
            titleClassName="text-[12px] leading-snug"
            subtitleClassName="text-zinc-500"
            dateClassName="text-[9.5px] text-zinc-400"
            bodyClassName="mt-1 text-[11px] leading-[1.7] text-zinc-600"
            linkClassName="mt-0.5 text-[9px] text-zinc-400"
          />
        </section>
      ))}
      </OrderedSections>

      {isSectionVisible(resume, "education") ||
      isSectionVisible(resume, "skills") ? (
        <div className="mt-5 grid grid-cols-[1.35fr_1fr] gap-x-8">
          <OrderedSections resume={resume} keys={FOOTER_KEYS}>
          {resume.educations.length > 0 ? (
            <section data-section="education">
              <AccentSectionTitle>{L.education}</AccentSectionTitle>
              <div className="space-y-2">
                {resume.educations.map((item) => (
                  <div key={item.id} className="break-inside-avoid">
                    <p className="text-[10.5px] text-zinc-700">
                      <span className="font-semibold text-zinc-900">
                        {item.school || "学校名称"}
                      </span>
                      {[item.major, item.degree].filter(Boolean).length > 0 ? (
                        <span className="text-zinc-500">
                          {" ｜ "}
                          {[item.major, item.degree].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[9px] tabular-nums text-zinc-400">
                      {range(item.start, item.end)}
                    </p>
                    <EducationDetails
                      item={item}
                      labels={L}
                      className="mt-0.5 text-[9px] leading-[1.6] text-zinc-500"
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {resume.skills.length > 0 ? (
            <section data-section="skills">
              <AccentSectionTitle>{L.skillsProfessional}</AccentSectionTitle>
              <SkillChips
                resume={resume}
                chipClassName="resume-soft rounded px-1.5 py-0.5 text-[9.5px] leading-[1.5] text-zinc-600"
                titleClassName="mb-0.5 text-[9px] font-medium text-zinc-400"
              />
            </section>
          ) : null}
          </OrderedSections>
        </div>
      ) : null}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* 极简模板：单栏留白，弱化装饰                                           */
/* ------------------------------------------------------------------ */

function MinimalSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 break-after-avoid text-[9.5px] font-semibold tracking-[0.26em] resume-ink">
      {children}
    </h2>
  );
}

function MinimalTemplate({ resume }: { resume: Resume }) {
  const customSections = visibleCustomSections(resume);
  const L = resumeLabels(resume.language);
  const contact = contactItems(resume);

  return (
    <article
      className="resume-paper bg-white text-zinc-800"
      style={{
        padding: "15mm 16mm",
        fontFamily: SANS_STACK,
        ...resumeFontStyle(resume.font),
        ...accentStyle(resume.theme.accent),
      }}
    >
      <header>
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-[31px] font-semibold leading-none tracking-tight text-zinc-900">
              {resume.basic.name || "你的姓名"}
            </h1>
            <p className="resume-ink mt-2.5 text-[12.5px] font-medium">
              {resume.basic.headline || "求职头衔"}
            </p>
          </div>
          <ResumePhoto
            src={resume.basic.photo}
            className="h-[22mm] w-[22mm] rounded-full ring-1 ring-zinc-200"
          />
        </div>
        {contact.length > 0 ? (
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9.5px] leading-[1.7] text-zinc-500">
            {contact.map((item, index) => (
              <span key={item.key} className="flex items-center gap-2">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-zinc-300">
                    ·
                  </span>
                ) : null}
                <ContactLink item={item} />
              </span>
            ))}
          </p>
        ) : null}
      </header>

      <div className="mt-5 border-t border-zinc-300" />

      <OrderedSections resume={resume} keys={FULL_KEYS}>
        {resume.basic.summary ? (
          <section data-section="summary" className="mt-4">
            <MinimalSectionTitle>{L.summary}</MinimalSectionTitle>
            <p className="text-[11px] leading-[1.8] text-zinc-600">
              {resume.basic.summary}
            </p>
          </section>
        ) : null}

        {resume.experiences.length > 0 ? (
          <section data-section="experience" className="mt-4">
            <MinimalSectionTitle>{L.experience}</MinimalSectionTitle>
            <div className="space-y-3">
              {resume.experiences.map((item, index) => (
                <div
                  key={item.id}
                  className={`break-inside-avoid ${
                    index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                  }`}
                >
                  <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[11.5px] leading-snug">
                      <span className="font-semibold text-zinc-900">
                        {item.role || "职位"}
                      </span>
                      {item.company ? (
                        <span className="text-zinc-500"> · {item.company}</span>
                      ) : null}
                    </p>
                    <span className="shrink-0 text-[9.5px] tabular-nums text-zinc-400">
                      {range(item.start, item.end)}
                    </span>
                  </div>
                  <Bullets
                    text={item.description}
                    className="mt-1 text-[10.5px] leading-[1.8] text-zinc-600"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {resume.projects.length > 0 ? (
          <section data-section="projects" className="mt-4">
            <MinimalSectionTitle>{L.projects}</MinimalSectionTitle>
            <div className="space-y-3">
              {resume.projects.map((item, index) => (
                <div
                  key={item.id}
                  className={`break-inside-avoid ${
                    index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                  }`}
                >
                  <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[11.5px] leading-snug">
                      <span className="font-semibold text-zinc-900">
                        {item.name || "项目名称"}
                      </span>
                      {item.role ? (
                        <span className="text-zinc-500"> · {item.role}</span>
                      ) : null}
                    </p>
                    {item.link || item.start || item.end ? (
                      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                        {range(item.start, item.end) ? (
                          <span className="text-[9px] tabular-nums text-zinc-400">
                            {range(item.start, item.end)}
                          </span>
                        ) : null}
                        {item.link ? (
                          <span className="max-w-[50mm] break-all text-[9px] text-zinc-400">
                            <ResumeLink value={item.link} />
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <Bullets
                    text={item.description}
                    className="mt-1 text-[10.5px] leading-[1.8] text-zinc-600"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {customSections.map((section) => (
          <section key={section.id} data-section="custom" className="mt-4">
            <MinimalSectionTitle>
              {customSectionTitle(section)}
            </MinimalSectionTitle>
            <CustomItems
              section={section}
              titleClassName="text-[11px] leading-snug"
              subtitleClassName="text-zinc-500"
              dateClassName="text-[9px] text-zinc-400"
              bodyClassName="mt-0.5 text-[10.5px] leading-[1.8] text-zinc-600"
              linkClassName="mt-0.5 text-[9px] text-zinc-400"
            />
          </section>
        ))}

        {resume.educations.length > 0 ? (
          <section data-section="education" className="mt-4">
            <MinimalSectionTitle>{L.education}</MinimalSectionTitle>
            <div className="space-y-2">
              {resume.educations.map((item) => (
                <div key={item.id} className="break-inside-avoid">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[11px] text-zinc-700">
                      <span className="font-semibold text-zinc-900">
                        {item.school || "学校名称"}
                      </span>
                      {[item.major, item.degree].filter(Boolean).length > 0 ? (
                        <span className="text-zinc-500">
                          {" · "}
                          {[item.major, item.degree].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                    </p>
                    <span className="shrink-0 text-[9.5px] tabular-nums text-zinc-400">
                      {range(item.start, item.end)}
                    </span>
                  </div>
                  <EducationDetails
                    item={item}
                    labels={L}
                    className="mt-0.5 text-[9.5px] leading-[1.7] text-zinc-500"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {resume.skills.length > 0 ? (
          <section data-section="skills" className="mt-4">
            <MinimalSectionTitle>{L.skillsProfessional}</MinimalSectionTitle>
            <SkillText
              resume={resume}
              separator=" · "
              className="text-[10.5px] leading-[1.8] text-zinc-600"
              titleClassName="font-semibold text-zinc-700"
            />
          </section>
        ) : null}

        {isSectionVisible(resume, "intent") ? (
          <section data-section="intent" className="mt-4">
            <MinimalSectionTitle>{L.intent}</MinimalSectionTitle>
            <p className="text-[10.5px] leading-[1.8] text-zinc-600">
              {[
                resume.intent.targetRole,
                resume.intent.targetCity,
                resume.intent.jobType,
                resume.intent.experience,
              ]
                .filter(Boolean)
                .join(" · ")}
              {resume.intent.salaryMin || resume.intent.salaryMax ? (
                <>
                  {" · "}
                  <SalaryRange resume={resume} /> / {L.month}
                </>
              ) : null}
            </p>
          </section>
        ) : null}
      </OrderedSections>

      {!hasVisibleSection(resume, FULL_KEYS) ? (
        <p className="py-10 text-center text-[12px] text-zinc-300">
          {L.emptyPreview}
        </p>
      ) : null}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* 学术模板：居中抬头、双线分隔，适合科研 / 教育背景                     */
/* ------------------------------------------------------------------ */

function AcademicSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2.5 break-after-avoid">
      <span className="text-[10px] font-semibold tracking-[0.22em] text-zinc-900">
        {children}
      </span>
      <span className="mt-1 block border-t border-zinc-500" />
      <span className="mt-[2px] block border-t border-zinc-300" />
    </h2>
  );
}

function AcademicTemplate({ resume }: { resume: Resume }) {
  const customSections = visibleCustomSections(resume);
  const L = resumeLabels(resume.language);
  const contact = contactItems(resume);

  return (
    <article
      className="resume-paper bg-white text-zinc-800"
      style={{
        padding: "15mm 17mm",
        fontFamily: SERIF_STACK,
        ...resumeFontStyle(resume.font),
        ...accentStyle(resume.theme.accent),
      }}
    >
      <header className="text-center">
        <ResumePhoto
          src={resume.basic.photo}
          className="mx-auto mb-3 h-[20mm] w-[20mm] rounded-sm ring-1 ring-zinc-200"
        />
        <h1 className="text-[27px] font-semibold tracking-[0.1em] text-zinc-900">
          {resume.basic.name || "你的姓名"}
        </h1>
        <p className="mt-1.5 text-[11.5px] tracking-[0.14em] text-zinc-600">
          {resume.basic.headline || "求职头衔"}
        </p>
        {contact.length > 0 ? (
          <p className="mt-2.5 text-[9.5px] leading-relaxed tracking-wide text-zinc-500">
            {contact.map((item, index) => (
              <span key={item.key}>
                {index > 0 ? "  ｜  " : ""}
                <ContactLink item={item} />
              </span>
            ))}
          </p>
        ) : null}
      </header>
      <div className="mt-4 border-t-2 border-zinc-800" />
      <div className="mt-[2px] border-t border-zinc-400" />

      <OrderedSections resume={resume} keys={FULL_KEYS}>
        {resume.basic.summary ? (
          <section data-section="summary" className="mt-5">
            <AcademicSectionTitle>{L.summary}</AcademicSectionTitle>
            <p className="text-justify text-[10.8px] leading-[1.85] text-zinc-600">
              {resume.basic.summary}
            </p>
          </section>
        ) : null}

        {resume.experiences.length > 0 ? (
          <section data-section="experience" className="mt-5">
            <AcademicSectionTitle>{L.experience}</AcademicSectionTitle>
            <div className="space-y-3.5">
              {resume.experiences.map((item, index) => (
                <div
                  key={item.id}
                  className={`break-inside-avoid ${
                    index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                  }`}
                >
                  <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[11px] leading-snug">
                      <span className="font-semibold text-zinc-900">
                        {item.company || "公司名称"}
                      </span>
                      {item.role ? (
                        <span className="text-zinc-600"> · {item.role}</span>
                      ) : null}
                    </p>
                    <span className="shrink-0 text-[9.5px] tabular-nums text-zinc-400">
                      {range(item.start, item.end)}
                    </span>
                  </div>
                  <Bullets
                    text={item.description}
                    className="mt-1 text-[10.5px] leading-[1.8] text-zinc-600"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {resume.projects.length > 0 ? (
          <section data-section="projects" className="mt-5">
            <AcademicSectionTitle>{L.projects}</AcademicSectionTitle>
            <div className="space-y-3">
              {resume.projects.map((item, index) => (
                <div
                  key={item.id}
                  className={`break-inside-avoid ${
                    index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                  }`}
                >
                  <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[11px] leading-snug">
                      <span className="font-semibold text-zinc-900">
                        {item.name || "项目名称"}
                      </span>
                      {item.role ? (
                        <span className="text-zinc-600"> · {item.role}</span>
                      ) : null}
                    </p>
                    {item.link || item.start || item.end ? (
                      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                        {range(item.start, item.end) ? (
                          <span className="text-[9px] tabular-nums text-zinc-400">
                            {range(item.start, item.end)}
                          </span>
                        ) : null}
                        {item.link ? (
                          <span className="max-w-[50mm] break-all text-[9px] text-zinc-400">
                            <ResumeLink value={item.link} />
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <Bullets
                    text={item.description}
                    className="mt-1 text-[10.5px] leading-[1.8] text-zinc-600"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {customSections.map((section) => (
          <section key={section.id} data-section="custom" className="mt-5">
            <AcademicSectionTitle>
              {customSectionTitle(section)}
            </AcademicSectionTitle>
            <CustomItems
              section={section}
              titleClassName="text-[10.8px] leading-snug"
              subtitleClassName="text-zinc-600"
              dateClassName="text-[9px] text-zinc-400"
              bodyClassName="mt-0.5 text-[10.5px] leading-[1.8] text-zinc-600"
              linkClassName="mt-0.5 text-[9px] text-zinc-400"
            />
          </section>
        ))}

        {resume.educations.length > 0 ? (
          <section data-section="education" className="mt-5">
            <AcademicSectionTitle>{L.educationAcademic}</AcademicSectionTitle>
            <div className="space-y-2.5">
              {resume.educations.map((item) => (
                <div key={item.id} className="break-inside-avoid">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[10.8px] text-zinc-700">
                      <span className="font-semibold text-zinc-900">
                        {item.school || "学校名称"}
                      </span>
                      {[item.major, item.degree].filter(Boolean).length > 0 ? (
                        <span className="text-zinc-600">
                          {" ｜ "}
                          {[item.major, item.degree].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                    </p>
                    <span className="shrink-0 text-[9.5px] tabular-nums text-zinc-400">
                      {range(item.start, item.end)}
                    </span>
                  </div>
                  <EducationDetails
                    item={item}
                    labels={L}
                    className="mt-0.5 text-[9.5px] leading-[1.7] text-zinc-500"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {resume.skills.length > 0 ? (
          <section data-section="skills" className="mt-5">
            <AcademicSectionTitle>{L.skillsProfessional}</AcademicSectionTitle>
            <SkillText
              resume={resume}
              separator=" · "
              className="text-[10.5px] leading-[1.8] text-zinc-600"
              titleClassName="font-semibold text-zinc-700"
            />
          </section>
        ) : null}

        {isSectionVisible(resume, "intent") ? (
          <section data-section="intent" className="mt-5">
            <AcademicSectionTitle>{L.intent}</AcademicSectionTitle>
            <p className="text-[10.5px] leading-[1.8] text-zinc-600">
              {[
                resume.intent.targetRole,
                resume.intent.targetCity,
                resume.intent.jobType,
                resume.intent.experience,
              ]
                .filter(Boolean)
                .join(" · ")}
              {resume.intent.salaryMin || resume.intent.salaryMax ? (
                <>
                  {" · "}
                  <SalaryRange resume={resume} /> / {L.month}
                </>
              ) : null}
            </p>
          </section>
        ) : null}
      </OrderedSections>

      {!hasVisibleSection(resume, FULL_KEYS) ? (
        <p className="py-10 text-center text-[12px] text-zinc-300">
          {L.emptyPreview}
        </p>
      ) : null}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* 卡片模板：内容分区成卡片，适合屏幕阅读与中小型项目                    */
/* ------------------------------------------------------------------ */

function CardSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 flex break-after-avoid items-center gap-2 text-[9.5px] font-semibold tracking-[0.18em] resume-ink">
      <span className="resume-soft rounded px-1.5 py-1">{children}</span>
    </h2>
  );
}

function CardTemplate({ resume }: { resume: Resume }) {
  const customSections = visibleCustomSections(resume);
  const L = resumeLabels(resume.language);
  const contact = contactItems(resume);

  return (
    <article
      className="resume-paper bg-white text-zinc-800"
      style={{
        padding: "10mm",
        fontFamily: SANS_STACK,
        ...resumeFontStyle(resume.font),
        ...accentStyle(resume.theme.accent),
      }}
    >
      <header className="resume-soft rounded-2xl border border-black/[0.06] p-5">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-[27px] font-bold leading-none tracking-tight text-zinc-900">
              {resume.basic.name || "你的姓名"}
            </h1>
            <p className="resume-ink mt-2 text-[11.5px] font-medium">
              {resume.basic.headline || "求职头衔"}
            </p>
          </div>
          <div className="flex shrink-0 items-start gap-3">
            <div className="max-w-[62mm] text-right text-[9px] leading-[1.6] text-zinc-500">
              {contact.map((item) => (
                <p key={item.key} className="break-all">
                  <ContactLink item={item} />
                </p>
              ))}
            </div>
            <ResumePhoto
              src={resume.basic.photo}
              className="h-[20mm] w-[20mm] rounded-lg ring-1 ring-black/10"
            />
          </div>
        </div>
      </header>

      <div className="mt-3 space-y-3">
        <OrderedSections resume={resume} keys={FULL_KEYS}>
          {resume.basic.summary ? (
            <section
              data-section="summary"
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <CardSectionTitle>{L.summary}</CardSectionTitle>
              <p className="text-[10.5px] leading-[1.75] text-zinc-600">
                {resume.basic.summary}
              </p>
            </section>
          ) : null}

          {resume.experiences.length > 0 ? (
            <section
              data-section="experience"
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <CardSectionTitle>{L.experience}</CardSectionTitle>
              <div className="space-y-3">
                {resume.experiences.map((item, index) => (
                  <div
                    key={item.id}
                    className={`break-inside-avoid ${
                      index > 0 && item.pageBreakBefore
                        ? "print:break-before-page"
                        : ""
                    }`}
                  >
                    <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[10.8px] leading-snug">
                        <span className="font-semibold text-zinc-900">
                          {item.role || "职位"}
                        </span>
                        {item.company ? (
                          <span className="text-zinc-500"> · {item.company}</span>
                        ) : null}
                      </p>
                      <span className="shrink-0 text-[9px] tabular-nums text-zinc-400">
                        {range(item.start, item.end)}
                      </span>
                    </div>
                    <Bullets
                      text={item.description}
                      className="mt-1 text-[10px] leading-[1.7] text-zinc-600"
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {resume.projects.length > 0 ? (
            <section
              data-section="projects"
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <CardSectionTitle>{L.projects}</CardSectionTitle>
              <div className="space-y-2.5">
                {resume.projects.map((item, index) => (
                  <div
                    key={item.id}
                    className={`break-inside-avoid ${
                      index > 0 && item.pageBreakBefore
                        ? "print:break-before-page"
                        : ""
                    }`}
                  >
                    <PageBreakMarker before={index > 0 && item.pageBreakBefore} label={L.pageBreak} />
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[10.8px] leading-snug">
                        <span className="font-semibold text-zinc-900">
                          {item.name || "项目名称"}
                        </span>
                        {item.role ? (
                          <span className="text-zinc-500"> · {item.role}</span>
                        ) : null}
                      </p>
                      {item.link || item.start || item.end ? (
                        <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                          {range(item.start, item.end) ? (
                            <span className="text-[8.5px] tabular-nums text-zinc-400">
                              {range(item.start, item.end)}
                            </span>
                          ) : null}
                          {item.link ? (
                            <span className="max-w-[45mm] break-all text-[8.5px] text-zinc-400">
                              <ResumeLink value={item.link} />
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <Bullets
                      text={item.description}
                      className="mt-0.5 text-[10px] leading-[1.7] text-zinc-600"
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {customSections.map((section) => (
            <section
              key={section.id}
              data-section="custom"
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <CardSectionTitle>{customSectionTitle(section)}</CardSectionTitle>
              <CustomItems
                section={section}
                titleClassName="text-[10.8px] leading-snug"
                subtitleClassName="text-zinc-500"
                dateClassName="text-[8.5px] text-zinc-400"
                bodyClassName="mt-0.5 text-[10px] leading-[1.7] text-zinc-600"
                linkClassName="mt-0.5 text-[8.5px] text-zinc-400"
                gapClassName="space-y-2"
              />
            </section>
          ))}

          {resume.educations.length > 0 ? (
            <section
              data-section="education"
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <CardSectionTitle>{L.education}</CardSectionTitle>
              <div className="space-y-1.5">
                {resume.educations.map((item) => (
                  <div key={item.id} className="break-inside-avoid">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[10.5px] text-zinc-700">
                        <span className="font-semibold text-zinc-900">
                          {item.school || "学校名称"}
                        </span>
                        <span className="text-zinc-500">
                          {[item.major, item.degree].filter(Boolean).length > 0
                            ? ` · ${[item.major, item.degree]
                                .filter(Boolean)
                                .join(" · ")}`
                            : ""}
                        </span>
                      </p>
                      <span className="shrink-0 text-[9px] tabular-nums text-zinc-400">
                        {range(item.start, item.end)}
                      </span>
                    </div>
                    <EducationDetails
                      item={item}
                      labels={L}
                      className="mt-0.5 text-[9px] leading-[1.6] text-zinc-500"
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {resume.skills.length > 0 ? (
            <section
              data-section="skills"
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <CardSectionTitle>{L.skillsProfessional}</CardSectionTitle>
              <SkillChips
                resume={resume}
                chipClassName="resume-soft rounded px-1.5 py-0.5 text-[9.5px] leading-[1.5] text-zinc-700"
                titleClassName="mb-1 text-[8.5px] font-medium tracking-wide text-zinc-400"
              />
            </section>
          ) : null}

          {isSectionVisible(resume, "intent") ? (
            <section
              data-section="intent"
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <CardSectionTitle>{L.intent}</CardSectionTitle>
              <p className="text-[10px] leading-[1.7] text-zinc-600">
                {[
                  resume.intent.targetRole,
                  resume.intent.targetCity,
                  resume.intent.jobType,
                  resume.intent.experience,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                {resume.intent.salaryMin || resume.intent.salaryMax ? (
                  <>
                    {" · "}
                    <SalaryRange resume={resume} /> / {L.month}
                  </>
                ) : null}
              </p>
            </section>
          ) : null}
        </OrderedSections>
      </div>

      {!hasVisibleSection(resume, FULL_KEYS) ? (
        <p className="py-10 text-center text-[12px] text-zinc-300">
          {L.emptyPreview}
        </p>
      ) : null}
    </article>
  );
}

function ResumePaperView({
  resume,
  template,
}: {
  resume: Resume;
  template: TemplateId;
}) {
  // 预览 / 打印只消费英文合并后的视图，原始中文数据保持不变。
  const view = localizedResume(resume);
  if (template === "classic") return <ClassicTemplate resume={view} />;
  if (template === "compact") return <CompactTemplate resume={view} />;
  if (template === "sidebar") return <SidebarTemplate resume={view} />;
  if (template === "timeline") return <TimelineTemplate resume={view} />;
  if (template === "minimal") return <MinimalTemplate resume={view} />;
  if (template === "academic") return <AcademicTemplate resume={view} />;
  if (template === "card") return <CardTemplate resume={view} />;
  return <ModernTemplate resume={view} />;
}

/**
 * 预览一次要渲染上千行 JSX（八套模板任选其一），而外层状态（提示条、弹窗、
 * 移动端分栏）变化与简历无关。简历对象始终是函数式不可变更新，浅比较足够。
 */
export const ResumePaper = memo(ResumePaperView);
