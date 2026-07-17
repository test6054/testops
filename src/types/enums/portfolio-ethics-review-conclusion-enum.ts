/** 师德期满复核结论 - PortfolioEthicsReviewConclusionEnum */
export enum PortfolioEthicsReviewConclusionCode {
  RELEASE = 'RELEASE',
  EXTEND = 'EXTEND',
  MAINTAIN = 'MAINTAIN',
  DUE_MARKED = 'DUE_MARKED',
  OVERDUE_ESCALATE = 'OVERDUE_ESCALATE',
}

/** 人工复核可选结论（不含系统日志码） */
export const ALL_PORTFOLIO_ETHICS_REVIEW_CONCLUSION_CODES: readonly PortfolioEthicsReviewConclusionCode[] = [
  PortfolioEthicsReviewConclusionCode.RELEASE,
  PortfolioEthicsReviewConclusionCode.EXTEND,
  PortfolioEthicsReviewConclusionCode.MAINTAIN,
]

export const PortfolioEthicsReviewConclusionDescription: Record<PortfolioEthicsReviewConclusionCode, string> = {
  [PortfolioEthicsReviewConclusionCode.RELEASE]: '解除约束',
  [PortfolioEthicsReviewConclusionCode.EXTEND]: '延长处分期',
  [PortfolioEthicsReviewConclusionCode.MAINTAIN]: '维持约束',
  [PortfolioEthicsReviewConclusionCode.DUE_MARKED]: '期满进入待复核',
  [PortfolioEthicsReviewConclusionCode.OVERDUE_ESCALATE]: '复核逾期升级督办',
}
