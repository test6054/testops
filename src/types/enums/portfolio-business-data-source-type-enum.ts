/** 教学档案袋业务数据来源 - PortfolioBusinessDataSourceTypeEnum */
export enum PortfolioBusinessDataSourceTypeCode {
  MANUAL = 'MANUAL',
  SYNC = 'SYNC',
}

export const ALL_PORTFOLIO_BUSINESS_DATA_SOURCE_TYPE_CODES:
  readonly PortfolioBusinessDataSourceTypeCode[] = [
    PortfolioBusinessDataSourceTypeCode.MANUAL,
    PortfolioBusinessDataSourceTypeCode.SYNC,
  ]

export const PortfolioBusinessDataSourceTypeDescription:
  Record<PortfolioBusinessDataSourceTypeCode, string> = {
    [PortfolioBusinessDataSourceTypeCode.MANUAL]: '手工维护',
    [PortfolioBusinessDataSourceTypeCode.SYNC]: '权威同步',
  }
