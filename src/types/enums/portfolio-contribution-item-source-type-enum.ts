/** 指导/育人贡献度明细证据来源 */
export enum PortfolioContributionItemSourceTypeCode {
  EXTENSION = 'EXTENSION',
  DEVELOPMENT = 'DEVELOPMENT',
}

export const ALL_PORTFOLIO_CONTRIBUTION_ITEM_SOURCE_TYPE_CODES: readonly PortfolioContributionItemSourceTypeCode[] = [
  PortfolioContributionItemSourceTypeCode.EXTENSION,
  PortfolioContributionItemSourceTypeCode.DEVELOPMENT,
]

export const PortfolioContributionItemSourceTypeDescription: Record<
  PortfolioContributionItemSourceTypeCode,
  string
> = {
  [PortfolioContributionItemSourceTypeCode.EXTENSION]: '教学拓展活动',
  [PortfolioContributionItemSourceTypeCode.DEVELOPMENT]: '发展成果库',
}
