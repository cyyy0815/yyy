"use client";

import { useCallback, useEffect, useState } from "react";
import {
  APPLICATIONS_EVENT,
  readApplications,
  saveApplications,
  type JobApplication,
} from "@/lib/applications";

/**
 * 投递记录只存在本机；同一标签页的写入通过自定义事件同步，
 * 其他标签页通过 storage 事件同步。
 */
export function useApplications() {
  const [applications, setApplications] = useState<JobApplication[]>(
    readApplications,
  );
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    const refresh = () => setApplications(readApplications());
    window.addEventListener("storage", refresh);
    window.addEventListener(APPLICATIONS_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(APPLICATIONS_EVENT, refresh);
    };
  }, []);

  const update = useCallback((next: JobApplication[]) => {
    const ok = saveApplications(next);
    setSaveError(!ok);
    if (ok) setApplications(readApplications());
    return ok;
  }, []);

  return { applications, update, saveError };
}
