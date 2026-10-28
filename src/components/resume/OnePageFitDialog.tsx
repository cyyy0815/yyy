"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
  fitSuggestions,
  normalizeSectionLayout,
  resolveSectionLayout,
  SECTION_LABELS,
  sectionHasContent,
  sectionSummary,
} from "@/lib/layout";
import type { Resume, ResumeSectionKey, TemplateId } from "@/lib/types";

type Props = {
  resume: Resume;
  pageCount: number;
  template: TemplateId;
  onHiddenChange: (hidden: ResumeSectionKey[]) => void;
  onTemplateChange: (template: TemplateId) => void;
  onClose: () => void;
};

/** 一页适配：实时隐藏可选板块并观察页数变化，内容不会被删除。 */
export function OnePageFitDialog({
  resume,
  pageCount,
  template,
  onHiddenChange,
  onTemplateChange,
  onClose,
}: Props) {
  const layout = resolveSectionLayout(resume);
  const hidden = new Set(layout.hidden);
  // 弹窗每次打开都是一个新实例，首帧的隐藏列表就是「打开时」的快照。
  const [initialHidden] = useState(() => resolveSectionLayout(resume).hidden);
  const suggestions = fitSuggestions(resume);
  const rows = layout.order.filter((key) => sectionHasContent(resume, key));
  const fitsOnePage = pageCount <= 1;

  const toggle = (key: ResumeSectionKey) => {
    const next = new Set(layout.hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onHiddenChange(
      normalizeSectionLayout({ hidden: [...next] }).hidden,
    );
  };

  const hideSuggestions = () => {
    onHiddenChange(
      normalizeSectionLayout({
        hidden: [...layout.hidden, ...suggestions],
      }).hidden,
    );
  };

  const reset = () => onHiddenChange(initialHidden);

  return (
    <Dialog
      title="一页适配"
      description="隐藏暂时用不到的板块，让简历更接近一页 A4。"
      size="md"
      dataQa="fit-dialog"
      closeDataQa="fit-close-icon"
      panelData={{ "data-pages": pageCount }}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            data-qa="fit-reset"
            onClick={reset}
            disabled={initialHidden.join() === layout.hidden.join()}
            className="disabled:opacity-40"
          >
            恢复打开时
          </Button>
          <Button variant="primary" size="sm" data-qa="fit-done" onClick={onClose}>
            完成
          </Button>
        </div>
      }
    >
          <div
            role="status"
            data-qa="fit-status"
            className={`rounded-xl border px-3.5 py-3 text-[12px] leading-5 ${
              fitsOnePage
                ? "border-emerald-100 bg-emerald-50/70 text-emerald-800"
                : "border-amber-100 bg-amber-50/70 text-amber-800"
            }`}
          >
            {fitsOnePage
              ? "当前约 1 页 A4，长度合适。"
              : `当前约 ${pageCount} 页 A4，建议精简到 1 页。`}
            {!fitsOnePage ? (
              <span className="mt-1 block text-[11px] text-amber-700/80">
                每隐藏一个有内容的板块，页数会在这里实时更新。
              </span>
            ) : null}
          </div>

          {rows.length > 0 ? (
            <>
              <div className="mt-4 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-zinc-600">
                  板块（关闭后不显示）
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  data-qa="fit-suggest"
                  onClick={hideSuggestions}
                  disabled={suggestions.length === 0}
                  className="disabled:opacity-40"
                  title={
                    suggestions.length > 0
                      ? `建议隐藏：${suggestions
                          .map((key) => SECTION_LABELS[key])
                          .join("、")}`
                      : "没有可建议隐藏的可选板块"
                  }
                >
                  隐藏建议项
                </Button>
              </div>

              <div className="mt-2 space-y-1.5">
                {rows.map((key) => {
                  const visible = !hidden.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      role="switch"
                      aria-checked={visible}
                      data-qa={`fit-toggle-${key}`}
                      onClick={() => toggle(key)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                        visible
                          ? "border-zinc-200 bg-white hover:border-zinc-300"
                          : "border-dashed border-zinc-200 bg-zinc-50/70"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                          visible
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-zinc-300 bg-white text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[12.5px] font-medium ${
                            visible ? "text-zinc-800" : "text-zinc-400"
                          }`}
                        >
                          {SECTION_LABELS[key]}
                        </span>
                        <span className="mt-0.5 block truncate text-[10.5px] text-zinc-400">
                          {sectionSummary(resume, key)}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10.5px] text-zinc-400">
                        {visible ? "显示中" : "已隐藏"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-[12px] text-zinc-400">
              简历还没有内容，先在编辑区填写后再适配。
            </p>
          )}

          {!fitsOnePage ? (
            <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50/70 px-3.5 py-3">
              <p className="text-[11px] leading-5 text-zinc-500">
                如果隐藏后仍超过 1 页，可以精简个人简介与经历描述，或换用信息密度更高的模板。
              </p>
              {template !== "compact" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  data-qa="fit-use-compact"
                  onClick={() => onTemplateChange("compact")}
                >
                  改用紧凑模板
                </Button>
              ) : null}
            </div>
          ) : null}

          <p className="mt-3 text-[10.5px] leading-4 text-zinc-400">
            隐藏只影响预览、打印与 ATS 导出，内容不会被删除；之后可在编辑区「板块显示与排序」恢复。
          </p>
    </Dialog>
  );
}
