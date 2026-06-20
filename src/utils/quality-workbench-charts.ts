import type { SignalMetric } from '@/types/workbench'
import type { UiBarChartItem, BadgeTone } from '@/components/ui-guide/ui/types'

/** quality 工作台图表分组 */
export interface QualityChartGroup {
  key: string
  title: string
  hint?: string
  items: UiBarChartItem[]
  height?: string
}

/** 将 SignalBand 数值指标转为柱状图条目 */
export function signalsToBarChartItems(metrics: SignalMetric[]): UiBarChartItem[] {
  return metrics
    .filter((metric) => typeof metric.value === 'number')
    .map((metric) => ({
      key: metric.key,
      label: metric.label,
      value: metric.value as number,
      tone: metric.tone,
      helper: metric.unit ? `${metric.value}${metric.unit}` : undefined,
    }))
}

/** 由状态计数构造单组柱状图 */
export function buildStatusChartGroup(
  key: string,
  title: string,
  entries: Array<{ label: string, value: number, tone?: BadgeTone }>,
  hint?: string,
): QualityChartGroup | null {
  const items: UiBarChartItem[] = entries
    .map((entry, index) => ({
      key: `${key}-${index}`,
      label: entry.label,
      value: entry.value,
      tone: entry.tone,
    }))
  if (items.length === 0) return null
  return { key, title, hint, items }
}

/** 由 SignalBand 构造默认指标分布图组 */
export function buildSignalChartGroups(
  title: string,
  metrics: SignalMetric[],
  hint = '按当前工作台信号指标汇总',
): QualityChartGroup[] {
  const items = signalsToBarChartItems(metrics)
  if (items.length === 0) return []
  return [{ key: 'signals', title, hint, items }]
}
