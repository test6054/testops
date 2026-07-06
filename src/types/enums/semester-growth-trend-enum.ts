/** SemesterGrowthTrend */
export enum SemesterGrowthTrendCode {
  IMPROVING = 'IMPROVING',
  STABLE = 'STABLE',
  DECLINING = 'DECLINING',
}

export const ALL_SEMESTER_GROWTH_TREND_CODES: readonly SemesterGrowthTrendCode[] = [
  SemesterGrowthTrendCode.IMPROVING,
  SemesterGrowthTrendCode.STABLE,
  SemesterGrowthTrendCode.DECLINING,
]

export const SemesterGrowthTrendDescription: Record<SemesterGrowthTrendCode, string> = {
  [SemesterGrowthTrendCode.IMPROVING]: '上升',
  [SemesterGrowthTrendCode.STABLE]: '稳定',
  [SemesterGrowthTrendCode.DECLINING]: '下降',
}
