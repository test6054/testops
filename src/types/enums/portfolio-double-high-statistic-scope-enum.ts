/** 双高建设监测统计口径 - PortfolioDoubleHighStatisticScopeEnum */
export enum PortfolioDoubleHighStatisticScopeCode {
  SCHOOL = 'SCHOOL',
  DEPARTMENT = 'DEPARTMENT',
  MAJOR_GROUP = 'MAJOR_GROUP',
}

export const ALL_PORTFOLIO_DOUBLE_HIGH_STATISTIC_SCOPE_CODES: readonly PortfolioDoubleHighStatisticScopeCode[] = [
  PortfolioDoubleHighStatisticScopeCode.SCHOOL,
  PortfolioDoubleHighStatisticScopeCode.DEPARTMENT,
  PortfolioDoubleHighStatisticScopeCode.MAJOR_GROUP,
]

export const PortfolioDoubleHighStatisticScopeDescription: Record<
  PortfolioDoubleHighStatisticScopeCode,
  string
> = {
  [PortfolioDoubleHighStatisticScopeCode.SCHOOL]: '学校',
  [PortfolioDoubleHighStatisticScopeCode.DEPARTMENT]: '院系',
  [PortfolioDoubleHighStatisticScopeCode.MAJOR_GROUP]: '专业群',
}
