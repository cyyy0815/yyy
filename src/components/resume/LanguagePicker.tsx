"use client";

import {
  normalizeResumeLanguage,
  RESUME_LANGUAGES,
  type ResumeLanguage,
} from "@/lib/language";

export function LanguagePicker({
  language,
  onChange,
}: {
  language: ResumeLanguage;
  onChange: (language: ResumeLanguage) => void;
}) {
  const active = normalizeResumeLanguage(language);

  return (
    <div className="flex items-center gap-2" role="group" aria-label="简历语言">
      <span className="hidden text-[11px] text-zinc-400 sm:inline">语言</span>
      <div className="flex min-w-0 max-w-full items-center overflow-x-auto rounded-lg border border-zinc-200 bg-white p-0.5">
        {RESUME_LANGUAGES.map((item) => {
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-pressed={selected}
              title={item.note}
              className={`shrink-0 rounded-md px-2 py-1.5 text-[11.5px] font-medium transition ${
                selected
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
