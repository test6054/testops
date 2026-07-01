import { formatScore } from '@/utils/format'
import { prefersReducedMotion } from '@/utils/motion-preference'

export { prefersReducedMotion }

/** 趋势图最少点位：少于该值展示空态说明，不渲染折线 */
export const MARK_TREND_MIN_POINTS = 2

/** mark-vue 图表空态与无障碍文案真源 */
export const MARK_CHART_EMPTY = {
  trendNeedMoreExams: '至少需要 2 场考试才能展示走势',
  trendSingleExam: '本课程仅有当前 1 场考试，暂无纵向趋势可对照',
  trendNoHistory: '该学生在本课程暂无可对照的历次成绩',
  barNoData: '暂无柱状图数据',
  distributionNoData: '暂无分布数据',
  scatterNoData: '暂无散点图数据',
  heatmapNoData: '暂无热力图数据',
} as const

/** 环形进度读屏文案：指标名 + 百分比 + 可选明细 */
export function formatGaugeAriaLabel(label: string, percent: number, detail?: string): string {
  const safeLabel = label.trim() || '进度'
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)))
  const segments = [`${safeLabel} ${safePercent}%`]
  if (detail?.trim()) {
    segments.push(detail.trim())
  }
  return segments.join('，')
}

/** 趋势图读屏摘要：点位数量 + 末值 */
export function formatTrendAriaLabel(
  title: string,
  pointCount: number,
  lastValue?: number | null,
  unit = '',
): string {
  const safeTitle = title.trim() || '趋势图'
  if (pointCount <= 0) {
    return `${safeTitle}，暂无数据`
  }
  if (pointCount < MARK_TREND_MIN_POINTS) {
    return `${safeTitle}，共 ${pointCount} 个数据点，不足以绘制走势`
  }
  if (lastValue == null || Number.isNaN(lastValue)) {
    return `${safeTitle}，共 ${pointCount} 个数据点`
  }
  const valueText = formatScore(lastValue, Number.isInteger(lastValue) ? 'count' : 'score')
  return `${safeTitle}，共 ${pointCount} 个数据点，最近值为 ${valueText}${unit}`
}
