import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <p className="text-[11px] font-medium tracking-[0.18em] text-zinc-400">
          404 NOT FOUND
        </p>
        <h1 className="mt-3 text-[19px] font-semibold tracking-tight text-zinc-900">
          页面不存在
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-zinc-500">
          链接可能已失效，或者地址输入有误。你的简历数据仍保存在本机浏览器里。
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-[12.5px] font-medium text-white transition hover:bg-zinc-700"
        >
          回到简历工坊
        </Link>
      </div>
    </main>
  );
}
