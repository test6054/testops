/** 达成度人工复核决定 - ManualReviewDecisionEnum */
export enum ManualReviewDecisionCode {
  CONFIRMED = 'CONFIRMED',
  RETURNED = 'RETURNED',
  ARCHIVED = 'ARCHIVED',
}

export const ALL_MANUAL_REVIEW_DECISION_CODES: readonly ManualReviewDecisionCode[] = [
  ManualReviewDecisionCode.CONFIRMED,
  ManualReviewDecisionCode.RETURNED,
  ManualReviewDecisionCode.ARCHIVED,
]

export const ManualReviewDecisionDescription: Record<ManualReviewDecisionCode, string> = {
  [ManualReviewDecisionCode.CONFIRMED]: '复核通过',
  [ManualReviewDecisionCode.RETURNED]: '退回修改',
  [ManualReviewDecisionCode.ARCHIVED]: '归档保留',
}
