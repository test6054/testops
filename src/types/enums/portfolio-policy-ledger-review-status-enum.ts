/** 政策专项台账审核状态 - PortfolioPolicyLedgerReviewStatusEnum */
export enum PortfolioPolicyLedgerReviewStatusCode {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const PortfolioPolicyLedgerReviewStatusDescription: Record<
  PortfolioPolicyLedgerReviewStatusCode,
  string
> = {
  [PortfolioPolicyLedgerReviewStatusCode.DRAFT]: '草稿',
  [PortfolioPolicyLedgerReviewStatusCode.PENDING_REVIEW]: '待审核',
  [PortfolioPolicyLedgerReviewStatusCode.APPROVED]: '已通过',
  [PortfolioPolicyLedgerReviewStatusCode.REJECTED]: '已退回',
}
