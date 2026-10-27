"use client";

import { Button } from "@/components/ui/Button";
import type { ResumeDocumentOption } from "@/hooks/useResumeDocuments";

type Props = {
  documents: ResumeDocumentOption[];
  activeId: string;
  canDelete: boolean;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onDelete: () => void;
};

export function ResumeDocumentsBar({
  documents,
  activeId,
  canDelete,
  onSwitch,
  onCreate,
  onDuplicate,
  onRename,
  onDelete,
}: Props) {
  return (
    <div
      data-resume-documents="true"
      className="print-hide mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 text-[11px] font-medium tracking-wide text-zinc-400">
          简历
        </span>
        <select
          aria-label="切换简历"
          value={activeId}
          onChange={(event) => onSwitch(event.target.value)}
          className="h-8 min-w-0 flex-1 cursor-pointer rounded-lg border border-zinc-200 bg-white px-2 text-[12px] text-zinc-900 transition focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-700/10 sm:max-w-[240px]"
        >
          {documents.map((document) => (
            <option key={document.id} value={document.id}>
              {document.title}
            </option>
          ))}
        </select>
        <span className="hidden shrink-0 text-[11px] text-zinc-400 sm:inline">
          共 {documents.length} 份
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button variant="ghost" size="sm" onClick={onCreate}>
          新建
        </Button>
        <Button variant="ghost" size="sm" onClick={onDuplicate}>
          复制
        </Button>
        <Button variant="ghost" size="sm" onClick={onRename}>
          重命名
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onDelete}
          disabled={!canDelete}
          title={canDelete ? "删除当前简历" : "至少保留一份简历"}
          className="disabled:opacity-40"
        >
          删除
        </Button>
      </div>
    </div>
  );
}
