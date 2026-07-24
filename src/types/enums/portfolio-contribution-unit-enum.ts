/** 成果贡献单位归属 - PortfolioContributionUnitEnum（§8.13 CONTRIBUTION_UNIT） */
export enum PortfolioContributionUnitCode {
  FIRST = 'FIRST',
  JOINT = 'JOINT',
  EXTERNAL = 'EXTERNAL',
}

export const ALL_PORTFOLIO_CONTRIBUTION_UNIT_CODES: readonly PortfolioContributionUnitCode[] = [
  PortfolioContributionUnitCode.FIRST,
  PortfolioContributionUnitCode.JOINT,
  PortfolioContributionUnitCode.EXTERNAL,
]

export const PortfolioContributionUnitDescription: Record<PortfolioContributionUnitCode, string> = {
  [PortfolioContributionUnitCode.FIRST]: '第一完成单位',
  [PortfolioContributionUnitCode.JOINT]: '联合完成单位',
  [PortfolioContributionUnitCode.EXTERNAL]: '外单位',
}
