import type { NextConfig } from "next";
import {
  securityHeaders,
  serviceWorkerHeaders,
} from "./src/lib/securityHeaders";

const nextConfig: NextConfig = {
  /* config options here */
  poweredByHeader: false,
  env: {
    // 构建号给 Service Worker 做版本：每次部署换一个 script URL，触发更新与旧缓存清理。
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "dev",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(process.env.NODE_ENV !== "production"),
      },
      {
        source: "/sw.js",
        headers: serviceWorkerHeaders(),
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
