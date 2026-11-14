const FALLBACK_URL = "http://localhost:3000";

/**
 * 站点绝对地址：分享卡片、canonical、sitemap 都依赖它。
 * 优先级：显式配置 → Vercel 生产域名 → 本地开发。
 */
export function resolveSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const vercelUrl = vercel
    ? /^https?:\/\//i.test(vercel)
      ? vercel
      : `https://${vercel}`
    : "";
  const candidate = configured || vercelUrl || FALLBACK_URL;
  try {
    return new URL(candidate);
  } catch {
    return new URL(FALLBACK_URL);
  }
}

export const SITE_URL = resolveSiteUrl();
