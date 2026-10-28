"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type DialogSize = "sm" | "md" | "lg" | "xl";

const SIZES: Record<DialogSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableElements(panel: HTMLElement): HTMLElement[] {
  return Array.from(
    panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      element.tabIndex >= 0 &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0,
  );
}

type Props = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: DialogSize;
  dataQa?: string;
  closeDataQa?: string;
  panelData?: Record<`data-${string}`, string | number | boolean | undefined>;
  bodyClassName?: string;
};

/**
 * 统一弹窗：Portal、焦点陷阱、关闭后归还焦点、锁定背景滚动、Escape 关闭。
 * 不带尺寸动画，避免 prefers-reduced-motion 下多余过渡。
 */
export function Dialog({
  title,
  description,
  children,
  footer,
  onClose,
  size = "md",
  dataQa,
  closeDataQa,
  panelData,
  bodyClassName = "",
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      const currentPadding =
        Number.parseFloat(getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }

    // 表单里的 autoFocus 已在提交阶段生效，不要抢走它。
    if (!panel.contains(document.activeElement)) {
      panel.focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (event.isComposing) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusableElements(panel);
      if (items.length === 0) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (active === panel) {
        // 从面板本身出发：正向 Tab 交给浏览器进入第一个控件，反向则回到末尾。
        if (event.shiftKey) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!panel.contains(event.target as Node)) {
        panel.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      if (trigger && document.contains(trigger)) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, []);

  // 弹窗只会在用户交互后挂载，不会参与首屏 SSR；保留兜底避免测试环境没有 document。
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="print-hide fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.button === 0 && event.target === event.currentTarget) {
          onCloseRef.current();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        data-qa={dataQa}
        {...panelData}
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none sm:rounded-2xl ${SIZES[size]}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2
              id={titleId}
              className="text-[15px] font-semibold text-zinc-900"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-0.5 text-[11.5px] leading-5 text-zinc-500"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="关闭"
            data-qa={closeDataQa}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[16px] leading-none text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            ×
          </button>
        </header>

        <div
          className={`flex-1 overflow-y-auto px-5 py-4 ${bodyClassName}`}
        >
          {children}
        </div>

        {footer ? (
          <footer className="border-t border-zinc-100 px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
