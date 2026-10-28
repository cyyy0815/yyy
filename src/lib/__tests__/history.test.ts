import { describe, expect, it } from "vitest";
import { createHistory } from "../history";

describe("createHistory", () => {
  it("撤销返回上一份快照，重做回到最新状态", () => {
    const history = createHistory<number>();
    history.record(0, true, 0);
    history.record(1, false, 1000);

    expect(history.canUndo()).toBe(true);
    expect(history.undo(2)).toBe(1);
    expect(history.undo(1)).toBe(0);
    expect(history.undo(0)).toBeNull();
    expect(history.canRedo()).toBe(true);
    expect(history.redo(0)).toBe(1);
    expect(history.redo(1)).toBe(2);
    expect(history.redo(2)).toBeNull();
  });

  it("连续输入在时间窗口内合并为一步，超过窗口另起一步", () => {
    const history = createHistory<number>({ mergeWindowMs: 700 });
    history.record(0, true, 0);
    history.record(1, true, 300);
    history.record(2, true, 600);
    expect(history.size()).toBe(1);

    history.record(3, true, 2000);
    expect(history.size()).toBe(2);
    expect(history.undo(4)).toBe(3);
    expect(history.undo(3)).toBe(0);
  });

  it("只有前后两次都允许合并时才合并", () => {
    const history = createHistory<number>({ mergeWindowMs: 700 });
    history.record(0, false, 0);
    history.record(1, true, 100);
    expect(history.size()).toBe(2);
  });

  it("新的修改会清空重做栈", () => {
    const history = createHistory<number>();
    history.record(0, true, 0);
    history.undo(1);
    expect(history.canRedo()).toBe(true);

    history.record(0, true, 10000);
    expect(history.canRedo()).toBe(false);
  });

  it("撤销后的新输入不会合并进撤销前的步骤", () => {
    const history = createHistory<number>({ mergeWindowMs: 700 });
    history.record(0, true, 0);
    history.record(1, true, 100);
    const previous = history.undo(2);
    expect(previous).toBe(0);

    history.record(previous as number, true, 200);
    expect(history.size()).toBe(1);
    expect(history.undo(1)).toBe(0);
  });

  it("超过上限时丢弃最旧的快照", () => {
    const history = createHistory<number>({ limit: 3 });
    for (let value = 0; value < 5; value += 1) {
      history.record(value, false, value * 1000);
    }
    expect(history.size()).toBe(3);
    expect(history.undo(5)).toBe(4);
    expect(history.undo(4)).toBe(3);
    expect(history.undo(3)).toBe(2);
    expect(history.undo(2)).toBeNull();
  });

  it("reset 清空全部历史", () => {
    const history = createHistory<number>();
    history.record(0, true, 0);
    history.undo(1);
    history.reset();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it("导出的是栈副本，修改副本不影响原历史", () => {
    const history = createHistory<number>();
    history.record(0, false, 0);
    const state = history.exportState();
    state.past.push(99);
    expect(history.size()).toBe(1);
    expect(history.undo(1)).toBe(0);
  });

  it("可以从导出状态恢复，且恢复后的输入不会与旧步骤合并", () => {
    const history = createHistory<number>({ mergeWindowMs: 700 });
    history.record(0, false, 0);
    const state = history.exportState();
    const restored = createHistory<number>({ mergeWindowMs: 700 });
    restored.importState(state);

    expect(restored.canUndo()).toBe(true);
    // 恢复后的第一次修改另起一步，不会误合并进刷新前的旧步骤。
    restored.record(5, true, 100);
    expect(restored.size()).toBe(2);
    expect(restored.undo(6)).toBe(5);
    expect(restored.undo(5)).toBe(0);
  });
});
