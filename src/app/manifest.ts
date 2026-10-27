import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "简历工坊 · 简历制作与求职推荐",
    short_name: "简历工坊",
    description:
      "在浏览器里写简历、切换模板、导出 PDF，并根据简历生成国内招聘网站的精准搜索入口。",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#1d4ed8",
    lang: "zh-CN",
    categories: ["productivity", "business"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
