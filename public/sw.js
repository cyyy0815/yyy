/* 简历工坊 Service Worker：应用外壳离线缓存。
 *
 * 策略：
 * - 导航请求：网络优先，失败时回退到预缓存的 `/`，保证刷新后离线仍能编辑。
 * - `/_next/static/*`：缓存优先（文件名带内容哈希，可长期缓存）。
 * - 同源图标 / manifest / 字体：stale-while-revalidate。
 * - `/api/*`、非 GET、跨域请求：完全不拦截，避免缓存 AI 响应或个人信息。
 *
 * 发布新版本时只需改动 VERSION；activate 会清理旧缓存。
 * `/sw.js` 自身由 next.config.ts 的 no-store 响应头保证及时更新。
 */
const VERSION = "v1";
const CACHE_PREFIX = "resume-workshop-";
const SHELL_CACHE = `${CACHE_PREFIX}shell-${VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}static-${VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, STATIC_CACHE, RUNTIME_CACHE];
const ASSET_URLS = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon.png",
];
const OFFLINE_HTML = `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>简历工坊 · 离线</title></head>
<body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#faf9f7;color:#3f3f46;font-family:system-ui,sans-serif">
<main style="max-width:360px;padding:24px;text-align:center">
<h1 style="font-size:18px">当前处于离线状态</h1>
<p style="font-size:13px;line-height:1.7">这台浏览器还没有缓存应用页面。联网后重新打开一次，之后即使断网也能继续编辑。</p>
</main>
</body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) => key.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.includes(key),
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;
  // AI 接口等动态内容必须联网，不进入任何缓存。
  if (url.pathname.startsWith("/api/")) return;
  // RSC 预取载荷带查询串，与 HTML 分开处理，避免离线时混用。
  if (url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "manifest"
  ) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});

async function precache() {
  const shell = await caches.open(SHELL_CACHE);

  // 首页 HTML 含 Next 的启动数据，同时解析出本次构建的静态资源一并缓存。
  try {
    const response = await fetch(new Request("/", { cache: "reload" }));
    if (response.ok) {
      await shell.put("/", response.clone());
      const html = await response.text();
      const assets = new Set();
      const pattern = /(?:src|href)="(\/_next\/static\/[^"]+)"/g;
      let match = pattern.exec(html);
      while (match) {
        assets.add(match[1].replace(/&amp;/g, "&"));
        match = pattern.exec(html);
      }
      const staticCache = await caches.open(STATIC_CACHE);
      await Promise.all(
        [...assets].map(async (asset) => {
          try {
            const assetResponse = await fetch(
              new Request(asset, { cache: "reload" }),
            );
            if (assetResponse.ok) {
              await staticCache.put(asset, assetResponse);
            }
          } catch {
            // 单个资源失败不影响外壳安装，联网后首次访问会补齐。
          }
        }),
      );

      // 字体、背景图等由 CSS 间接引用，不解析会缺资源。当前项目没有，
      // 但加上后引入 next/font 或 CSS 图片时离线首屏不会掉字体 / 背景。
      const nestedAssets = new Set();
      await Promise.all(
        [...assets]
          .filter((asset) => asset.endsWith(".css"))
          .map(async (cssUrl) => {
            try {
              const cssResponse = await staticCache.match(cssUrl);
              if (!cssResponse) return;
              const css = await cssResponse.text();
              const pattern = /url\((["']?)([^)"']+)\1\)/g;
              let nested = pattern.exec(css);
              while (nested) {
                const raw = nested[2].trim();
                if (!raw.startsWith("data:") && !raw.startsWith("http")) {
                  try {
                    const resolved = new URL(
                      raw,
                      new URL(cssUrl, self.location.origin),
                    );
                    if (resolved.origin === self.location.origin) {
                      nestedAssets.add(resolved.pathname);
                    }
                  } catch {
                    // 忽略无法解析的 url()。
                  }
                }
                nested = pattern.exec(css);
              }
            } catch {
              // 解析失败不影响外壳安装。
            }
          }),
      );
      await Promise.all(
        [...nestedAssets].map(async (asset) => {
          try {
            const assetResponse = await fetch(
              new Request(asset, { cache: "reload" }),
            );
            if (assetResponse.ok) {
              await staticCache.put(asset, assetResponse);
            }
          } catch {
            // 同上。
          }
        }),
      );
    }
  } catch {
    // 安装阶段网络异常时仍允许 SW 激活；后续在线导航会重新写入外壳。
  }

  await Promise.all(
    ASSET_URLS.map(async (url) => {
      try {
        const response = await fetch(new Request(url, { cache: "reload" }));
        if (response.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          await cache.put(url, response);
        }
      } catch {
        // 同上：非关键资源失败可忽略。
      }
    }),
  );
}

async function handleNavigation(request) {
  try {
    // no-cache：每次都向服务器确认 HTML，避免部署后仍用旧页面对应已删除的 chunk。
    const response = await fetch(request, { cache: "no-cache" });
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put("/", response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match("/", { cacheName: SHELL_CACHE });
    if (cached) return cached;
    return new Response(OFFLINE_HTML, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(cacheName);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  const response = await network;
  if (response) return response;
  throw new Error("offline");
}
