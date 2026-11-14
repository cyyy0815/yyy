import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createEmptyResume } from "@/lib/types";

// 只验证入口的挂载 / 请求消费逻辑，不真的加载 AiWriter 与它的 AI 依赖。
vi.mock("next/dynamic", () => ({
  default: () =>
    function MockAiWriter(props: { openRequest?: number }) {
      return <div data-testid="ai-panel" data-open={props.openRequest ?? 0} />;
    },
}));

import { AiWriterLauncher } from "../AiWriterLauncher";

const baseProps = {
  resume: createEmptyResume(),
  onChange: vi.fn(),
  onCreateDocument: () => true,
};

describe("AiWriterLauncher", () => {
  it("默认不挂载 AI 面板，点入口后才加载", async () => {
    render(<AiWriterLauncher {...baseProps} />);
    expect(screen.queryByTestId("ai-panel")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "开始生成" }));
    expect(screen.getByTestId("ai-panel")).toHaveAttribute("data-open", "1");
  });

  it("外部请求被置回 0 后，下一次 0 → 1 仍能重新打开", () => {
    const onConsumed = vi.fn();
    const { rerender } = render(
      <AiWriterLauncher
        {...baseProps}
        aiOpenRequest={1}
        onAiOpenConsumed={onConsumed}
      />,
    );
    expect(screen.getByTestId("ai-panel")).toHaveAttribute("data-open", "1");
    expect(onConsumed).toHaveBeenCalledTimes(1);

    rerender(
      <AiWriterLauncher
        {...baseProps}
        aiOpenRequest={0}
        onAiOpenConsumed={onConsumed}
      />,
    );
    rerender(
      <AiWriterLauncher
        {...baseProps}
        aiOpenRequest={1}
        onAiOpenConsumed={onConsumed}
      />,
    );
    expect(screen.getByTestId("ai-panel")).toHaveAttribute("data-open", "2");
    expect(onConsumed).toHaveBeenCalledTimes(2);
  });
});
