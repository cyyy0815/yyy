"use client";

import {
  FONT_PRESETS,
  normalizeResumeFont,
  type ResumeFontId,
} from "@/lib/fonts";

export function FontPicker({
  font,
  onChange,
}: {
  font: ResumeFontId;
  onChange: (font: ResumeFontId) => void;
}) {
  const active = normalizeResumeFont(font);

  return (
    <div className="flex items-center gap-2" role="group" aria-label="简历字体">
      <span className="hidden text-[11px] text-zinc-400 sm:inline">字体</span>
      <div className="flex min-w-0 max-w-full items-center overflow-x-auto rounded-lg border border-zinc-200 bg-white p-0.5">
        {FONT_PRESETS.map((preset) => {
          const selected = active === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.id)}
              aria-pressed={selected}
              title={preset.note}
              className={`shrink-0 rounded-md px-2 py-1.5 text-[11.5px] font-medium transition ${
                selected
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <span style={{ fontFamily: preset.preview }}>{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
