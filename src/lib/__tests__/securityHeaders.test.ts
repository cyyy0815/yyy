import { describe, expect, it } from "vitest";
import {
  securityHeaders,
  serviceWorkerHeaders,
  type SecurityHeader,
} from "../securityHeaders";

function toMap(headers: SecurityHeader[]) {
  return Object.fromEntries(headers.map(({ key, value }) => [key, value]));
}

describe("securityHeaders", () => {
  it("生产环境下发基础安全头与不含 unsafe-eval 的 CSP", () => {
    const headers = toMap(securityHeaders(false));
    const csp = headers["Content-Security-Policy"];

    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(headers["Cross-Origin-Resource-Policy"]).toBe("same-origin");
    expect(headers["Strict-Transport-Security"]).toBe("max-age=31536000");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("worker-src 'self'");
  });

  it("开发环境放行 eval 与 HMR WebSocket", () => {
    const csp = toMap(securityHeaders(true))["Content-Security-Policy"];

    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' ws: wss:");
  });

  it("不重复声明响应头", () => {
    const keys = securityHeaders(false).map(({ key }) => key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("serviceWorkerHeaders", () => {
  it("Service Worker 脚本禁止缓存并允许根作用域", () => {
    const headers = toMap(serviceWorkerHeaders());

    expect(headers["Cache-Control"]).toBe(
      "no-cache, no-store, must-revalidate",
    );
    expect(headers["Service-Worker-Allowed"]).toBe("/");
  });

  it("不会覆盖全站安全响应头", () => {
    const keys = serviceWorkerHeaders().map(({ key }) => key);
    const securityKeys = securityHeaders(false).map(({ key }) => key);

    expect(keys.some((key) => securityKeys.includes(key))).toBe(false);
  });
});
