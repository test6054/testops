/** 成果贡献角色 - PortfolioContributionRoleEnum（§8.13 CONTRIBUTION_ROLE） */
export enum PortfolioContributionRoleCode {
  LEAD = 'LEAD',
  CORE = 'CORE',
  MENTOR = 'MENTOR',
  PARTICIPANT = 'PARTICIPANT',
}

export const ALL_PORTFOLIO_CONTRIBUTION_ROLE_CODES: readonly PortfolioContributionRoleCode[] = [
  PortfolioContributionRoleCode.LEAD,
  PortfolioContributionRoleCode.CORE,
  PortfolioContributionRoleCode.MENTOR,
  PortfolioContributionRoleCode.PARTICIPANT,
]

export const PortfolioContributionRoleDescription: Record<PortfolioContributionRoleCode, string> = {
  [PortfolioContributionRoleCode.LEAD]: '主持/负责人',
  [PortfolioContributionRoleCode.CORE]: '核心成员',
  [PortfolioContributionRoleCode.MENTOR]: '指导教师',
  [PortfolioContributionRoleCode.PARTICIPANT]: '参与成员',
}
