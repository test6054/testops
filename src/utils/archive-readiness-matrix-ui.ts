/** 就绪矩阵单元格语义色：1=全绿，(0,1)=黄，0=红。 */
export function readinessRateCellClass(rate: number): string {
  if (rate >= 1) {
    return 'matrix-cell matrix-cell--good'
  }
  if (rate > 0) {
    return 'matrix-cell matrix-cell--warn'
  }
  return 'matrix-cell matrix-cell--fail'
}

export function formatReadinessRate(value?: number): string {
  if (value === undefined || value === null) {
    return '—'
  }
  return `${Math.round(value * 1000) / 10}%`
}

export function invertReadinessRate(value?: number): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  return 1 - value
}
