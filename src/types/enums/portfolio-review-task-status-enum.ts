/** 审核任务状态 - PortfolioReviewTaskStatusEnum */
export enum PortfolioReviewTaskStatusCode {
  PENDING = 'PENDING',
  SECOND_REVIEW = 'SECOND_REVIEW',
  APPROVED = 'APPROVED',
  RETURNED = 'RETURNED',
  DISMISSED = 'DISMISSED',
  CLOSED = 'CLOSED',
  SUSPENDED = 'SUSPENDED',
}

export const ALL_PORTFOLIO_REVIEW_TASK_STATUS_CODES: readonly PortfolioReviewTaskStatusCode[] = [
  PortfolioReviewTaskStatusCode.PENDING,
  PortfolioReviewTaskStatusCode.SECOND_REVIEW,
  PortfolioReviewTaskStatusCode.APPROVED,
  PortfolioReviewTaskStatusCode.RETURNED,
  PortfolioReviewTaskStatusCode.DISMISSED,
  PortfolioReviewTaskStatusCode.CLOSED,
  PortfolioReviewTaskStatusCode.SUSPENDED,
]

export const PortfolioReviewTaskStatusDescription: Record<PortfolioReviewTaskStatusCode, string> = {
  [PortfolioReviewTaskStatusCode.PENDING]: '待审',
  [PortfolioReviewTaskStatusCode.SECOND_REVIEW]: '转复审',
  [PortfolioReviewTaskStatusCode.APPROVED]: '通过',
  [PortfolioReviewTaskStatusCode.RETURNED]: '退回',
  [PortfolioReviewTaskStatusCode.DISMISSED]: '驳回',
  [PortfolioReviewTaskStatusCode.CLOSED]: '已关闭',
  [PortfolioReviewTaskStatusCode.SUSPENDED]: '已挂起',
}
