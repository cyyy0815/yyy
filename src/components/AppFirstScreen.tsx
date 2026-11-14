/**
 * 首屏静态内容：服务端直接输出真实的标题、产品说明与纸面预览，
 * 让 LCP 文本和爬虫内容不再依赖客户端水合。
 *
 * 简历数据只存在本机 localStorage，无法在服务端渲染；编辑器部分仍由
 * AppShell 在水合后接管，这里只负责「第一屏」。
 */
export function AppFirstScreen() {
  return (
    <div className="flex min-h-screen flex-col" aria-busy="true">
      <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-[#faf9f7]/85 backdrop-blur print-hide">
        <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 font-serif text-[15px] text-white">
              简
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-[14px] font-semibold tracking-tight text-zinc-900">
                简历工坊
              </span>
              <span className="block text-[9.5px] tracking-[0.16em] text-zinc-500">
                RESUME WORKSHOP
              </span>
            </span>
          </div>

          <div className="flex items-center rounded-full border border-zinc-200 bg-white p-0.5">
            <span className="rounded-full bg-zinc-900 px-2.5 py-1.5 text-[12px] font-medium text-white sm:px-4 sm:text-[12.5px]">
              <span className="sm:hidden">编辑</span>
              <span className="hidden sm:inline">编辑简历</span>
            </span>
            <span className="px-2.5 py-1.5 text-[12px] font-medium text-zinc-500 sm:px-4 sm:text-[12.5px]">
              <span className="sm:hidden">推荐</span>
              <span className="hidden sm:inline">职位推荐</span>
            </span>
            <span className="px-2.5 py-1.5 text-[12px] font-medium text-zinc-500 sm:px-4 sm:text-[12.5px]">
              <span className="sm:hidden">AI</span>
              <span className="hidden sm:inline">AI 工作台</span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 text-[12px] text-zinc-400">
            <span className="rounded-lg px-2 py-1">导入</span>
            <span className="rounded-lg border border-zinc-200 px-2 py-1">导出</span>
            <span className="rounded-lg bg-zinc-900/85 px-3 py-1 text-white">
              打印 / PDF
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1180px] flex-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-16">
        <section>
          <p className="text-[11px] font-medium tracking-[0.22em] text-zinc-500">
            RESUME WORKSHOP
          </p>
          <h1 className="mt-3 max-w-xl text-[30px] font-semibold leading-[1.25] tracking-tight text-zinc-900 sm:text-[38px]">
            在浏览器里写简历，
            <br className="hidden sm:block" />
            按目标岗位改到点子上
          </h1>
          <p className="mt-4 max-w-xl text-[14px] leading-7 text-zinc-600">
            左表单右预览，实时生成 A4 简历；粘贴一段 JD 就能看匹配度、补缺口技能，
            需要时再用 AI 改写简介和求职信。数据只保存在你的浏览器里。
          </p>

          <ul className="mt-6 grid max-w-xl gap-2.5 text-[12.5px] leading-6 text-zinc-600 sm:grid-cols-2">
            <li className="flex items-start gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-700" />
              8 套 A4 模板，Word / PDF / ATS 都能导出
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-700" />
              JD 匹配度、缺失技能与一键补全
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-700" />
              AI 改写带事实核对，采用前可撤销
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-700" />
              无账号、无云端，断网也能继续编辑
            </li>
          </ul>

          <div
            role="status"
            className="mt-7 flex flex-wrap items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[12px] text-zinc-600"
          >
            <span className="h-2 w-2 motion-safe:animate-pulse rounded-full bg-blue-700" />
            正在载入编辑器，你的简历数据仍保存在本机
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-400">首次加载后即可开始编辑</span>
          </div>

          <noscript>
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] leading-6 text-amber-900">
              简历工坊的编辑器需要 JavaScript。请在浏览器设置里允许本页运行
              JavaScript 后刷新；你的简历只保存在本机，不会被上传。
            </p>
          </noscript>
        </section>

        <section aria-hidden="true" className="hidden justify-center lg:flex">
          <div className="w-full max-w-[430px] rounded-2xl border border-zinc-200/80 bg-[#eceae7] p-4 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.25)]">
            <div className="aspect-[210/297] w-full overflow-hidden rounded-md bg-white p-7 shadow-sm ring-1 ring-black/5">
              <div className="h-1.5 w-16 rounded bg-blue-700/80" />
              <div className="mt-5 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="h-5 w-32 rounded bg-zinc-800/85" />
                  <div className="mt-2 h-2.5 w-44 rounded bg-zinc-300" />
                  <div className="mt-1.5 h-2 w-36 rounded bg-zinc-200" />
                </div>
                <div className="h-16 w-14 shrink-0 rounded bg-zinc-100 ring-1 ring-zinc-200" />
              </div>
              <div className="mt-6 space-y-2">
                <div className="h-2 w-20 rounded bg-blue-700/70" />
                <div className="h-1.5 w-full rounded bg-zinc-200" />
                <div className="h-1.5 w-11/12 rounded bg-zinc-200" />
                <div className="h-1.5 w-4/5 rounded bg-zinc-200" />
              </div>
              <div className="mt-5 space-y-2">
                <div className="h-2 w-24 rounded bg-blue-700/70" />
                <div className="h-1.5 w-1/2 rounded bg-zinc-300" />
                <div className="h-1.5 w-full rounded bg-zinc-200" />
                <div className="h-1.5 w-10/12 rounded bg-zinc-200" />
                <div className="h-1.5 w-9/12 rounded bg-zinc-200" />
              </div>
              <div className="mt-5 flex gap-1.5">
                <div className="h-4 w-12 rounded bg-zinc-100" />
                <div className="h-4 w-14 rounded bg-zinc-100" />
                <div className="h-4 w-10 rounded bg-zinc-100" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="print-hide mx-auto w-full max-w-[1500px] px-4 pb-8 text-[11px] text-zinc-500 lg:px-6">
        数据仅保存在本机浏览器 · 导出 JSON 可备份或迁移 · 求职推荐基于本地岗位画像
      </footer>
    </div>
  );
}
