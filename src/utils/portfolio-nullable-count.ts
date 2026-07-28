/** 可空计数字段展示：null → —，0 保留为 0 */
export function formatPortfolioNullableCount(value: number | null | undefined): string {
  if (value == null) {
    return '—'
  }
  return String(value)
}

/** 可空比率展示：null → —，否则带百分号 */
export function formatPortfolioNullablePercent(value: number | null | undefined): string {
  if (value == null) {
    return '—'
  }
  return `${value}%`
}

/** 成对计数：任一侧 null 则整段 — */
export function formatPortfolioNullableCountPair(
  left: number | null | undefined,
  right: number | null | undefined,
  separator = ' / ',
): string {
  if (left == null || right == null) {
    return '—'
  }
  return `${left}${separator}${right}`
}
