import type { ComponentProps, ReactNode } from "react";

const inputBase =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-900 transition placeholder:text-zinc-400 focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-700/10";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium text-zinc-600">{label}</span>
        {hint ? <span className="text-[11px] text-zinc-400">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export function TextInput({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${inputBase} ${className}`} />;
}

export function TextArea({ className = "", ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={`${inputBase} min-h-[88px] resize-y leading-relaxed ${className}`}
    />
  );
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`${inputBase} cursor-pointer ${className}`} />;
}
