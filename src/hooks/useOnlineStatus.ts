"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const getSnapshot = () => navigator.onLine;
/** 服务端与首帧按在线处理，挂载后再读取真实网络状态。 */
const getServerSnapshot = () => true;

/** 订阅浏览器在线状态；离线时编辑器仍可编辑并保存到 localStorage。 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
