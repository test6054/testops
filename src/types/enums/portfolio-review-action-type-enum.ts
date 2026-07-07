/** 审核操作类型 - PortfolioReviewActionTypeEnum */
export enum PortfolioReviewActionTypeCode {
  APPROVE = 'APPROVE',
  BATCH_APPROVE = 'BATCH_APPROVE',
  RETURN = 'RETURN',
  DISMISS = 'DISMISS',
  ESCALATE = 'ESCALATE',
}

export const ALL_PORTFOLIO_REVIEW_ACTION_TYPE_CODES: readonly PortfolioReviewActionTypeCode[] = [
  PortfolioReviewActionTypeCode.APPROVE,
  PortfolioReviewActionTypeCode.BATCH_APPROVE,
  PortfolioReviewActionTypeCode.RETURN,
  PortfolioReviewActionTypeCode.DISMISS,
  PortfolioReviewActionTypeCode.ESCALATE,
]

export const PortfolioReviewActionTypeDescription: Record<PortfolioReviewActionTypeCode, string> = {
  [PortfolioReviewActionTypeCode.APPROVE]: '通过',
  [PortfolioReviewActionTypeCode.BATCH_APPROVE]: '批量通过',
  [PortfolioReviewActionTypeCode.RETURN]: '退回',
  [PortfolioReviewActionTypeCode.DISMISS]: '驳回',
  [PortfolioReviewActionTypeCode.ESCALATE]: '转复审',
}
