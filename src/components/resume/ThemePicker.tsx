"use client";

import { ACCENT_PRESETS, normalizeAccent } from "@/lib/theme";

export function ThemePicker({
  accent,
  onChange,
}: {
  accent: string;
  onChange: (accent: string) => void;
}) {
  const active = normalizeAccent(accent);
  const isPreset = ACCENT_PRESETS.some((preset) => preset.value === active);

  return (
    <div className="flex items-center gap-2" role="group" aria-label="主题色">
      <span className="hidden text-[11px] text-zinc-400 sm:inline">主题色</span>
      <div className="flex items-center gap-1.5">
        {ACCENT_PRESETS.map((preset) => {
          const selected = active === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              title={preset.name}
              aria-label={preset.name}
              aria-pressed={selected}
              className={`h-6 w-6 rounded-full transition ${
                selected
                  ? "ring-2 ring-zinc-900 ring-offset-2"
                  : "ring-1 ring-black/10 hover:ring-black/30"
              }`}
              style={{ backgroundColor: preset.value }}
            />
          );
        })}
        <label
          title="自定义颜色"
          className={`relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-dashed transition ${
            isPreset
              ? "border-zinc-300 text-zinc-400 hover:border-zinc-400"
              : "border-transparent ring-2 ring-zinc-900 ring-offset-2"
          }`}
          style={isPreset ? undefined : { backgroundColor: active }}
        >
          <input
            type="color"
            value={active}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="自定义主题色"
          />
          {isPreset ? <span className="text-[11px] leading-none">+</span> : null}
        </label>
      </div>
    </div>
  );
}
