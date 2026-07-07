/** 补采任务状态 - PortfolioGapTaskStatusEnum */
export enum PortfolioGapTaskStatusCode {
  PENDING = 'PENDING',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  SUBMITTED = 'SUBMITTED',
  REVIEWING = 'REVIEWING',
  CLOSED = 'CLOSED',
}

export const ALL_PORTFOLIO_GAP_TASK_STATUS_CODES: readonly PortfolioGapTaskStatusCode[] = [
  PortfolioGapTaskStatusCode.PENDING,
  PortfolioGapTaskStatusCode.RETURNED,
  PortfolioGapTaskStatusCode.OVERDUE,
  PortfolioGapTaskStatusCode.SUBMITTED,
  PortfolioGapTaskStatusCode.REVIEWING,
  PortfolioGapTaskStatusCode.CLOSED,
]

export const PortfolioGapTaskStatusDescription: Record<PortfolioGapTaskStatusCode, string> = {
  [PortfolioGapTaskStatusCode.PENDING]: '待处理',
  [PortfolioGapTaskStatusCode.RETURNED]: '已退回',
  [PortfolioGapTaskStatusCode.OVERDUE]: '已逾期',
  [PortfolioGapTaskStatusCode.SUBMITTED]: '已提交',
  [PortfolioGapTaskStatusCode.REVIEWING]: '审核中',
  [PortfolioGapTaskStatusCode.CLOSED]: '已关闭',
}
