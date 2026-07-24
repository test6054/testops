/** 指导/育人贡献角色 - PortfolioGuidanceRoleCodeEnum */
export enum PortfolioGuidanceRoleCode {
  LEAD = 'LEAD',
  MEMBER = 'MEMBER',
  UNSPECIFIED = 'UNSPECIFIED',
}

export const ALL_PORTFOLIO_GUIDANCE_ROLE_CODES: readonly PortfolioGuidanceRoleCode[] = [
  PortfolioGuidanceRoleCode.LEAD,
  PortfolioGuidanceRoleCode.MEMBER,
  PortfolioGuidanceRoleCode.UNSPECIFIED,
]

export const PortfolioGuidanceRoleDescription: Record<PortfolioGuidanceRoleCode, string> = {
  [PortfolioGuidanceRoleCode.LEAD]: '第一指导/主持',
  [PortfolioGuidanceRoleCode.MEMBER]: '参与指导',
  [PortfolioGuidanceRoleCode.UNSPECIFIED]: '显式未标注',
}
