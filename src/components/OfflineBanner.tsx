"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/** 离线提示：缓存过应用外壳后，编辑、预览与导出仍可继续。 */
export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      data-qa="offline-banner"
      className="print-hide mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3"
    >
      <p className="text-[12.5px] leading-6 text-amber-900">
        当前处于离线状态：编辑、预览与导出仍可使用，内容会保存到本机浏览器。
        AI 写作与招聘网站链接需要联网。
      </p>
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
        离线
      </span>
    </div>
  );
}
