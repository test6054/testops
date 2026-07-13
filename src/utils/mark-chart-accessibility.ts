import { formatScore } from '@/utils/format'
import { prefersReducedMotion } from '@/utils/motion-preference'

export { prefersReducedMotion }

/** 趋势图最少点位：少于该值展示空态说明，不渲染折线 */
export const MARK_TREND_MIN_POINTS = 2

/** mark-vue 图表空态与无障碍文案真源 */
export const MARK_CHART_EMPTY: Record<string, string> = {
  trendNeedMoreExams: '至少需要 2 场考试；配置范围并生成分析后展示走势',
  trendSingleExam: '本课程仅有 1 场考试，暂无纵向趋势可对照',
  trendNoHistory: '选定学生后展示历次成绩走势',
  barNoData: '生成分析后展示分布',
  distributionNoData: '生成分析后展示分布',
  scatterNoData: '全量生成题目质量分析后展示散点',
  heatmapNoData: '生成分析后展示热力分布',
}

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
    return `${safeTitle}，当前没有可展示的内容`
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
