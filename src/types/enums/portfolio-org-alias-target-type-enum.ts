/** alias 挂接目标 - PortfolioOrgAliasTargetTypeEnum */
export enum PortfolioOrgAliasTargetTypeCode {
  EDU_USER_DEPARTMENT = 'EDU_USER_DEPARTMENT',
  EDU_USER_MAJOR = 'EDU_USER_MAJOR',
  PORTFOLIO_ORG_UNIT = 'PORTFOLIO_ORG_UNIT',
}

export const ALL_PORTFOLIO_ORG_ALIAS_TARGET_TYPE_CODES: readonly PortfolioOrgAliasTargetTypeCode[] = [
  PortfolioOrgAliasTargetTypeCode.EDU_USER_DEPARTMENT,
  PortfolioOrgAliasTargetTypeCode.EDU_USER_MAJOR,
  PortfolioOrgAliasTargetTypeCode.PORTFOLIO_ORG_UNIT,
]

export const PortfolioOrgAliasTargetTypeDescription: Record<PortfolioOrgAliasTargetTypeCode, string> = {
  [PortfolioOrgAliasTargetTypeCode.EDU_USER_DEPARTMENT]: 'edu-user 院系',
  [PortfolioOrgAliasTargetTypeCode.EDU_USER_MAJOR]: 'edu-user 专业',
  [PortfolioOrgAliasTargetTypeCode.PORTFOLIO_ORG_UNIT]: 'portfolio 扩展组织',
}
