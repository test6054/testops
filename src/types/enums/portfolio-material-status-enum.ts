/**
 * 材料库条目状态
 * 取值与展示文案以后端 {@code PortfolioMaterialStatusEnum} 为真源，须逐值同步。
 */

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

/** 与后端 PortfolioMaterialStatusEnum.label 一致 */
export const PortfolioMaterialStatusDescription: Record<PortfolioMaterialStatusCode, string> = {
  [PortfolioMaterialStatusCode.ACTIVE]: '有效',
  [PortfolioMaterialStatusCode.VOID]: '已作废',
}

const STATUS_SET = new Set<string>(Object.values(PortfolioMaterialStatusCode))

export function isPortfolioMaterialStatus(
  value: string | null | undefined,
): value is PortfolioMaterialStatusCode {
  return value != null && STATUS_SET.has(value)
}
