/** 教学档案袋业务数据来源 - PortfolioBusinessDataSourceTypeEnum */
export enum PortfolioBusinessDataSourceTypeCode {
  MANUAL = 'MANUAL',
  PORTFOLIO_MANUAL = 'PORTFOLIO_MANUAL',
  PORTFOLIO_REGISTRY = 'PORTFOLIO_REGISTRY',
  SYNC = 'SYNC',
}

export const ALL_PORTFOLIO_BUSINESS_DATA_SOURCE_TYPE_CODES: readonly PortfolioBusinessDataSourceTypeCode[] = [
  PortfolioBusinessDataSourceTypeCode.MANUAL,
  PortfolioBusinessDataSourceTypeCode.PORTFOLIO_MANUAL,
  PortfolioBusinessDataSourceTypeCode.PORTFOLIO_REGISTRY,
  PortfolioBusinessDataSourceTypeCode.SYNC,
]

export const PortfolioBusinessDataSourceTypeDescription: Record<PortfolioBusinessDataSourceTypeCode, string> = {
  [PortfolioBusinessDataSourceTypeCode.MANUAL]: '手工维护',
  [PortfolioBusinessDataSourceTypeCode.PORTFOLIO_MANUAL]: '档案袋维护',
  [PortfolioBusinessDataSourceTypeCode.PORTFOLIO_REGISTRY]: '档案袋名册',
  [PortfolioBusinessDataSourceTypeCode.SYNC]: '权威同步',
}

export function isPortfolioBusinessDataSourceType(
  value: string,
): value is PortfolioBusinessDataSourceTypeCode {
  return ALL_PORTFOLIO_BUSINESS_DATA_SOURCE_TYPE_CODES.map(String).includes(value)
}
