"use client";

import { useEffect, useState } from "react";
import {
  JOB_POOL_EVENT,
  JOB_POOL_KEY,
  readJobPool,
  type PoolJob,
} from "@/lib/jobPool";

/** 岗位池的本地订阅：同标签页事件 + 跨标签页 storage 都刷新。 */
export function useJobPool(): PoolJob[] {
  const [jobs, setJobs] = useState<PoolJob[]>(readJobPool);

  useEffect(() => {
    const refresh = () => setJobs(readJobPool());
    const onStorage = (event: StorageEvent) => {
      if (event.key === JOB_POOL_KEY) refresh();
    };
    window.addEventListener(JOB_POOL_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    // 渲染与 effect 之间可能已有写入，补读一次。
    refresh();
    return () => {
      window.removeEventListener(JOB_POOL_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return jobs;
}
