"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

type Props = {
  onJsonArchive: () => void;
  onJsonSingle: () => void;
  onWord: () => void;
  onPdf: () => void;
  onAts: () => void;
  busy?: boolean;
};

/**
 * 导出菜单：把「JSON 备份」与「可交付格式」分开。
 *
 * 两种 PDF 的区别要在文案里讲清楚，否则用户会以为图片版能过 ATS：
 * - 图片版：一键下载、所见即所得，但文字不可选中；
 * - 打印 / PDF：浏览器原生，矢量文本，适合投递与 ATS。
 */
export function ExportMenu({
  onJsonArchive,
  onJsonSingle,
  onWord,
  onPdf,
  onAts,
  busy = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant="outline"
        size="sm"
        data-qa="export-menu"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
      >
        {busy ? "导出中…" : "导出"}
      </Button>

      {open ? (
        <div
          role="menu"
          data-qa="export-panel"
          className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
        >
          <p className="px-3 py-1 text-[10.5px] uppercase tracking-wide text-zinc-400">
            数据备份
          </p>
          <button
            type="button"
            role="menuitem"
            data-qa="export-json-all"
            className="block w-full px-3 py-2 text-left text-[12.5px] text-zinc-700 hover:bg-zinc-50"
            onClick={() => run(onJsonArchive)}
          >
            全部简历（JSON）
          </button>
          <button
            type="button"
            role="menuitem"
            data-qa="export-json-single"
            className="block w-full px-3 py-2 text-left text-[12.5px] text-zinc-700 hover:bg-zinc-50"
            onClick={() => run(onJsonSingle)}
          >
            当前简历（JSON）
          </button>

          <div className="my-1 border-t border-zinc-100" />
          <p className="px-3 py-1 text-[10.5px] uppercase tracking-wide text-zinc-400">
            交付格式
          </p>
          <button
            type="button"
            role="menuitem"
            data-qa="export-word"
            className="block w-full px-3 py-2 text-left text-[12.5px] text-zinc-700 hover:bg-zinc-50"
            onClick={() => run(onWord)}
          >
            Word（.docx）
          </button>
          <button
            type="button"
            role="menuitem"
            data-qa="export-pdf"
            className="block w-full px-3 py-2 text-left text-[12.5px] text-zinc-700 hover:bg-zinc-50"
            onClick={() => run(onPdf)}
          >
            PDF（图片版）
          </button>
          <button
            type="button"
            role="menuitem"
            data-qa="export-ats"
            className="block w-full px-3 py-2 text-left text-[12.5px] text-zinc-700 hover:bg-zinc-50"
            onClick={() => run(onAts)}
          >
            ATS 文本 / Markdown…
          </button>
          <p className="px-3 pb-2 pt-1 text-[10.5px] leading-4 text-zinc-400">
            需要可选中文字的 PDF，用右上「打印 / PDF」。
          </p>
        </div>
      ) : null}
    </div>
  );
}
