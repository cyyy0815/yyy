"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({
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
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-[20px] text-amber-600">
          !
        </div>
        <h1 className="mt-4 text-[19px] font-semibold tracking-tight text-zinc-900">
          页面出了点问题
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-zinc-500">
          你的简历仍保存在本机浏览器里。可以先重试；如果反复出现，刷新页面并导出
          JSON 备份。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={() => retry()}>
            重试
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        </div>
      </div>
    </main>
  );
}
