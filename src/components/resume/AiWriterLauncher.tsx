"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/Button";
import type { Resume } from "@/lib/types";

/**
 * AI 写作的轻入口：卡片始终在首屏，AiWriter（弹窗 + 流式生成 + 事实核对）
 * 第一次点「开始生成」时才下载，避免默认不用的 AI 栈进入首屏 chunk。
 */
const AiWriter = dynamic(
  () => import("@/components/resume/AiWriter").then((mod) => mod.AiWriter),
  { ssr: false },
);

type Props = {
  resume: Resume;
  onChange: Dispatch<SetStateAction<Resume>>;
  onCreateDocument: (resume: Resume, title: string) => boolean;
  /** 外部（待投清单「按 JD 优化简历」）请求打开 */
  aiOpenRequest?: number;
  onAiOpenConsumed?: () => void;
};

export function AiWriterLauncher({
  resume,
  onChange,
  onCreateDocument,
  aiOpenRequest = 0,
  onAiOpenConsumed,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [openRequest, setOpenRequest] = useState(0);
  const consumedRef = useRef(0);

  const open = () => {
    setMounted(true);
    setOpenRequest((value) => value + 1);
  };

  // 外部请求只消费一次；回调可能是内联函数，不放进依赖。
  // 父组件消费后会把它置回 0，这里同步清空标记，下一次从 0 → 1 仍能重新打开。
  useEffect(() => {
    if (!aiOpenRequest) {
      consumedRef.current = 0;
      return;
    }
    if (consumedRef.current === aiOpenRequest) return;
    consumedRef.current = aiOpenRequest;
    setMounted(true);
    setOpenRequest((value) => value + 1);
    onAiOpenConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiOpenRequest]);

  return (
    <>
      <div className="print-hide flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-gradient-to-r from-blue-50/80 via-white to-white px-4 py-3">
        <div>
          <p className="text-[13px] font-semibold text-zinc-900">AI 帮我写</p>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            生成单板块草稿，或用一段个人经历直接生成整份简历。
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={open}
          className="border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
        >
          开始生成
        </Button>
      </div>

      {mounted ? (
        <AiWriter
          resume={resume}
          onChange={onChange}
          onCreateDocument={onCreateDocument}
          openRequest={openRequest}
          hideTrigger
        />
      ) : null}
    </>
  );
}
