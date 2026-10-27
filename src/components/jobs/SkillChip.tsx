import type { ReactNode } from "react";

export function SkillChip({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "matched" | "missing" | "bonus";
}) {
  const styles = {
    matched: "border-emerald-100 bg-emerald-50 text-emerald-700",
    missing: "border-amber-100 bg-amber-50 text-amber-700",
    bonus: "border-blue-100 bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
