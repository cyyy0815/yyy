"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  defaultSectionLayout,
  moveSectionInLayout,
  resolveSectionLayout,
  SECTION_LABELS,
  sectionHasContent,
  sectionSummary,
  toggleSectionHidden,
} from "@/lib/layout";
import type { Resume, ResumeSectionKey } from "@/lib/types";

type Props = {
  resume: Resume;
  onChange: Dispatch<SetStateAction<Resume>>;
};

/** 内置板块的显示 / 隐藏与顺序；隐藏只改变展示，不删除任何内容。 */
export function SectionLayoutEditor({ resume, onChange }: Props) {
  const layout = resolveSectionLayout(resume);
  const hidden = new Set(layout.hidden);

  const move = (key: ResumeSectionKey, direction: -1 | 1) =>
    onChange((prev) => ({
      ...prev,
      layout: moveSectionInLayout(resolveSectionLayout(prev), key, direction),
    }));

  const toggle = (key: ResumeSectionKey) =>
    onChange((prev) => ({
      ...prev,
      layout: toggleSectionHidden(resolveSectionLayout(prev), key),
    }));

  const reset = () =>
    onChange((prev) => ({ ...prev, layout: defaultSectionLayout() }));

  return (
    <SectionCard
      title="板块显示与排序"
      description="决定简历上出现哪些板块、以什么顺序出现"
      action={
        <Button
          variant="ghost"
          size="sm"
          data-qa="layout-reset"
          onClick={reset}
          title="恢复默认顺序并显示全部板块"
        >
          恢复默认
        </Button>
      }
    >
      <div data-qa="section-layout" className="space-y-1.5">
        {layout.order.map((key, index) => {
          const visible = !hidden.has(key);
          const filled = sectionHasContent(resume, key);
          const label = SECTION_LABELS[key];
          return (
            <div
              key={key}
              data-qa={`layout-row-${key}`}
              data-hidden={!visible}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition ${
                visible
                  ? "border-zinc-200 bg-white"
                  : "border-dashed border-zinc-200 bg-zinc-50/70"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[12.5px] font-medium ${
                    visible ? "text-zinc-800" : "text-zinc-400"
                  }`}
                >
                  {label}
                </p>
                <p className="mt-0.5 truncate text-[10.5px] text-zinc-400">
                  {filled ? sectionSummary(resume, key) : "未填写"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2"
                  onClick={() => move(key, -1)}
                  disabled={index === 0}
                  aria-label={`上移${label}`}
                  title="上移"
                  data-qa={`layout-up-${key}`}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2"
                  onClick={() => move(key, 1)}
                  disabled={index === layout.order.length - 1}
                  aria-label={`下移${label}`}
                  title="下移"
                  data-qa={`layout-down-${key}`}
                >
                  ↓
                </Button>
                <Button
                  variant={visible ? "outline" : "active"}
                  size="sm"
                  className="px-2.5"
                  onClick={() => toggle(key)}
                  aria-label={`${visible ? "隐藏" : "显示"}${label}`}
                  title={visible ? "隐藏该板块" : "显示该板块"}
                  data-qa={`layout-toggle-${key}`}
                >
                  {visible ? "隐藏" : "显示"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2.5 text-[10.5px] leading-4 text-zinc-400">
        隐藏只影响预览、打印与 ATS 导出，内容不会被删除。现代 / 侧栏模板的求职意向、技能、教育固定在侧栏；经典 / 紧凑 / 时间轴模板不展示求职意向。
      </p>
    </SectionCard>
  );
}
