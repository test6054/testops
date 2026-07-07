/** 材料库条目状态 */
export enum PortfolioMaterialStatusCode {
  ACTIVE = 'ACTIVE',
}

export const ALL_PORTFOLIO_MATERIAL_STATUS_CODES: readonly PortfolioMaterialStatusCode[] = [
  PortfolioMaterialStatusCode.ACTIVE,
]

export const PortfolioMaterialStatusDescription: Record<PortfolioMaterialStatusCode, string> = {
  [PortfolioMaterialStatusCode.ACTIVE]: '有效',
}
