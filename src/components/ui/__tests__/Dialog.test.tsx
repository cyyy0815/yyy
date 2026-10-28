import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "../Dialog";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        打开弹窗
      </button>
      {open ? (
        <Dialog
          title="测试弹窗"
          description="说明文字"
          onClose={() => setOpen(false)}
          footer={
            <button type="button" onClick={() => setOpen(false)}>
              底部按钮
            </button>
          }
        >
          <button type="button">第一个按钮</button>
          <button type="button">第二个按钮</button>
          <input aria-label="测试输入框" />
        </Dialog>
      ) : null}
    </>
  );
}

async function openDialog() {
  const user = userEvent.setup();
  render(<Harness />);
  const trigger = screen.getByRole("button", { name: "打开弹窗" });
  await user.click(trigger);
  return { user, trigger };
}

beforeEach(() => {
  // jsdom 没有布局，统一返回一个非空矩形，让焦点陷阱能收集到控件。
  vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([
    {
      width: 1,
      height: 1,
      top: 0,
      left: 0,
      right: 1,
      bottom: 1,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    },
  ] as unknown as DOMRectList);
});

describe("Dialog", () => {
  it("渲染模态语义、标题与描述，并把焦点放进面板", async () => {
    await openDialog();
    const dialog = screen.getByRole("dialog", { name: "测试弹窗" });

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("说明文字");
    expect(dialog).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("Escape 关闭并归还焦点，恢复背景滚动", async () => {
    const { trigger } = await openDialog();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape", isComposing: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("关闭按钮与遮罩可关闭，点击面板内部不会关闭", async () => {
    const { trigger } = await openDialog();
    const dialog = screen.getByRole("dialog");

    fireEvent.mouseDown(dialog, { button: 0 });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.mouseDown(dialog.parentElement as HTMLElement, { button: 0 });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await userEvent.setup().click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Tab / Shift+Tab 在首尾控件之间循环", async () => {
    const { user } = await openDialog();
    const dialog = screen.getByRole("dialog");
    const close = screen.getByRole("button", { name: "关闭" });
    const footer = screen.getByRole("button", { name: "底部按钮" });

    expect(dialog).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(footer).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();
  });
});
