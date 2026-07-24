/** 过程代表作级别 - PortfolioMasterpieceLevelCodeEnum */
export enum PortfolioMasterpieceLevelCode {
  DEMO_CASE = 'DEMO_CASE',
  COURSE_IMPROVEMENT = 'COURSE_IMPROVEMENT',
  REFLECTION = 'REFLECTION',
  PROCESS_PACK = 'PROCESS_PACK',
}

export const ALL_PORTFOLIO_MASTERPIECE_LEVEL_CODES: readonly PortfolioMasterpieceLevelCode[] = [
  PortfolioMasterpieceLevelCode.DEMO_CASE,
  PortfolioMasterpieceLevelCode.COURSE_IMPROVEMENT,
  PortfolioMasterpieceLevelCode.REFLECTION,
  PortfolioMasterpieceLevelCode.PROCESS_PACK,
]

export const PortfolioMasterpieceLevelDescription: Record<PortfolioMasterpieceLevelCode, string> = {
  [PortfolioMasterpieceLevelCode.DEMO_CASE]: '示范/教改/课程思政案例',
  [PortfolioMasterpieceLevelCode.COURSE_IMPROVEMENT]: '课程改进与达成度迭代',
  [PortfolioMasterpieceLevelCode.REFLECTION]: '教学反思/叙事',
  [PortfolioMasterpieceLevelCode.PROCESS_PACK]: '过程材料包',
}
