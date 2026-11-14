"use client";

import { useState } from "react";
import {
  corruptBackupsAsJson,
  listCorruptBackups,
  type CorruptBackup,
} from "@/lib/corruptBackup";

/**
 * 本机数据损坏的提示条：展示一次、可下载原始内容、可关闭。
 * 备份键本身不删除——用户关掉提示后原始数据仍在，避免二次丢失。
 */
export function CorruptDataBanner() {
  const [entries] = useState<CorruptBackup[]>(listCorruptBackups);
  const [hidden, setHidden] = useState(false);

  if (hidden || entries.length === 0) return null;

  const download = () => {
    const blob = new Blob([corruptBackupsAsJson(entries)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "简历工坊-损坏数据备份.json";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div
      role="alert"
      data-qa="corrupt-data"
      className="print-hide mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[12px] leading-5 text-amber-900"
    >
      <span className="min-w-[220px] flex-1">
        检测到本机简历数据损坏，原始内容已自动备份（{entries.length}{" "}
        份）。新的编辑不会覆盖这份备份，建议先下载保存。
      </span>
      <button
        type="button"
        onClick={download}
        className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-medium text-amber-900 transition hover:bg-amber-100"
      >
        下载备份
      </button>
      <button
        type="button"
        onClick={() => setHidden(true)}
        aria-label="关闭损坏数据提示"
        className="flex h-6 w-6 items-center justify-center rounded-full text-[15px] leading-none text-amber-800 transition hover:bg-amber-100"
      >
        ×
      </button>
    </div>
  );
}
