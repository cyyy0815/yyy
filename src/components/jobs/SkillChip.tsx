import type { ReactNode } from "react";

export function SkillChip({
  children,
  tone,
  onClick,
  title,
}: {
  children: ReactNode;
  tone: "matched" | "missing" | "bonus";
  onClick?: () => void;
  title?: string;
}) {
  const styles = {
    matched: "border-emerald-100 bg-emerald-50 text-emerald-700",
    missing: "border-amber-100 bg-amber-50 text-amber-700",
    bonus: "border-blue-100 bg-blue-50 text-blue-700",
  };
  const className = `inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] ${styles[tone]}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={
          typeof children === "string" ? `添加技能 ${children}` : undefined
        }
        className={`${className} cursor-pointer transition hover:border-amber-300 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1`}
      >
        {children}
      </button>
    );
  }

  return <span className={className}>{children}</span>;
}
