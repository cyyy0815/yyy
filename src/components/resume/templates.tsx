import { accentStyle } from "@/lib/theme";
import type { Resume, TemplateId } from "@/lib/types";

function range(start: string, end: string): string {
  return [start, end].filter(Boolean).join(" – ");
}

function displayUrl(value: string): string {
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
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
function PageBreakMarker({ before }: { before?: boolean }) {
  if (!before) return null;
  return (
    <div className="print-hide mb-1.5 flex items-center gap-2 text-[8px] tracking-[0.18em] text-zinc-300">
      <span className="h-px flex-1 border-t border-dashed border-zinc-200" />
      分页
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
  const items = [
    resume.basic.phone,
    resume.basic.email,
    resume.basic.city,
    displayUrl(resume.basic.website),
    displayUrl(resume.basic.github),
  ].filter(Boolean);

  return (
    <div className={className}>
      {items.map((item) => (
        <div key={item}>{item}</div>
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
  const hasAside =
    resume.skills.length > 0 ||
    resume.educations.length > 0 ||
    resume.intent.targetRole ||
    resume.intent.targetCity;

  return (
    <article
      className="resume-paper bg-white text-zinc-800"
      style={{
        padding: "14mm",
        fontFamily: "var(--font-sans)",
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
        className={`mt-6 grid gap-8 ${
          hasAside ? "resume-aside-grid grid-cols-[1fr_56mm]" : "grid-cols-1"
        }`}
      >
        <div className="resume-main min-w-0">
          {resume.basic.summary ? (
            <section className="mb-5">
              <AccentSectionTitle>个人简介</AccentSectionTitle>
              <p className="text-[11.5px] leading-[1.75] text-zinc-600">
                {resume.basic.summary}
              </p>
            </section>
          ) : null}

          {resume.experiences.length > 0 ? (
            <section className="mb-5">
              <AccentSectionTitle>工作经历</AccentSectionTitle>
              <div className="space-y-3.5">
                {resume.experiences.map((item, index) => (
                  <div
                    key={item.id}
                    className={`break-inside-avoid ${
                      index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                    }`}
                  >
                    <PageBreakMarker before={index > 0 && item.pageBreakBefore} />
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
            <section className="mb-5">
              <AccentSectionTitle>项目经历</AccentSectionTitle>
              <div className="space-y-3">
                {resume.projects.map((item, index) => (
                  <div
                    key={item.id}
                    className={`break-inside-avoid ${
                      index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                    }`}
                  >
                    <PageBreakMarker before={index > 0 && item.pageBreakBefore} />
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[12.5px] leading-snug">
                        <span className="font-semibold text-zinc-900">
                          {item.name || "项目名称"}
                        </span>
                        {item.role ? (
                          <span className="text-zinc-500"> · {item.role}</span>
                        ) : null}
                      </p>
                      {item.link ? (
                        <span className="shrink-0 text-[9.5px] text-zinc-400">
                          {displayUrl(item.link)}
                        </span>
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

          {!resume.basic.summary &&
          resume.experiences.length === 0 &&
          resume.projects.length === 0 ? (
            <p className="py-10 text-center text-[12px] text-zinc-300">
              在左侧填写内容，这里会实时预览
            </p>
          ) : null}
        </div>

        {hasAside ? (
          <aside className="space-y-5 border-l border-zinc-200 pl-6">
            {resume.intent.targetRole || resume.intent.targetCity ? (
              <section>
                <AccentSectionTitle>求职意向</AccentSectionTitle>
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

            {resume.skills.length > 0 ? (
              <section>
                <AccentSectionTitle>技能</AccentSectionTitle>
                <div className="flex flex-wrap gap-1">
                  {resume.skills.map((skill) => (
                    <span
                      key={skill}
                      className="resume-soft rounded px-1.5 py-0.5 text-[9.5px] leading-[1.5] text-zinc-600"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {resume.educations.length > 0 ? (
              <section>
                <AccentSectionTitle>教育经历</AccentSectionTitle>
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
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        ) : null}
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
  const contact = [
    resume.basic.phone,
    resume.basic.email,
    resume.basic.city,
    displayUrl(resume.basic.website),
    displayUrl(resume.basic.github),
  ].filter(Boolean);

  return (
    <article
      className="resume-paper bg-white text-zinc-800"
      style={{
        padding: "16mm",
        fontFamily: 'Georgia, "Songti SC", "SimSun", serif',
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
                {contact.join("   ｜   ")}
              </p>
            ) : null}
          </div>
          <ResumePhoto
            src={resume.basic.photo}
            className="h-[24mm] w-[24mm] rounded-sm ring-1 ring-zinc-200"
          />
        </div>
      </header>

      {resume.basic.summary ? (
        <section className="mt-5">
          <ClassicSectionTitle>个人简介</ClassicSectionTitle>
          <p className="text-[11px] leading-[1.8] text-zinc-600">
            {resume.basic.summary}
          </p>
        </section>
      ) : null}

      {resume.experiences.length > 0 ? (
        <section className="mt-5">
          <ClassicSectionTitle>工作经历</ClassicSectionTitle>
          <div className="space-y-4">
            {resume.experiences.map((item, index) => (
              <div
                key={item.id}
                className={`break-inside-avoid ${
                  index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                }`}
              >
                <PageBreakMarker before={index > 0 && item.pageBreakBefore} />
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
        <section className="mt-5">
          <ClassicSectionTitle>项目经历</ClassicSectionTitle>
          <div className="space-y-3.5">
            {resume.projects.map((item, index) => (
              <div
                key={item.id}
                className={`break-inside-avoid ${
                  index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                }`}
              >
                <PageBreakMarker before={index > 0 && item.pageBreakBefore} />
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[11.5px]">
                    <span className="font-semibold text-zinc-900">
                      {item.name || "项目名称"}
                    </span>
                    {item.role ? (
                      <span className="text-zinc-600"> / {item.role}</span>
                    ) : null}
                  </p>
                  {item.link ? (
                    <span className="shrink-0 text-[9px] text-zinc-400">
                      {displayUrl(item.link)}
                    </span>
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

      {resume.educations.length > 0 ? (
        <section className="mt-5">
          <ClassicSectionTitle>教育经历</ClassicSectionTitle>
          <div className="space-y-2">
            {resume.educations.map((item) => (
              <div
                key={item.id}
                className="flex items-baseline justify-between gap-4"
              >
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
            ))}
          </div>
        </section>
      ) : null}

      {resume.skills.length > 0 ? (
        <section className="mt-5">
          <ClassicSectionTitle>专业技能</ClassicSectionTitle>
          <p className="text-[10.5px] leading-[1.8] text-zinc-600">
            {resume.skills.join("、")}
          </p>
        </section>
      ) : null}
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
  const contact = [
    resume.basic.phone,
    resume.basic.email,
    resume.basic.city,
    displayUrl(resume.basic.website),
    displayUrl(resume.basic.github),
  ].filter(Boolean);

  return (
    <article
      className="resume-paper bg-white text-zinc-800"
      style={{
        padding: "12mm",
        fontFamily: "var(--font-sans)",
        fontSize: "10.5px",
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
            {contact.join("  ·  ")}
          </div>
          <ResumePhoto
            src={resume.basic.photo}
            className="h-[18mm] w-[18mm] rounded-md ring-1 ring-zinc-200"
          />
        </div>
      </header>

      {resume.basic.summary ? (
        <section className="mt-3">
          <CompactSectionTitle>个人简介</CompactSectionTitle>
          <p className="text-[10px] leading-[1.65] text-zinc-600">
            {resume.basic.summary}
          </p>
        </section>
      ) : null}

      {resume.experiences.length > 0 ? (
        <section className="mt-3">
          <CompactSectionTitle>工作经历</CompactSectionTitle>
          <div className="space-y-2.5">
            {resume.experiences.map((item, index) => (
              <div
                key={item.id}
                className={`break-inside-avoid ${
                  index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                }`}
              >
                <PageBreakMarker before={index > 0 && item.pageBreakBefore} />
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
        <section className="mt-3">
          <CompactSectionTitle>项目经历</CompactSectionTitle>
          <div className="space-y-2">
            {resume.projects.map((item, index) => (
              <div
                key={item.id}
                className={`break-inside-avoid ${
                  index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                }`}
              >
                <PageBreakMarker before={index > 0 && item.pageBreakBefore} />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[10.5px]">
                    <span className="font-semibold text-zinc-900">
                      {item.name || "项目名称"}
                    </span>
                    {item.role ? (
                      <span className="text-zinc-500"> ｜ {item.role}</span>
                    ) : null}
                  </p>
                  {item.link ? (
                    <span className="shrink-0 text-[8.5px] text-zinc-400">
                      {displayUrl(item.link)}
                    </span>
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

      <div className="mt-3 grid grid-cols-[1fr_1fr] gap-x-6">
        {resume.educations.length > 0 ? (
          <section>
            <CompactSectionTitle>教育经历</CompactSectionTitle>
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
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {resume.skills.length > 0 ? (
          <section>
            <CompactSectionTitle>专业技能</CompactSectionTitle>
            <p className="text-[9.5px] leading-[1.7] text-zinc-600">
              {resume.skills.join(" · ")}
            </p>
          </section>
        ) : null}
      </div>
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
  const contact = [
    resume.basic.phone,
    resume.basic.email,
    resume.basic.city,
    displayUrl(resume.basic.website),
    displayUrl(resume.basic.github),
  ].filter(Boolean);

  return (
    <article
      className="resume-paper resume-paper-sidebar flex min-h-[289mm] bg-white text-zinc-800"
      style={{
        fontFamily: "var(--font-sans)",
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
                <p key={item} className="break-all">
                  {item}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {resume.intent.targetRole || resume.intent.targetCity ? (
          <section className="mt-5">
            <SidebarHeading>求职意向</SidebarHeading>
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
                  {resume.intent.salaryMax ? `–${resume.intent.salaryMax}` : ""}K / 月
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {resume.skills.length > 0 ? (
          <section className="mt-5">
            <SidebarHeading>技能</SidebarHeading>
            <div className="flex flex-wrap gap-1">
              {resume.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] leading-[1.5] text-white/80"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {resume.educations.length > 0 ? (
          <section className="mt-5">
            <SidebarHeading>教育经历</SidebarHeading>
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
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </aside>

      <div className="min-w-0 flex-1 px-[10mm] py-[12mm]">
        {resume.basic.summary ? (
          <section className="mb-5">
            <AccentSectionTitle>个人简介</AccentSectionTitle>
            <p className="text-[11.5px] leading-[1.75] text-zinc-600">
              {resume.basic.summary}
            </p>
          </section>
        ) : null}

        {resume.experiences.length > 0 ? (
          <section className="mb-5">
            <AccentSectionTitle>工作经历</AccentSectionTitle>
            <div className="space-y-3.5">
              {resume.experiences.map((item, index) => (
                <div
                  key={item.id}
                  className={`break-inside-avoid ${
                    index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                  }`}
                >
                  <PageBreakMarker before={index > 0 && item.pageBreakBefore} />
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
          <section className="mb-5">
            <AccentSectionTitle>项目经历</AccentSectionTitle>
            <div className="space-y-3">
              {resume.projects.map((item, index) => (
                <div
                  key={item.id}
                  className={`break-inside-avoid ${
                    index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                  }`}
                >
                  <PageBreakMarker before={index > 0 && item.pageBreakBefore} />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[12.5px] leading-snug">
                      <span className="font-semibold text-zinc-900">
                        {item.name || "项目名称"}
                      </span>
                      {item.role ? (
                        <span className="text-zinc-500"> · {item.role}</span>
                      ) : null}
                    </p>
                    {item.link ? (
                      <span className="shrink-0 text-[9.5px] text-zinc-400">
                        {displayUrl(item.link)}
                      </span>
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

        {!resume.basic.summary &&
        resume.experiences.length === 0 &&
        resume.projects.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-zinc-300">
            在左侧填写内容，这里会实时预览
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
  const contact = [
    resume.basic.phone,
    resume.basic.email,
    resume.basic.city,
    displayUrl(resume.basic.website),
    displayUrl(resume.basic.github),
  ].filter(Boolean);

  return (
    <article
      className="resume-paper bg-white px-[15mm] py-[13mm] text-zinc-800"
      style={{
        fontFamily: "var(--font-sans)",
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
              <div key={item} className="break-all">
                {item}
              </div>
            ))}
          </div>
          <ResumePhoto
            src={resume.basic.photo}
            className="h-[22mm] w-[22mm] rounded-full ring-2 ring-zinc-100"
          />
        </div>
      </header>

      {resume.basic.summary ? (
        <section className="mt-5">
          <AccentSectionTitle>个人简介</AccentSectionTitle>
          <p className="text-[11.5px] leading-[1.75] text-zinc-600">
            {resume.basic.summary}
          </p>
        </section>
      ) : null}

      {resume.experiences.length > 0 ? (
        <section className="mt-5">
          <AccentSectionTitle className="mb-2.5">工作经历</AccentSectionTitle>
          <div className="space-y-3.5">
            {resume.experiences.map((item, index) => (
              <div
                key={item.id}
                className={`relative break-inside-avoid pl-5 ${
                  index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                }`}
              >
                <PageBreakMarker before={index > 0 && item.pageBreakBefore} />
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
        <section className="mt-5">
          <AccentSectionTitle className="mb-2.5">项目经历</AccentSectionTitle>
          <div className="space-y-3">
            {resume.projects.map((item, index) => (
              <div
                key={item.id}
                className={`relative break-inside-avoid pl-5 ${
                  index > 0 && item.pageBreakBefore ? "print:break-before-page" : ""
                }`}
              >
                <PageBreakMarker before={index > 0 && item.pageBreakBefore} />
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
                  {item.link ? (
                    <span className="shrink-0 text-[9px] text-zinc-400">
                      {displayUrl(item.link)}
                    </span>
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

      {resume.educations.length > 0 || resume.skills.length > 0 ? (
        <div className="mt-5 grid grid-cols-[1.35fr_1fr] gap-x-8">
          {resume.educations.length > 0 ? (
            <section>
              <AccentSectionTitle>教育经历</AccentSectionTitle>
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
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {resume.skills.length > 0 ? (
            <section>
              <AccentSectionTitle>专业技能</AccentSectionTitle>
              <div className="flex flex-wrap gap-1">
                {resume.skills.map((skill) => (
                  <span
                    key={skill}
                    className="resume-soft rounded px-1.5 py-0.5 text-[9.5px] leading-[1.5] text-zinc-600"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function ResumePaper({
  resume,
  template,
}: {
  resume: Resume;
  template: TemplateId;
}) {
  if (template === "classic") return <ClassicTemplate resume={resume} />;
  if (template === "compact") return <CompactTemplate resume={resume} />;
  if (template === "sidebar") return <SidebarTemplate resume={resume} />;
  if (template === "timeline") return <TimelineTemplate resume={resume} />;
  return <ModernTemplate resume={resume} />;
}
