import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const SITE_NAME = "简历工坊";
const SITE_TITLE = "简历工坊 · 简历制作与求职推荐";
const SITE_DESCRIPTION =
  "在浏览器里写简历、切换模板、导出 PDF，并根据简历生成国内招聘网站的精准搜索入口。";

/**
 * 公网部署时设置 NEXT_PUBLIC_SITE_URL，分享卡片才能拿到绝对地址。
 * Vercel 未配置时使用项目生产域名；本地最后回退到 localhost。
 */
function resolveSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const vercelUrl = vercel
    ? /^https?:\/\//i.test(vercel)
      ? vercel
      : `https://${vercel}`
    : "";
  const candidate = configured || vercelUrl || "http://localhost:3000";
  try {
    return new URL(candidate);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(),
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
