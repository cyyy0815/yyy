/** 轻量输入校验：只做格式提示，不阻止保存或编辑。 */

const MONTH_RE = /^(\d{4})(?:[.\-/年](\d{1,2})月?)?$/;

function parseMonth(value: string): number | null {
  const match = MONTH_RE.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : 1;
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return year * 12 + (month - 1);
}

function isNow(value: string): boolean {
  return /^(至今|现在|present|now)$/i.test(value.trim());
}

/** 开始/结束时间的组合校验；空值不报错。 */
export function validateDateRange(start: string, end: string): string {
  const startValue = start.trim();
  const endValue = end.trim();
  const startMonth = parseMonth(startValue);
  if (startValue && startMonth === null) {
    return "开始时间格式建议为 2023.05";
  }
  const endMonth = parseMonth(endValue);
  if (endValue && endMonth === null && !isNow(endValue)) {
    return "结束时间格式建议为 2024.06 或 至今";
  }
  if (startMonth !== null && endMonth !== null && startMonth > endMonth) {
    return "开始时间不能晚于结束时间";
  }
  return "";
}

export function validateEmail(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)
    ? ""
    : "邮箱格式不正确，例如 you@example.com";
}

export function validatePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^[+\d\s()-]+$/.test(trimmed)) {
    return "电话只能包含数字、空格、+、- 和括号";
  }
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15
    ? ""
    : "电话位数不正确，请检查区号或手机号";
}

/** 允许省略协议，如 github.com/you；带空格的输入按链接处理失败。 */
export function validateUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/\s/.test(trimmed)) {
    return "链接不能包含空格，例如 github.com/you";
  }
  try {
    const url = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`,
    );
    if (!url.hostname.includes(".") && url.hostname !== "localhost") {
      return "链接格式不正确，例如 github.com/you";
    }
    return "";
  } catch {
    return "链接格式不正确，例如 github.com/you";
  }
}

export function validateName(value: string): string {
  return value.trim() ? "" : "请填写姓名，方便 HR 识别";
}

export function validateSalary(
  min: string,
  max: string,
): { min?: string; max?: string } {
  const parse = (value: string): number | null | "invalid" => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\d+(\.\d+)?$/.test(trimmed)) return "invalid";
    return Number(trimmed);
  };
  const minValue = parse(min);
  const maxValue = parse(max);
  const errors: { min?: string; max?: string } = {};
  if (minValue === "invalid") errors.min = "请输入数字，单位 K";
  if (maxValue === "invalid") errors.max = "请输入数字，单位 K";
  if (
    typeof minValue === "number" &&
    typeof maxValue === "number" &&
    minValue > maxValue
  ) {
    errors.max = "最高月薪不能低于最低月薪";
  }
  return errors;
}
