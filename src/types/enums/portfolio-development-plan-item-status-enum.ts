/** 发展规划明细项状态 */
export enum PortfolioDevelopmentPlanItemStatusCode {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export const ALL_PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_CODES: readonly PortfolioDevelopmentPlanItemStatusCode[] = [
  PortfolioDevelopmentPlanItemStatusCode.NOT_STARTED,
  PortfolioDevelopmentPlanItemStatusCode.IN_PROGRESS,
  PortfolioDevelopmentPlanItemStatusCode.COMPLETED,
]

export const PortfolioDevelopmentPlanItemStatusDescription: Record<PortfolioDevelopmentPlanItemStatusCode, string> = {
  [PortfolioDevelopmentPlanItemStatusCode.NOT_STARTED]: '未开始',
  [PortfolioDevelopmentPlanItemStatusCode.IN_PROGRESS]: '进行中',
  [PortfolioDevelopmentPlanItemStatusCode.COMPLETED]: '已完成',
}
