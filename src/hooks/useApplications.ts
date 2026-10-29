import { useCallback, useEffect, useState } from "react";
import {
  APPLICATIONS_EVENT,
  APPLICATIONS_KEY,
  readApplications,
  saveApplications,
  type JobApplication,
} from "@/lib/applications";

/**
 * 投递记录只存在本机；同一标签页的写入通过自定义事件同步，
 * 其他标签页通过 storage 事件同步。
 *
 * 写入一律「先读最新存储，再在最新数据上改」：多标签页下拿内存里的旧数组
 * 整份回写，会把对方刚新增或刚改过的记录覆盖掉。
 */
export function useApplications() {
  const [applications, setApplications] = useState<JobApplication[]>(
    readApplications,
  );
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      // event.key 为 null 表示整库被清空，也需要重新读。
      if (event.key !== null && event.key !== APPLICATIONS_KEY) return;
      setApplications(readApplications());
    };
    const onLocalChange = () => setApplications(readApplications());
    window.addEventListener("storage", onStorage);
    window.addEventListener(APPLICATIONS_EVENT, onLocalChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(APPLICATIONS_EVENT, onLocalChange);
    };
  }, []);

  const update = useCallback(
    (mutate: (current: JobApplication[]) => JobApplication[]) => {
      const next = mutate(readApplications());
      const ok = saveApplications(next);
      setSaveError(!ok);
      // 写回的是归一化后的结果（去重 id、上限 300 条），以存储为准刷新列表。
      if (ok) setApplications(readApplications());
      return ok;
    },
    [],
  );

  return { applications, update, saveError };
}
