export enum PortfolioTitleCriteriaSatisfyModeCode {
  ALL = 'ALL',
  ANY_OF_GROUP = 'ANY_OF_GROUP',
  MIN_COUNT_IN_GROUP = 'MIN_COUNT_IN_GROUP',
}

export const PortfolioTitleCriteriaSatisfyModeDescription: Record<
  PortfolioTitleCriteriaSatisfyModeCode,
  string
> = {
  [PortfolioTitleCriteriaSatisfyModeCode.ALL]: '全部满足',
  [PortfolioTitleCriteriaSatisfyModeCode.ANY_OF_GROUP]: '组内任选其一',
  [PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP]: '组内至少 N 条',
}
