/**
 * 通用格式化工具
 *
 * 统一日期时间、文件大小、进度、百分比等展示格式，避免各页面重复定义。
 * 日期类工具基于 dayjs，按后端无时区 timestamp 字符串原样解析与展示，不做 UTC/时区转换。
 */

import dayjs from 'dayjs'

/** 空值占位符（与 Ant Design Vue 列表默认一致） */
export const DASH_PLACEHOLDER = '-'

/**
 * 成绩/指标展示精度上下文。
 * - score：原始分数，1 位小数
 * - fullScore：满分上限，整数
 * - percent：百分比数值，1 位小数（不含 % 后缀）
 * - achievement：达成度等指标，3 位小数
 * - count：人数/次数等计数，整数
 */
export type ScoreFormatContext = 'score' | 'fullScore' | 'percent' | 'achievement' | 'count'

const SCORE_FORMAT_DECIMALS: Record<ScoreFormatContext, number> = {
  score: 1,
  fullScore: 0,
  percent: 1,
  achievement: 3,
  count: 0,
}

/**
 * 统一格式化分数、百分比、达成度与计数值展示。
 */
export function formatScore(
  value: number | string | null | undefined,
  context: ScoreFormatContext = 'score',
  fallback: string = DASH_PLACEHOLDER,
): string {
  if (value === null || value === undefined || value === '') {
    return fallback
  }
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return fallback
  }
  if (context === 'count' || context === 'fullScore') {
    return String(Math.round(num))
  }
  return num.toFixed(SCORE_FORMAT_DECIMALS[context])
}

/** 格式化为带 % 后缀的百分比文案 */
export function formatScorePercent(
  value: number | string | null | undefined,
  fallback: string = DASH_PLACEHOLDER,
): string {
  if (value === null || value === undefined || value === '') {
    return fallback
  }
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return fallback
  }
  return `${formatScore(num, 'percent')}%`
}

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

/** 考试时间窗相对阶段：未开始 / 进行中 / 已结束。 */
export type ExamWindowPhase = 'upcoming' | 'ongoing' | 'ended'

/**
 * 解析考试时间窗相对阶段；起止时间任一无效时返回 null。
 */
export function resolveExamWindowPhase(
  start: DateLike,
  end: DateLike,
  now: dayjs.Dayjs = dayjs(),
): ExamWindowPhase | null {
  const startAt = dayjs(start)
  const endAt = dayjs(end)
  if (!startAt.isValid() || !endAt.isValid()) {
    return null
  }
  if (now.isBefore(startAt)) {
    return 'upcoming'
  }
  if (now.isAfter(endAt)) {
    return 'ended'
  }
  return 'ongoing'
}

/**
 * 考试时间窗相对阶段文案：如「3 天后开始」「进行中」「已结束」。
 */
export function formatExamWindowPhaseLabel(
  start: DateLike,
  end: DateLike,
  now: dayjs.Dayjs = dayjs(),
): string {
  const phase = resolveExamWindowPhase(start, end, now)
  if (!phase) {
    return DASH_PLACEHOLDER
  }
  if (phase === 'ongoing') {
    return '进行中'
  }
  if (phase === 'ended') {
    return '已结束'
  }
  const startAt = dayjs(start)
  const diffMinutes = startAt.diff(now, 'minute')
  if (diffMinutes <= 60) {
    return '即将开始'
  }
  const diffHours = startAt.diff(now, 'hour')
  if (diffHours < 24) {
    return `${diffHours} 小时后开始`
  }
  const diffDays = startAt.startOf('day').diff(now.startOf('day'), 'day')
  if (diffDays === 1) {
    return '明天开始'
  }
  if (diffDays === 0) {
    return `今天 ${startAt.format('HH:mm')} 开始`
  }
  return `${diffDays} 天后开始`
}

/**
 * 紧凑格式化考试时间窗：同天 MM/DD HH:mm-HH:mm；跨天同月省略结束侧月份；跨年补年份。
 */
export function formatExamWindowCompactRange(
  start: DateLike,
  end: DateLike,
  fallback: string = DASH_PLACEHOLDER,
): string {
  const startAt = dayjs(start)
  const endAt = dayjs(end)
  if (!startAt.isValid() && !endAt.isValid()) {
    return fallback
  }
  if (startAt.isValid() && !endAt.isValid()) {
    return `${startAt.format('MM/DD HH:mm')} 起`
  }
  if (!startAt.isValid() && endAt.isValid()) {
    return `${endAt.format('MM/DD HH:mm')} 止`
  }
  const formatClock = (value: dayjs.Dayjs): string => value.format('HH:mm')
  if (startAt.isSame(endAt, 'day')) {
    return `${startAt.format('MM/DD')} ${formatClock(startAt)}-${formatClock(endAt)}`
  }
  if (startAt.isSame(endAt, 'month')) {
    return `${startAt.format('MM/DD')} ${formatClock(startAt)}-${endAt.format('DD')} ${formatClock(endAt)}`
  }
  if (startAt.isSame(endAt, 'year')) {
    return `${startAt.format('MM/DD')} ${formatClock(startAt)}-${endAt.format('MM/DD')} ${formatClock(endAt)}`
  }
  return `${startAt.format('YYYY/MM/DD')} ${formatClock(startAt)}-${endAt.format('YYYY/MM/DD')} ${formatClock(endAt)}`
}

/** 完整考试时间窗，用于列表 hover 提示。 */
export function formatExamWindowFullRange(
  start: DateLike,
  end: DateLike,
  fallback: string = DASH_PLACEHOLDER,
): string {
  const startAt = dayjs(start)
  const endAt = dayjs(end)
  if (!startAt.isValid() && !endAt.isValid()) {
    return fallback
  }
  if (startAt.isValid() && endAt.isValid()) {
    return `${formatDateTime(start)} ~ ${formatDateTime(end)}`
  }
  if (startAt.isValid()) {
    return `${formatDateTime(start)} 起`
  }
  return `${formatDateTime(end)} 止`
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
 * 任务池会话下拉等场景的紧凑时间：24 小时内展示相对时间，更早则 MM/DD HH:mm。
 */
export function formatSessionOptionTime(value: DateLike, now: dayjs.Dayjs = dayjs()): string {
  if (value === null || value === undefined || value === '') {
    return DASH_PLACEHOLDER
  }
  const date = dayjs(value)
  if (!date.isValid()) {
    return DASH_PLACEHOLDER
  }
  const diffMinutes = now.diff(date, 'minute')
  if (diffMinutes < 1) {
    return '刚刚'
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`
  }
  const diffHours = now.diff(date, 'hour')
  if (diffHours < 24) {
    return `${diffHours} 小时前`
  }
  return date.format('MM/DD HH:mm')
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
