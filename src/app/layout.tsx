import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "简历工坊 · 简历制作与求职推荐",
  description:
    "在浏览器里写简历、切换模板、导出 PDF，并根据简历生成国内招聘网站的精准搜索入口。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
