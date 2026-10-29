import { cleanAiText } from "./prompt";
import { AI_BILINGUAL_MARKER, type AiLanguage, type AiSection } from "./types";

/** 一次生成得到的两个语言版本；单语模式下只有一个字段有内容。 */
export type AiOutputText = {
  zh: string;
  en: string;
  /** 所选语言需要的内容是否齐全（双语要求中英文都有）。 */
  complete: boolean;
};

function isMarkerLine(line: string): boolean {
  return line.replace(/[`*_#\s]/g, "") === AI_BILINGUAL_MARKER;
}

/** 按独占一行的分隔标记拆出中文与英文；模型漏掉标记时全部保留在中文侧。 */
export function splitBilingualOutput(raw: string): {
  zh: string;
  en: string;
  separated: boolean;
} {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const index = lines.findIndex(isMarkerLine);
  if (index === -1) return { zh: raw, en: "", separated: false };

  return {
    zh: lines.slice(0, index).join("\n"),
    en: lines.slice(index + 1).join("\n"),
    separated: true,
  };
}

/**
 * 把模型的原始输出按语言清洗成可编辑草稿。
 * 英文简介按空格合并，避免中文的「直接拼接」规则把英文单词粘在一起。
 */
export function cleanAiOutput(
  raw: string,
  section: AiSection,
  language: AiLanguage,
): AiOutputText {
  if (language === "en") {
    const en = cleanAiText(raw, section, "en");
    return { zh: "", en, complete: Boolean(en) };
  }

  if (language === "bilingual") {
    const { zh, en, separated } = splitBilingualOutput(raw);
    const cleanZh = cleanAiText(zh, section, "zh");
    const cleanEn = cleanAiText(en, section, "en");
    return {
      zh: cleanZh,
      en: cleanEn,
      complete: separated && Boolean(cleanZh) && Boolean(cleanEn),
    };
  }

  const zh = cleanAiText(raw, section, "zh");
  return { zh, en: "", complete: Boolean(zh) };
}

/** 当前语言下草稿是否有可写入的内容。 */
export function hasAiOutputText(
  draft: Pick<AiOutputText, "zh" | "en"> | null,
  language: AiLanguage,
): boolean {
  if (!draft) return false;
  if (language === "en") return Boolean(draft.en.trim());
  if (language === "bilingual") {
    return Boolean(draft.zh.trim() || draft.en.trim());
  }
  return Boolean(draft.zh.trim());
}
