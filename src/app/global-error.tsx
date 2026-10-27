"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#faf9f7] text-zinc-900">
        <main className="flex min-h-screen items-center justify-center px-4 py-16">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[20px] text-red-600">
              !
            </div>
            <h1 className="mt-4 text-[19px] font-semibold tracking-tight text-zinc-900">
              应用遇到严重错误
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-zinc-500">
              简历数据仍保存在本机浏览器里，没有被清除。请刷新页面重试；如果问题持续，请用浏览器开发者工具确认存储状态后再导出备份。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => retry()}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-[12.5px] font-medium text-white transition hover:bg-zinc-700"
              >
                重试
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-[12.5px] font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                刷新页面
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
