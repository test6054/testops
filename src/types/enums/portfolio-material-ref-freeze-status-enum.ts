/** §8.51 材料引用冻结状态（与后端 PortfolioMaterialRefFreezeStatusEnum 逐值一致） */
export enum PortfolioMaterialRefFreezeStatusCode {
  /** 引用仍生效 */
  ACTIVE = 'ACTIVE',
  /** 已释放；历史审计仍可追溯 */
  RELEASED = 'RELEASED',
}

export const ALL_PORTFOLIO_MATERIAL_REF_FREEZE_STATUS_CODES: readonly PortfolioMaterialRefFreezeStatusCode[] = [
  PortfolioMaterialRefFreezeStatusCode.ACTIVE,
  PortfolioMaterialRefFreezeStatusCode.RELEASED,
]

export const PortfolioMaterialRefFreezeStatusDescription: Record<
  PortfolioMaterialRefFreezeStatusCode,
  string
> = {
  [PortfolioMaterialRefFreezeStatusCode.ACTIVE]: '冻结中',
  [PortfolioMaterialRefFreezeStatusCode.RELEASED]: '已释放',
}
