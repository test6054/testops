/**
 * 统计指标辅助：占比文案与分布条数据构造，供 SignalBand / ECharts 分布条复用。
 */

import type { BadgeTone, UiDistributionSegment, UiStatPanelItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'

/** 可映射为 SignalBand 指标的通用字段 */
export interface StatMetricLike {
  key?: string | number
  label: string
  value: string | number
  unit?: string
  helper?: string
  tone?: BadgeTone
  trend?: number
  clickable?: boolean
}

type SignalMetricSource = StatMetricLike | UiStatPanelItem

/** 计算 count 在 total 中的整数占比（0~100）。 */
export function formatSharePercent(count: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((count * 100) / total)
}

/** 生成 UiMetricCard helper 占比文案；total 为 0 时返回空态文案。 */
export function formatShareHelper(
  count: number,
  total: number,
  emptyLabel = '暂无任务',
): string {
  if (total <= 0) return emptyLabel
  return `占比 ${formatSharePercent(count, total)}%`
}

/** 将带 count / tone 的状态项映射为分布条分段。 */
export function toDistributionSegments<T extends { code?: string | number, label: string, count: number, tone?: BadgeTone }>(
  items: T[],
): UiDistributionSegment[] {
  return items.map((item) => ({
    key: item.code ?? item.label,
    label: item.label,
    value: item.count,
    tone: item.tone,
  }))
}

/** 将带 count / tone 的状态项映射为 UiStatPanel 指标项。 */
export function toShareStatPanelItems<T extends { code?: string | number, label: string, count: number, tone?: BadgeTone }>(
  items: T[],
  total: number,
  emptyLabel = '暂无任务',
): UiStatPanelItem[] {
  return items.map((item) => ({
    key: item.code ?? item.label,
    label: item.label,
    value: item.count,
    tone: item.tone,
    helper: formatShareHelper(item.count, total, emptyLabel),
  }))
}

/** 将通用统计项映射为 SignalBand 指标（key 缺省时用 label）。 */
export function toSignalMetrics(items: SignalMetricSource[]): SignalMetric[] {
  return items.map((item, index) => ({
    key: String(item.key ?? item.label ?? index),
    label: item.label,
    value: item.value,
    unit: item.unit,
    tone: item.tone,
    helper: item.helper,
    trend: typeof item.trend === 'number' ? item.trend : undefined,
    clickable: item.clickable,
  }))
}

/** 将带 count / tone 的状态项映射为 SignalBand 指标项。 */
export function toShareSignalMetrics<T extends { code?: string | number, label: string, count: number, tone?: BadgeTone }>(
  items: T[],
  total: number,
  emptyLabel = '暂无任务',
): SignalMetric[] {
  return items.map((item) => ({
    key: String(item.code ?? item.label),
    label: item.label,
    value: item.count,
    tone: item.tone,
    helper: formatShareHelper(item.count, total, emptyLabel),
  }))
}
