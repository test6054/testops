/** AI 分析审核状态 - PortfolioAiAnalysisReviewStatusEnum */
export enum PortfolioAiAnalysisReviewStatusCode {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const ALL_PORTFOLIO_AI_ANALYSIS_REVIEW_STATUS_CODES: readonly PortfolioAiAnalysisReviewStatusCode[] = [
  PortfolioAiAnalysisReviewStatusCode.PENDING_REVIEW,
  PortfolioAiAnalysisReviewStatusCode.APPROVED,
  PortfolioAiAnalysisReviewStatusCode.REJECTED,
]

export const PortfolioAiAnalysisReviewStatusDescription: Record<PortfolioAiAnalysisReviewStatusCode, string> = {
  [PortfolioAiAnalysisReviewStatusCode.PENDING_REVIEW]: '待复核',
  [PortfolioAiAnalysisReviewStatusCode.APPROVED]: '已通过',
  [PortfolioAiAnalysisReviewStatusCode.REJECTED]: '已驳回',
}
