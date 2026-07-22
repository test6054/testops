/** 档案袋扩展组织来源类型 - PortfolioOrgSourceTypeEnum */
export enum PortfolioOrgSourceTypeCode {
  PORTFOLIO_MANUAL = 'PORTFOLIO_MANUAL',
  PORTFOLIO_IT = 'PORTFOLIO_IT',
}

export const ALL_PORTFOLIO_ORG_SOURCE_TYPE_CODES: readonly PortfolioOrgSourceTypeCode[] = [
  PortfolioOrgSourceTypeCode.PORTFOLIO_MANUAL,
  PortfolioOrgSourceTypeCode.PORTFOLIO_IT,
]

export const PortfolioOrgSourceTypeDescription: Record<PortfolioOrgSourceTypeCode, string> = {
  [PortfolioOrgSourceTypeCode.PORTFOLIO_MANUAL]: '档案袋手工维护',
  [PortfolioOrgSourceTypeCode.PORTFOLIO_IT]: '信息系统同步',
}
