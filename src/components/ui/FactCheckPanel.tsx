import type { FactWarning } from "@/lib/ai/factCheck";

const KIND_LABELS: Record<FactWarning["kind"], string> = {
  number: "数字",
  skill: "技能",
  name: "名称",
};

const MAX_VISIBLE = 6;

/**
 * AI 生成后的事实核对提示：只做字面比对，列出素材里找不到依据的内容。
 * 不阻止采用，避免把正常的同义改写误判成错误。
 */
export function FactCheckPanel({
  warnings,
  sourceLabel = "素材",
}: {
  warnings: FactWarning[];
  sourceLabel?: string;
}) {
  if (warnings.length === 0) {
    return (
      <div
        data-qa="fact-check"
        data-warning-count={0}
        className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11.5px] leading-5 text-emerald-800"
      >
        事实核对：未发现{sourceLabel}之外的数字、技能或名称。采用前仍建议通读确认。
      </div>
    );
  }

  const visible = warnings.slice(0, MAX_VISIBLE);
  const hidden = warnings.length - visible.length;

  return (
    <div
      data-qa="fact-check"
      data-warning-count={warnings.length}
      role="status"
      className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2"
    >
      <p className="text-[12px] font-medium text-amber-900">
        事实核对：{warnings.length} 项内容在{sourceLabel}中没有找到依据
      </p>
      <ul className="mt-1 space-y-1">
        {visible.map((warning, index) => (
          <li
            key={`${warning.kind}-${warning.value}-${index}`}
            className="flex gap-1.5 text-[11.5px] leading-5 text-amber-900"
          >
            <span className="mt-px shrink-0 rounded bg-amber-100 px-1 text-[10px] text-amber-700">
              {KIND_LABELS[warning.kind]}
            </span>
            <span>{warning.message}</span>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <p className="mt-1 text-[10.5px] leading-4 text-amber-700">
          另有 {hidden} 项未显示，请整体核对。
        </p>
      ) : null}
      <p className="mt-1 text-[10.5px] leading-4 text-amber-700">
        这里只做字面比对，不会自动改动内容；确认无误后再采用。
      </p>
    </div>
  );
}
