import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OfflineBanner } from "../OfflineBanner";

// restoreMocks 会在每个用例前恢复 spy，必须在 beforeEach 里重新创建。
let onlineGetter: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  onlineGetter = vi.spyOn(navigator, "onLine", "get");
});

afterEach(() => {
  onlineGetter.mockRestore();
});

function setOnline(value: boolean) {
  onlineGetter.mockReturnValue(value);
  act(() => {
    window.dispatchEvent(new Event(value ? "online" : "offline"));
  });
}

describe("OfflineBanner", () => {
  it("在线时不渲染任何内容", () => {
    onlineGetter.mockReturnValue(true);
    const { container } = render(<OfflineBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("离线时提示仍可编辑并说明联网限制", () => {
    onlineGetter.mockReturnValue(false);
    render(<OfflineBanner />);

    const banner = screen.getByRole("status");
    expect(banner).toHaveAttribute("data-qa", "offline-banner");
    expect(banner).toHaveTextContent("离线");
    expect(banner).toHaveTextContent("编辑、预览与导出仍可使用");
    expect(banner).toHaveTextContent("AI 写作与招聘网站链接需要联网");
  });

  it("网络恢复后自动隐藏，再次离线时重新出现", () => {
    onlineGetter.mockReturnValue(false);
    render(<OfflineBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    setOnline(true);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    setOnline(false);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
