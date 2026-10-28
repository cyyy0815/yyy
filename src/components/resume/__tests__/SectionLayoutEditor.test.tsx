import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { createEmptyResume } from "@/lib/types";
import { DEFAULT_SECTION_ORDER } from "@/lib/types";
import { SectionLayoutEditor } from "../SectionLayoutEditor";

function Harness() {
  const [resume, setResume] = useState(() => {
    const initial = createEmptyResume();
    initial.experiences = [
      {
        id: "exp-1",
        company: "某公司",
        role: "前端工程师",
        start: "2022",
        end: "至今",
        description: "负责 React 项目",
      },
    ];
    return initial;
  });

  return (
    <>
      <SectionLayoutEditor resume={resume} onChange={setResume} />
      <output data-testid="layout-state">{JSON.stringify(resume.layout)}</output>
      <output data-testid="experience-count">{resume.experiences.length}</output>
    </>
  );
}

function readLayout() {
  return JSON.parse(screen.getByTestId("layout-state").textContent ?? "{}") as {
    order: string[];
    hidden: string[];
  };
}

describe("SectionLayoutEditor", () => {
  it("按默认顺序展示七个板块并标出内容数量", () => {
    render(<Harness />);

    expect(screen.getByText("板块显示与排序")).toBeInTheDocument();
    expect(readLayout().order).toEqual(DEFAULT_SECTION_ORDER);
    expect(screen.getByText("1 段")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上移个人简介" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "下移求职意向" })).toBeDisabled();
  });

  it("隐藏板块只改变布局，不删除内容", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "隐藏工作经历" }));

    expect(readLayout().hidden).toEqual(["experience"]);
    expect(screen.getByTestId("experience-count")).toHaveTextContent("1");
    expect(
      screen.getByRole("button", { name: "显示工作经历" }),
    ).toBeInTheDocument();
    expect(screen.getByText("工作经历").closest("[data-hidden]")).toHaveAttribute(
      "data-hidden",
      "true",
    );
  });

  it("上下移动改变顺序，恢复默认会还原顺序与显隐", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "上移项目经历" }));
    expect(readLayout().order.slice(0, 3)).toEqual([
      "summary",
      "projects",
      "experience",
    ]);

    await user.click(screen.getByRole("button", { name: "隐藏项目经历" }));
    await user.click(screen.getByRole("button", { name: "恢复默认" }));

    expect(readLayout()).toEqual({
      order: DEFAULT_SECTION_ORDER,
      hidden: [],
    });
  });
});
