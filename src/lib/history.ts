/**
 * 与 React 无关的撤销 / 重做栈。
 *
 * 快照按引用保存：本项目的简历更新全部是函数式不可变更新，旧对象不会被原地修改，
 * 因此不需要深拷贝，撤销栈里保存的引用仍然有效。
 *
 * 连续输入会合并成一步：同一次「可合并」的修改若距上一次不超过 mergeWindowMs，
 * 就不再压入新的快照。第一个快照始终是这段输入开始前的状态。
 */

export const HISTORY_LIMIT = 60;
export const HISTORY_MERGE_MS = 700;

type HistoryOptions = {
  limit?: number;
  mergeWindowMs?: number;
};

export type HistoryState<T> = {
  past: T[];
  future: T[];
};

export type History<T> = {
  /** 记录「修改前」的快照；mergeable 为 true 时允许与上一段连续输入合并。 */
  record: (previous: T, mergeable: boolean, now?: number) => void;
  /** 撤销：返回上一份快照，并把当前状态压入重做栈；无可撤销时返回 null。 */
  undo: (current: T) => T | null;
  /** 重做：返回下一份快照，并把当前状态压回撤销栈；无可重做时返回 null。 */
  redo: (current: T) => T | null;
  reset: () => void;
  /** 导出两份栈的副本，供会话存储序列化。 */
  exportState: () => HistoryState<T>;
  /** 从会话存储恢复栈；恢复后连续输入不会与旧步骤合并。 */
  importState: (state: HistoryState<T>) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  size: () => number;
};

export function createHistory<T>(options: HistoryOptions = {}): History<T> {
  const limit = options.limit ?? HISTORY_LIMIT;
  const mergeWindowMs = options.mergeWindowMs ?? HISTORY_MERGE_MS;
  const past: T[] = [];
  const future: T[] = [];
  let lastRecordedAt = 0;
  let lastMergeable = false;

  function trim(list: T[]) {
    if (list.length > limit) list.splice(0, list.length - limit);
  }

  function record(previous: T, mergeable: boolean, now = Date.now()) {
    // 任何新修改都会让「重做」失效。
    future.length = 0;
    const canMerge =
      mergeable &&
      lastMergeable &&
      past.length > 0 &&
      now - lastRecordedAt < mergeWindowMs;
    if (!canMerge) {
      past.push(previous);
      trim(past);
    }
    lastRecordedAt = now;
    lastMergeable = mergeable;
  }

  function undo(current: T): T | null {
    const previous = past.pop();
    if (previous === undefined) return null;
    future.push(current);
    trim(future);
    // 撤销之后的新修改必须单独成为一步，不能和撤销前的输入合并。
    lastRecordedAt = 0;
    lastMergeable = false;
    return previous;
  }

  function redo(current: T): T | null {
    const next = future.pop();
    if (next === undefined) return null;
    past.push(current);
    trim(past);
    lastRecordedAt = 0;
    lastMergeable = false;
    return next;
  }

  function reset() {
    past.length = 0;
    future.length = 0;
    lastRecordedAt = 0;
    lastMergeable = false;
  }

  function exportState(): HistoryState<T> {
    return { past: [...past], future: [...future] };
  }

  function importState(state: HistoryState<T>) {
    past.length = 0;
    future.length = 0;
    past.push(...state.past.slice(-limit));
    future.push(...state.future.slice(-limit));
    lastRecordedAt = 0;
    lastMergeable = false;
  }

  return {
    record,
    undo,
    redo,
    reset,
    exportState,
    importState,
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    size: () => past.length,
  };
}
