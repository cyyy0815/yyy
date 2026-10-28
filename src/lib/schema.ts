/**
 * 简历数据的 schema 版本。
 *
 * 版本 1 是第一个显式版本；更早的数据没有 `schemaVersion` 字段，按 0 处理。
 * 读取时统一由 `normalizeResume` 收敛并补上当前版本，导出时写入版本号；
 * 导入遇到更高的版本会明确拒绝，避免旧版程序静默丢字段。
 */
export const RESUME_SCHEMA_VERSION = 1;

export function readResumeSchemaVersion(input: unknown): number {
  if (!input || typeof input !== "object" || Array.isArray(input)) return 0;
  const value = (input as Record<string, unknown>).schemaVersion;
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

export function isNewerResumeSchema(input: unknown): boolean {
  return readResumeSchemaVersion(input) > RESUME_SCHEMA_VERSION;
}
