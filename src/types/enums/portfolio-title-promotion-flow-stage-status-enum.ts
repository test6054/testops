/** 职称申报流程可视化节点状态 - PortfolioTitlePromotionFlowStageStatusEnum */
export enum PortfolioTitlePromotionFlowStageStatusCode {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export const ALL_PORTFOLIO_TITLE_PROMOTION_FLOW_STAGE_STATUS_CODES: readonly PortfolioTitlePromotionFlowStageStatusCode[] = [
  PortfolioTitlePromotionFlowStageStatusCode.PENDING,
  PortfolioTitlePromotionFlowStageStatusCode.ACTIVE,
  PortfolioTitlePromotionFlowStageStatusCode.COMPLETED,
  PortfolioTitlePromotionFlowStageStatusCode.WARNING,
  PortfolioTitlePromotionFlowStageStatusCode.ERROR,
]

export const PortfolioTitlePromotionFlowStageStatusDescription: Record<
  PortfolioTitlePromotionFlowStageStatusCode,
  string
> = {
  [PortfolioTitlePromotionFlowStageStatusCode.PENDING]: '未到达',
  [PortfolioTitlePromotionFlowStageStatusCode.ACTIVE]: '进行中',
  [PortfolioTitlePromotionFlowStageStatusCode.COMPLETED]: '已完成',
  [PortfolioTitlePromotionFlowStageStatusCode.WARNING]: '退回待重提',
  [PortfolioTitlePromotionFlowStageStatusCode.ERROR]: '已驳回/阻断',
}
