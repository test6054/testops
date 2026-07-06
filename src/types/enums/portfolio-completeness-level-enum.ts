/** 档案完整度分级 - PortfolioCompletenessLevelEnum */
export enum PortfolioCompletenessLevelCode {
  COMPLETE = 'COMPLETE',
  BASIC = 'BASIC',
  PENDING = 'PENDING',
  SEVERE = 'SEVERE',
}

export const ALL_PORTFOLIO_COMPLETENESS_LEVEL_CODES: readonly PortfolioCompletenessLevelCode[] = [
  PortfolioCompletenessLevelCode.COMPLETE,
  PortfolioCompletenessLevelCode.BASIC,
  PortfolioCompletenessLevelCode.PENDING,
  PortfolioCompletenessLevelCode.SEVERE,
]

export const PortfolioCompletenessLevelDescription: Record<PortfolioCompletenessLevelCode, string> = {
  [PortfolioCompletenessLevelCode.COMPLETE]: '完整',
  [PortfolioCompletenessLevelCode.BASIC]: '基本完整',
  [PortfolioCompletenessLevelCode.PENDING]: '待补充',
  [PortfolioCompletenessLevelCode.SEVERE]: '严重缺失',
}
