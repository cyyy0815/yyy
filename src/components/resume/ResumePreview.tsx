"use client";

import { useEffect, useRef, useState } from "react";
import type { Resume, TemplateId } from "@/lib/types";
import { ResumePaper } from "./templates";

const A4_WIDTH_PX = 794; // 210mm @ 96dpi
// 打印内容区：首页贴顶只有 8mm 底边，续页上下各留 8mm
const FIRST_PAGE_HEIGHT_PX = 1092; // 289mm @ 96dpi
const NEXT_PAGE_HEIGHT_PX = 1062; // 281mm @ 96dpi

/** 估算总页数与每页分隔线的位置（px）；手动分页只保证页数下限 */
function paginate(height: number, forcedBreaks = 0) {
  const guides: number[] = [];
  if (height > FIRST_PAGE_HEIGHT_PX + 1) {
    let top = FIRST_PAGE_HEIGHT_PX;
    while (top < height - 1) {
      guides.push(top);
      top += NEXT_PAGE_HEIGHT_PX;
    }
  }
  return {
    pages: Math.max(guides.length + 1, forcedBreaks + 1),
    guides,
  };
}

export function ResumePreview({
  resume,
  template,
  onPageCountChange,
}: {
  resume: Resume;
  template: TemplateId;
  onPageCountChange?: (pages: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.9);
  const [layout, setLayout] = useState(() => paginate(0));
  // 首条记录前的分页没有意义，模板里也会忽略
  const forcedBreaks =
    resume.experiences.filter((item, index) => index > 0 && item.pageBreakBefore)
      .length +
    resume.projects.filter((item, index) => index > 0 && item.pageBreakBefore)
      .length;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      const available = element.clientWidth - 24;
      const next = Math.min(1, Math.max(0.42, available / A4_WIDTH_PX));
      setScale(next);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // 按打印内容区高度计算页数；手动分页符导致的空隙不计入，因此显示「约」
  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    const target = paper.querySelector<HTMLElement>(".resume-paper");
    if (!target) return;

    const update = () => {
      setLayout(paginate(target.scrollHeight, forcedBreaks));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(target);
    return () => observer.disconnect();
  }, [template, forcedBreaks]);

  useEffect(() => {
    onPageCountChange?.(layout.pages);
  }, [layout.pages, onPageCountChange]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="flex justify-center">
        <div className="resume-zoom" style={{ zoom: scale }}>
          <div
            ref={paperRef}
            id="resume-print"
            className="relative min-h-[297mm] w-[210mm] overflow-hidden bg-white shadow-[0_10px_40px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5"
          >
            <ResumePaper resume={resume} template={template} />

            {layout.guides.length > 0 ? (
              <div
                aria-hidden="true"
                className="print-hide pointer-events-none absolute inset-0"
              >
                {layout.guides.map((top, index) => (
                  <div
                    key={top}
                    className="absolute inset-x-0 border-t border-dashed border-zinc-300"
                    style={{ top }}
                  >
                    <span className="absolute right-2 top-1 rounded bg-white/85 px-1 text-[8px] leading-[1.5] text-zinc-400">
                      第 {index + 2} 页
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="print-hide mt-2 flex justify-center">
        <span
          data-qa="preview-pages"
          data-pages={layout.pages}
          className={`rounded-full px-2.5 py-1 text-[10.5px] ${
            layout.pages > 1
              ? "bg-amber-100 text-amber-700"
              : "bg-black/5 text-zinc-500"
          }`}
        >
          约 {layout.pages} 页 A4
          {layout.pages > 1 ? " · 建议精简到 1 页" : " · 打印自带页码"}
        </span>
      </div>
    </div>
  );
}
