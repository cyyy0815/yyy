import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { CorruptDataBanner } from "../CorruptDataBanner";
import { backupKeyFor } from "@/lib/corruptBackup";

describe("CorruptDataBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("没有损坏数据时不渲染", () => {
    const { container } = render(<CorruptDataBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("有备份时提示可下载，关闭后隐藏", async () => {
    window.localStorage.setItem(
      backupKeyFor("resume-workshop:v1"),
      "{不是合法 JSON",
    );

    render(<CorruptDataBanner />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("原始内容已自动备份");
    expect(
      screen.getByRole("button", { name: "下载备份" }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "关闭损坏数据提示" }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
