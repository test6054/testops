/** 材料风险等级 - PortfolioMaterialRiskLevelEnum */
export enum PortfolioMaterialRiskLevelCode {
  LOW = 'LOW',
  SENSITIVE = 'SENSITIVE',
}

export const ALL_PORTFOLIO_MATERIAL_RISK_LEVEL_CODES: readonly PortfolioMaterialRiskLevelCode[] = [
  PortfolioMaterialRiskLevelCode.LOW,
  PortfolioMaterialRiskLevelCode.SENSITIVE,
]

export const PortfolioMaterialRiskLevelDescription: Record<PortfolioMaterialRiskLevelCode, string> = {
  [PortfolioMaterialRiskLevelCode.LOW]: '低风险',
  [PortfolioMaterialRiskLevelCode.SENSITIVE]: '敏感',
}
