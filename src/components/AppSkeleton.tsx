/**
 * 首屏骨架：与真实界面同构（顶栏 + 表单 + 预览 + 页脚）。
 *
 * 水合前渲染它，而不是一行「正在载入…」：
 * - 结构先出现，用户知道页面在动，不会误以为白屏；
 * - 骨架尺寸与真实布局接近，替换时不会明显跳动；
 * - 纯静态标记，不引入任何数据依赖，服务端与客户端输出一致。
 */
export function AppSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col"
      aria-busy="true"
    >
      <header
        aria-hidden="true"
        className="sticky top-0 z-30 border-b border-zinc-200/70 bg-[#faf9f7]/85 backdrop-blur print-hide"
      >
        <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-zinc-900" />
            <div className="hidden sm:block">
              <div className="text-[14px] font-semibold tracking-tight text-zinc-900">
                简历工坊
              </div>
              <div className="text-[10px] tracking-[0.2em] text-zinc-500">
                RESUME WORKSHOP
              </div>
            </div>
          </div>

          <div className="mx-auto flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1">
            <span className="rounded-full bg-zinc-900 px-4 py-1.5 text-[12px] font-medium text-white">
              编辑简历
            </span>
            <span className="px-4 py-1.5 text-[12px] font-medium text-zinc-500">
              职位推荐
            </span>
            <span className="px-4 py-1.5 text-[12px] font-medium text-zinc-500">
              AI 工作台
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="h-8 w-14 rounded-lg border border-zinc-200" />
            <span className="h-8 w-14 rounded-lg border border-zinc-200" />
            <span className="h-8 w-24 rounded-lg bg-zinc-900/85" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 lg:px-6">
        <p
          role="status"
          className="mb-4 text-[11px] tracking-[0.18em] text-zinc-500"
        >
          LOADING · 正在载入你的简历
        </p>
        <div
          aria-hidden="true"
          className="grid gap-6 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]"
        >
          <section className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              >
                <div className="h-4 w-28 rounded bg-zinc-200/80 motion-safe:animate-pulse" />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="h-10 rounded-lg bg-zinc-100 motion-safe:animate-pulse" />
                  <div className="h-10 rounded-lg bg-zinc-100 motion-safe:animate-pulse" />
                </div>
                <div className="mt-3 h-24 rounded-lg bg-zinc-100 motion-safe:animate-pulse" />
              </div>
            ))}
          </section>

          <section className="hidden rounded-2xl border border-zinc-200/80 bg-[#eceae7] p-4 lg:block">
            <div className="mx-auto aspect-[210/297] w-full max-w-[794px] rounded-md bg-white p-8 shadow-sm">
              <div className="h-6 w-40 rounded bg-zinc-200/80 motion-safe:animate-pulse" />
              <div className="mt-2 h-3 w-56 rounded bg-zinc-100 motion-safe:animate-pulse" />
              <div className="mt-6 space-y-2">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
                  <div
                    key={index}
                    className="h-3 rounded bg-zinc-100 motion-safe:animate-pulse"
                    style={{ width: `${index % 3 === 0 ? 92 : 78}%` }}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-[1500px] px-4 pb-8 text-[11px] text-zinc-500 lg:px-6">
        数据仅保存在本机浏览器 · 导出 JSON 可备份或迁移
      </footer>
    </div>
  );
}
