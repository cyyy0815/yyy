"use client";

import { useEffect, useRef, useState } from "react";

const CACHE_PREFIX = "resume-workshop-";

/** 开发模式下清掉生产构建留下的 SW 与缓存，避免 HMR 读到旧资源。 */
async function clearDevelopmentServiceWorkers() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX))
          .map((key) => caches.delete(key)),
      );
    }
  } catch {
    // 开发模式清理失败不影响使用。
  }
}

type ServiceWorkerState = "registered" | "dev" | "unsupported" | "failed";

function markServiceWorkerState(state: ServiceWorkerState) {
  document.documentElement.dataset.serviceWorker = state;
}

/**
 * 注册离线缓存用的 Service Worker，并在新版本就绪时提示刷新。
 *
 * 页面通过 `<html data-service-worker>` 暴露注册状态，浏览器 QA 依赖该标记
 * 区分开发 / 生产模式；生产环境只用缓存优先策略服务静态资源，不拦截 AI 接口。
 */
export function ServiceWorkerRegister() {
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadRequested = useRef(false);
  const reloadTimer = useRef(0);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      markServiceWorkerState("unsupported");
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      markServiceWorkerState("dev");
      void clearDevelopmentServiceWorkers();
      return;
    }

    let disposed = false;

    const onControllerChange = () => {
      if (reloadRequested.current) {
        window.clearTimeout(reloadTimer.current);
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    const watch = (registration: ServiceWorkerRegistration) => {
      registrationRef.current = registration;
      markServiceWorkerState("registered");

      // 已经有等待中的新版本（例如刷新前刚好下载完成）。
      if (registration.waiting && navigator.serviceWorker.controller) {
        setUpdateReady(true);
      }

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          // 首次安装没有 controller，不属于「更新」，不打扰用户。
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (disposed) return;
        watch(registration);
      })
      .catch(() => {
        if (disposed) return;
        markServiceWorkerState("failed");
      });

    return () => {
      disposed = true;
      window.clearTimeout(reloadTimer.current);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  const applyUpdate = () => {
    reloadRequested.current = true;
    const waiting = registrationRef.current?.waiting;
    if (waiting) {
      waiting.postMessage({ type: "SKIP_WAITING" });
      // 兜底：个别浏览器不触发 controllerchange 时也刷新一次。
      reloadTimer.current = window.setTimeout(
        () => window.location.reload(),
        3000,
      );
    } else {
      window.location.reload();
    }
  };

  if (!updateReady || dismissed) return null;

  return (
    <div
      role="status"
      data-qa="sw-update"
      className="print-hide fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-zinc-200 bg-white/95 px-4 py-2.5 text-[12.5px] text-zinc-700 shadow-lg backdrop-blur"
    >
      <span>新版本已就绪，刷新后生效</span>
      <button
        type="button"
        onClick={applyUpdate}
        className="rounded-full bg-zinc-900 px-3 py-1 text-[12px] font-medium text-white transition hover:bg-zinc-700"
      >
        刷新
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="稍后更新"
        className="text-zinc-400 transition hover:text-zinc-700"
      >
        ×
      </button>
    </div>
  );
}
