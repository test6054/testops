/** 教师归属血缘段写入来源 */
export enum PortfolioAffiliationHistorySourceTypeCode {
  PORTFOLIO_MANUAL = 'PORTFOLIO_MANUAL',
  LIFECYCLE = 'LIFECYCLE',
}

export const ALL_PORTFOLIO_AFFILIATION_HISTORY_SOURCE_TYPE_CODES: readonly PortfolioAffiliationHistorySourceTypeCode[]
  = [
    PortfolioAffiliationHistorySourceTypeCode.PORTFOLIO_MANUAL,
    PortfolioAffiliationHistorySourceTypeCode.LIFECYCLE,
  ]

export const PortfolioAffiliationHistorySourceTypeDescription: Record<
  PortfolioAffiliationHistorySourceTypeCode,
  string
> = {
  [PortfolioAffiliationHistorySourceTypeCode.PORTFOLIO_MANUAL]: '档案身份维护',
  [PortfolioAffiliationHistorySourceTypeCode.LIFECYCLE]: '生命周期调出',
}
