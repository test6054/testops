/** 师德期满复核结论 - PortfolioEthicsReviewConclusionEnum */
export enum PortfolioEthicsReviewConclusionCode {
  RELEASE = 'RELEASE',
  EXTEND = 'EXTEND',
  MAINTAIN = 'MAINTAIN',
}

export const ALL_PORTFOLIO_ETHICS_REVIEW_CONCLUSION_CODES: readonly PortfolioEthicsReviewConclusionCode[] = [
  PortfolioEthicsReviewConclusionCode.RELEASE,
  PortfolioEthicsReviewConclusionCode.EXTEND,
  PortfolioEthicsReviewConclusionCode.MAINTAIN,
]

export const PortfolioEthicsReviewConclusionDescription: Record<PortfolioEthicsReviewConclusionCode, string> = {
  [PortfolioEthicsReviewConclusionCode.RELEASE]: '解除约束',
  [PortfolioEthicsReviewConclusionCode.EXTEND]: '延长处分期',
  [PortfolioEthicsReviewConclusionCode.MAINTAIN]: '维持约束',
}
