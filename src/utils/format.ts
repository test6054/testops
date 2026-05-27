/**
 * 通用格式化工具
 *
 * 统一日期时间、文件大小、进度、百分比等展示格式，避免各页面重复定义。
 * 日期类工具基于项目已引入的 dayjs，确保跨页面一致并支持时区扩展。
 */

import dayjs from 'dayjs'

/** 空值占位符（与 Ant Design Vue 列表默认一致） */
export const DASH_PLACEHOLDER = '-'

type DateLike = string | number | Date | null | undefined

/**
 * 内部：根据 fallback 返回占位或正常格式化结果。
 */
function formatWithDayjs(value: DateLike, pattern: string, fallback: string): string {
  if (value === null || value === undefined || value === '') return fallback
  const d = dayjs(value)
  return d.isValid() ? d.format(pattern) : fallback
}

/**
 * 格式化日期时间到分钟：YYYY-MM-DD HH:mm。
 *
 * 用于列表、表格、详情等大多数“创建时间 / 更新时间”的展示。
 */
export function formatDateTime(value: DateLike, fallback: string = DASH_PLACEHOLDER): string {
  return formatWithDayjs(value, 'YYYY-MM-DD HH:mm', fallback)
}

/**
 * 格式化日期时间到秒：YYYY-MM-DD HH:mm:ss。
 *
 * 用于扫描、推送、审计等需要秒级追溯的场景。
 */
export function formatDateTimeWithSeconds(value: DateLike, fallback: string = DASH_PLACEHOLDER): string {
  return formatWithDayjs(value, 'YYYY-MM-DD HH:mm:ss', fallback)
}

/**
 * 格式化日期（仅日期部分）：YYYY-MM-DD。
 */
export function formatDate(value: DateLike, fallback: string = DASH_PLACEHOLDER): string {
  return formatWithDayjs(value, 'YYYY-MM-DD', fallback)
}

/**
 * 格式化为一天内的时间：HH:mm:ss。
 *
 * 用于实时监控、心跳等只需展示时分秒的场景。
 */
export function formatTimeOfDay(value: DateLike, fallback: string = DASH_PLACEHOLDER): string {
  return formatWithDayjs(value, 'HH:mm:ss', fallback)
}

/**
 * 格式化进度值到 0-100 闭区间。
 *
 * 用于统计图表，避免百分比越界。
 */
export function formatProgress(progress: number | undefined | null): number {
  if (
    progress === undefined
    || progress === null
    || Number.isNaN(progress)
    || !Number.isFinite(progress)
  ) {
    return 0
  }
  return Math.min(Math.max(Math.round(progress), 0), 100)
}

/**
 * 格式化文件大小（B/KB/MB/GB）。
 */
export function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes || bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
}

/**
 * 格式化百分比，先经 formatProgress 归一到 0-100。
 */
export function formatPercent(value: number | undefined | null, decimals: number = 0): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '0%'
  }
  const formatted = formatProgress(value)
  return `${formatted.toFixed(decimals)}%`
}

/**
 * 安全地解析数字，失败时返回默认值。
 */
export function safeParseNumber(
  value: string | number | boolean | undefined | null,
  defaultValue: number = 0,
): number {
  const parsed = Number(value)
  return Number.isNaN(parsed) || !Number.isFinite(parsed) ? defaultValue : parsed
}
