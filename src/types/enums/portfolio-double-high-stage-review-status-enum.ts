/** 双高阶段审核状态 - PortfolioDoubleHighStageReviewStatusEnum */
export enum PortfolioDoubleHighStageReviewStatusCode {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const ALL_PORTFOLIO_DOUBLE_HIGH_STAGE_REVIEW_STATUS_CODES: readonly PortfolioDoubleHighStageReviewStatusCode[] = [
  PortfolioDoubleHighStageReviewStatusCode.PENDING,
  PortfolioDoubleHighStageReviewStatusCode.APPROVED,
  PortfolioDoubleHighStageReviewStatusCode.REJECTED,
]

export const PortfolioDoubleHighStageReviewStatusDescription: Record<
  PortfolioDoubleHighStageReviewStatusCode,
  string
> = {
  [PortfolioDoubleHighStageReviewStatusCode.PENDING]: '待审核',
  [PortfolioDoubleHighStageReviewStatusCode.APPROVED]: '已通过',
  [PortfolioDoubleHighStageReviewStatusCode.REJECTED]: '已退回',
}
