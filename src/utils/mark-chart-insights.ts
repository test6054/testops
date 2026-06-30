import type {
  UiBarChartItem,
  UiDistributionSegment,
  UiScatterSeries,
  UiTrendPoint,
} from '@/components/ui-guide/ui/types'
import type { MarkHeatmapCell } from '@/utils/mark-echarts-options'
import { formatScore } from '@/utils/format'

export interface BarChartInsightConfig {
  /** 百分制及格/达标线 */
  passLine?: number
  passLineLabel?: string
  valueUnit?: string
}

/** 分类柱状图一句话摘要：支持及格线统计或极值描述 */
export function buildBarChartInsight(
  items: UiBarChartItem[],
  config: BarChartInsightConfig = {},
): string | undefined {
  if (items.length === 0) {
    return undefined
  }
  const unit = config.valueUnit ?? '%'
  const passLine = config.passLine
  if (passLine != null) {
    const below = items.filter((item) => Number(item.value) < passLine).length
    const label = config.passLineLabel ?? '及格线'
    if (below > 0) {
      return `${items.length} 项中有 ${below} 项低于 ${passLine}${unit} ${label}`
    }
    return `${items.length} 项均已达到 ${passLine}${unit} ${label}`
  }
  const maxItem = items.reduce((best, item) => (
    Number(item.value) > Number(best.value) ? item : best
  ))
  return `最高为「${maxItem.label}」${maxItem.value}${unit}`
}

/** 折线/面积趋势图摘要：较上一期变化 */
export function buildTrendChartInsight(
  points: UiTrendPoint[],
  config: { valueUnit?: string } = {},
): string | undefined {
  if (points.length < 2) {
    return undefined
  }
  const latest = Number(points[points.length - 1]?.value)
  const previous = Number(points[points.length - 2]?.value)
  if (!Number.isFinite(latest) || !Number.isFinite(previous)) {
    return undefined
  }
  const unit = config.valueUnit ?? '%'
  const delta = Math.round((latest - previous) * 10) / 10
  if (delta === 0) {
    return `与上一期持平（${formatScore(latest, 'score')}${unit}）`
  }
  const direction = delta > 0 ? '提升' : '下降'
  return `较上一期${direction} ${formatScore(Math.abs(delta), 'score')}${unit}（当前 ${formatScore(latest, 'score')}${unit}）`
}

/** 难度-区分度散点图摘要 */
export function buildScatterChartInsight(seriesList: UiScatterSeries[]): string | undefined {
  const total = seriesList.reduce((sum, series) => sum + series.points.length, 0)
  if (total === 0) {
    return undefined
  }
  const idealCount = seriesList.find((series) => series.key === 'ideal')?.points.length ?? 0
  const nonIdeal = total - idealCount
  if (nonIdeal > 0) {
    return `${total} 道题中有 ${nonIdeal} 道不在理想区间（难度 0.3–0.8 且区分度 ≥ 0.4）`
  }
  return `${total} 道题均在理想区间内`
}

/** 状态分布条摘要：占比最高分段 */
export function buildDistributionChartInsight(segments: UiDistributionSegment[]): string | undefined {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0)
  if (total <= 0) {
    return undefined
  }
  const top = segments.reduce((best, segment) => (
    segment.value > best.value ? segment : best
  ))
  const percent = Math.round((top.value * 100) / total)
  return `「${top.label}」占比最高（${percent}%）`
}

/** 热力图摘要：低于及格线的题数或均值 */
export function buildHeatmapChartInsight(
  cells: MarkHeatmapCell[],
  config: { passLine?: number } = {},
): string | undefined {
  if (cells.length === 0) {
    return undefined
  }
  const passLine = config.passLine ?? 60
  const below = cells.filter((cell) => cell.value < passLine).length
  if (below > 0) {
    return `${cells.length} 题中有 ${below} 题低于 ${passLine}%`
  }
  const average = Math.round(cells.reduce((sum, cell) => sum + cell.value, 0) / cells.length)
  return `${cells.length} 题平均 ${average}%`
}

/** 合并静态说明与数据摘要，优先展示摘要 */
export function mergeChartHint(staticHint: string | undefined, insight: string | undefined): string {
  if (insight) {
    return insight
  }
  return staticHint?.trim() ?? ''
}
