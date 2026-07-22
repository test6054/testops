/** 档案袋组织节点状态 - 与后端 PortfolioOrgUnitStatusEnum 一致 */
export enum PortfolioOrgUnitStatusCode {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const PORTFOLIO_ORG_UNIT_STATUS_LABEL: Record<PortfolioOrgUnitStatusCode, string> = {
  [PortfolioOrgUnitStatusCode.ACTIVE]: '启用',
  [PortfolioOrgUnitStatusCode.INACTIVE]: '停用',
}
