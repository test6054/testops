/** 人事职称层级 - 与后端 PortfolioTitleTierEnum 一致 */
export enum PortfolioTitleTierCode {
  SENIOR = 'SENIOR',
  ASSOCIATE = 'ASSOCIATE',
  MIDDLE = 'MIDDLE',
  JUNIOR = 'JUNIOR',
  UNCLASSIFIED = 'UNCLASSIFIED',
}

export const PORTFOLIO_TITLE_TIER_LABEL: Record<PortfolioTitleTierCode, string> = {
  [PortfolioTitleTierCode.SENIOR]: '正高',
  [PortfolioTitleTierCode.ASSOCIATE]: '副高',
  [PortfolioTitleTierCode.MIDDLE]: '中级',
  [PortfolioTitleTierCode.JUNIOR]: '初级',
  [PortfolioTitleTierCode.UNCLASSIFIED]: '未分类',
}
