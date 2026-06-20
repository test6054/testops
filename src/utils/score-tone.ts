import type { BadgeTone } from '@/components/ui-guide/ui/types'

/**
 * 分数 / 比率 / 进度 → 语义色调（BadgeTone）的统一映射。
 *
 * 收敛全前端散落的 `score >= 80 ? '#16a34a' : ...` 硬编码分档色：
 * 颜色真源统一走 BadgeTone，由 UiBadge/UiTag/UiBarChart 等组件按主题渲染，
 * 暗色 / 换肤时不会失效。仅在必须传 CSS color 字符串（内联 style、SVG）
 * 的边界场景才用 toneToColor() 取回主题变量；canvas/SVG 图表调色板见 mark-statistics-chart.ts 的 CHART_PALETTE。
 *
 * scoreTone(80/60/40) 与 progressTone(95/80) 阈值语义不同，不可互换。
 */

/** 达成度 / 分数分档阈值（百分制）：≥优秀线 green，≥及格线 blue，≥关注线 yellow，否则 red */
export interface ScoreThresholds {
  /** 优秀线，默认 80 */
  excellent: number
  /** 及格线，默认 60 */
  pass: number
  /** 关注线（及格边缘），默认 40 */
  attention: number
}

const DEFAULT_SCORE_THRESHOLDS: ScoreThresholds = {
  excellent: 80,
  pass: 60,
  attention: 40,
}

/** 百分制分数 → 色调：≥80 优秀绿 / ≥60 及格蓝 / ≥40 关注黄 / 不及格红 */
export function scoreTone(
  score: number | null | undefined,
  thresholds: ScoreThresholds = DEFAULT_SCORE_THRESHOLDS,
): BadgeTone {
  if (score == null) return 'gray'
  if (score >= thresholds.excellent) return 'green'
  if (score >= thresholds.pass) return 'blue'
  if (score >= thresholds.attention) return 'yellow'
  return 'red'
}

/** 0~1 达成率 → 色调：换算成百分制后复用 scoreTone 的分档语义 */
export function rateTone(rate: number | null | undefined): BadgeTone {
  if (rate == null) return 'gray'
  return scoreTone(rate * 100)
}

/** 扫描 / 处理进度百分比 → 色调：≥95 完成绿 / ≥80 推进橙 / 落后红（对齐扫描链路既有语义） */
export function progressTone(percent: number | null | undefined): BadgeTone {
  if (percent == null) return 'gray'
  if (percent >= 95) return 'green'
  if (percent >= 80) return 'orange'
  return 'red'
}

/**
 * BadgeTone → 主题 CSS 变量色字符串。
 * 取值与 mark-echarts toneToChartColor 色板完全一致，
 * 仅用于内联 style / SVG / a-progress stroke-color 这类必须传 color 字符串的边界。
 */
const TONE_COLOR_MAP: Record<BadgeTone, string> = {
  gray: 'var(--dp-gray-400, #94a3b8)',
  blue: 'var(--ant-color-primary, #2563eb)',
  orange: 'var(--ant-color-warning, #f59e0b)',
  green: 'var(--ant-color-success, #16a34a)',
  yellow: 'var(--dp-yellow-600, #ca8a04)',
  red: 'var(--ant-color-error, #dc2626)',
  purple: 'var(--dp-purple-500, #7c3aed)',
}

/** 取 BadgeTone 对应的主题色变量字符串（边界场景用） */
export function toneToColor(tone: BadgeTone): string {
  return TONE_COLOR_MAP[tone]
}
