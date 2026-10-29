export type SecurityHeader = { key: string; value: string };

const BASE_HEADERS: SecurityHeader[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

/**
 * 全站安全响应头。开发模式额外放行 React 调试所需的 eval 与 HMR WebSocket。
 * CSP 保留 inline script/style：Next 的内联启动脚本与 React 的行内样式需要它们；
 * 仍通过 source 白名单、frame-ancestors 与 object-src 限制高风险加载。
 */
export function securityHeaders(isDev: boolean): SecurityHeader[] {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
  ].join("; ");

  return [...BASE_HEADERS, { key: "Content-Security-Policy", value: csp }];
}

/**
 * `/sw.js` 专用响应头：脚本不能被缓存，否则用户会长期停留在旧版本。
 * `Service-Worker-Allowed` 明确作用域为站点根路径。
 */
export function serviceWorkerHeaders(): SecurityHeader[] {
  return [
    { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
    { key: "Service-Worker-Allowed", value: "/" },
  ];
}
