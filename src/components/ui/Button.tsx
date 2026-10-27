import type { ComponentProps } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger" | "active";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-zinc-900 text-white shadow-sm hover:bg-zinc-700 disabled:opacity-40",
  outline:
    "border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:border-zinc-300 hover:bg-zinc-50",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  danger: "text-red-600 hover:bg-red-50",
  active: "bg-blue-50 text-blue-700 hover:bg-blue-100",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[12px] gap-1.5 rounded-lg",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-lg",
};

export function Button({
  variant = "outline",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center font-medium transition active:scale-[0.98] disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
    />
  );
}
