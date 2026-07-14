/** 师德处分影响范围 - PortfolioEthicsImpactScopeEnum */
export enum PortfolioEthicsImpactScopeCode {
  EVALUATION = 'EVALUATION',
  APPLICATION = 'APPLICATION',
  HONOR = 'HONOR',
  ALL = 'ALL',
}

export const ALL_PORTFOLIO_ETHICS_IMPACT_SCOPE_CODES: readonly PortfolioEthicsImpactScopeCode[] = [
  PortfolioEthicsImpactScopeCode.EVALUATION,
  PortfolioEthicsImpactScopeCode.APPLICATION,
  PortfolioEthicsImpactScopeCode.HONOR,
  PortfolioEthicsImpactScopeCode.ALL,
]

export const PortfolioEthicsImpactScopeDescription: Record<PortfolioEthicsImpactScopeCode, string> = {
  [PortfolioEthicsImpactScopeCode.EVALUATION]: '约束评价',
  [PortfolioEthicsImpactScopeCode.APPLICATION]: '约束申报',
  [PortfolioEthicsImpactScopeCode.HONOR]: '约束评优',
  [PortfolioEthicsImpactScopeCode.ALL]: '约束评价申报评优',
}
