import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const SITE_NAME = "简历工坊";
const SITE_TITLE = "简历工坊 · 简历制作与求职推荐";
const SITE_DESCRIPTION =
  "在浏览器里写简历、切换模板、导出 PDF，并根据简历生成国内招聘网站的精准搜索入口。";

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  applicationName: SITE_NAME,
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: [
    "简历制作",
    "简历模板",
    "PDF 简历",
    "求职",
    "JD 匹配",
    "招聘网站搜索",
    "AI 写简历",
  ],
  category: "productivity",
  other: {
    // Vercel 构建时注入提交号，便于确认线上部署的是哪个版本；本地构建为 dev。
    "build-sha": process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
  },
  alternates: {
    canonical: "/",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#1d4ed8",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
