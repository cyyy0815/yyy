"use client";

import { useEffect, useRef, useState } from "react";
import { buildBookmarklet } from "@/lib/bookmarklet";

export function JobCaptureCard() {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const link = linkRef.current;
    if (!link) return;
    // 通过 DOM 设置，避免 React 在渲染时把 javascript: 链接当成不安全 URL 处理。
    link.href = buildBookmarklet(window.location.origin);
  }, []);

  const copyCode = async () => {
    const code = buildBookmarklet(window.location.origin);
    try {
      await navigator.clipboard.writeText(code);
      setNotice("书签代码已复制：新建一个书签，把代码粘进网址即可。");
    } catch {
      setNotice("复制失败，请检查浏览器剪贴板权限后重试。");
    }
  };

  return (
    <section
      data-qa="job-capture"
      className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold tracking-tight text-zinc-900">
            采集当前页职位
          </h2>
          <p className="mt-1 max-w-2xl text-[11.5px] leading-5 text-zinc-500">
            不用装插件：把下面这个按钮拖到浏览器书签栏。打开招聘网站的搜索结果页后点一下书签，
            当前页已渲染的职位会带回来预览，再选择加入待投清单。
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10.5px] text-zinc-500">
          仅读当前页 · 不自动翻页
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          ref={linkRef}
          href="#"
          draggable
          data-qa="bookmarklet-link"
          onClick={(event) => {
            event.preventDefault();
            void copyCode();
          }}
          onDragStart={(event) => {
            event.dataTransfer.setData(
              "text/uri-list",
              buildBookmarklet(window.location.origin),
            );
          }}
          className="inline-flex cursor-grab items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-[12.5px] font-medium text-white transition hover:bg-zinc-700 active:cursor-grabbing"
        >
          <span aria-hidden="true">↗</span>
          采集本页职位
        </a>
        <button
          type="button"
          data-qa="bookmarklet-copy"
          onClick={() => void copyCode()}
          className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11.5px] text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
        >
          复制书签代码
        </button>
        <span className="text-[11px] text-zinc-400">
          拖到书签栏，或点按钮复制后手动新建书签
        </span>
      </div>

      <ol className="mt-4 grid gap-1.5 text-[11.5px] leading-5 text-zinc-500 sm:grid-cols-3">
        <li>1. 拖到书签栏 / 新建书签</li>
        <li>2. 打开 BOSS / 拉勾 / 猎聘搜索结果页</li>
        <li>3. 点书签，回到应用预览</li>
      </ol>

      {notice ? (
        <p role="status" className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-[11.5px] text-zinc-600">
          {notice}
        </p>
      ) : null}

      <p className="mt-3 text-[10.5px] leading-5 text-zinc-400">
        书签只读取当前页已显示的内容，不自动翻页、不后台定时抓取、不绕过验证码；
        职位与投递请以原站为准。浏览器若拦截弹窗，请允许本站弹出窗口。
      </p>
    </section>
  );
}
