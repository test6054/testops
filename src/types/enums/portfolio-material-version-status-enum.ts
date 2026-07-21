/** §8.51 材料附件版本状态（与后端 PortfolioMaterialVersionStatusEnum 逐值一致） */
export enum PortfolioMaterialVersionStatusCode {
  /** 当前或历史有效版本 */
  ACTIVE = 'ACTIVE',
  /** 已被同材料新版本取代 */
  SUPERSEDED = 'SUPERSEDED',
  /** 作废；仅影响未来任务 */
  VOID = 'VOID',
}

export const ALL_PORTFOLIO_MATERIAL_VERSION_STATUS_CODES: readonly PortfolioMaterialVersionStatusCode[] = [
  PortfolioMaterialVersionStatusCode.ACTIVE,
  PortfolioMaterialVersionStatusCode.SUPERSEDED,
  PortfolioMaterialVersionStatusCode.VOID,
]

export const PortfolioMaterialVersionStatusDescription: Record<
  PortfolioMaterialVersionStatusCode,
  string
> = {
  [PortfolioMaterialVersionStatusCode.ACTIVE]: '有效',
  [PortfolioMaterialVersionStatusCode.SUPERSEDED]: '已取代',
  [PortfolioMaterialVersionStatusCode.VOID]: '已作废',
}
