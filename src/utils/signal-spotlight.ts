import type { SignalMetric } from '@/types/workbench'

export interface SpotlightEmphasisOptions {
  /** 指定主卡 key；缺省时优先 tone=orange/red，否则首项 */
  primaryKey?: string
  /** 主卡文字链；仅主卡有 clickable 或显式传入时使用 */
  actionLabel?: string
}

/**
 * 为任务工作台 SignalBand spotlight 标注 1 主 + N 次。
 * 不改变指标值与顺序（除非 primaryKey 指定的项已在列表中）。
 */
export function applySpotlightEmphasis(
  metrics: SignalMetric[],
  options: SpotlightEmphasisOptions = {},
): SignalMetric[] {
  if (metrics.length === 0) {
    return metrics
  }
  let primaryIndex = 0
  if (options.primaryKey) {
    const byKey = metrics.findIndex((item) => item.key === options.primaryKey)
    if (byKey >= 0) {
      primaryIndex = byKey
    }
  } else {
    const blocked = metrics.findIndex(
      (item) => item.tone === 'orange' || item.tone === 'red',
    )
    if (blocked >= 0) {
      primaryIndex = blocked
    }
  }
  return metrics.map((item, index) => {
    if (index !== primaryIndex) {
      return {
        ...item,
        emphasis: 'secondary' as const,
      }
    }
    const actionLabel
      = options.actionLabel
        ?? item.actionLabel
        ?? (item.clickable ? '查看' : undefined)
    return {
      ...item,
      emphasis: 'primary' as const,
      actionLabel,
    }
  })
}
