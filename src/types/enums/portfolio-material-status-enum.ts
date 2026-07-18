/** 材料库条目状态 */
export enum PortfolioMaterialStatusCode {
  /** 有效 */
  ACTIVE = 'ACTIVE',
  /** 已作废（仅影响未来任务，历史冻结引用保留） */
  VOID = 'VOID',
}

export const ALL_PORTFOLIO_MATERIAL_STATUS_CODES: readonly PortfolioMaterialStatusCode[] = [
  PortfolioMaterialStatusCode.ACTIVE,
  PortfolioMaterialStatusCode.VOID,
]

export const PortfolioMaterialStatusDescription: Record<PortfolioMaterialStatusCode, string> = {
  [PortfolioMaterialStatusCode.ACTIVE]: '有效',
  [PortfolioMaterialStatusCode.VOID]: '已作废',
}
