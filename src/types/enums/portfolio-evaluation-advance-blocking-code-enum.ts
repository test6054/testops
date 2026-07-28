/** 评价任务推进阻断编码 - PortfolioEvaluationAdvanceBlockingCode */
export enum PortfolioEvaluationAdvanceBlockingCode {
  SCORE_VARIANCE_EXCEEDED = 'SCORE_VARIANCE_EXCEEDED',
  EXPERT_REVIEW_INCOMPLETE = 'EXPERT_REVIEW_INCOMPLETE',
}

export const ALL_PORTFOLIO_EVALUATION_ADVANCE_BLOCKING_CODES: readonly PortfolioEvaluationAdvanceBlockingCode[] = [
  PortfolioEvaluationAdvanceBlockingCode.SCORE_VARIANCE_EXCEEDED,
  PortfolioEvaluationAdvanceBlockingCode.EXPERT_REVIEW_INCOMPLETE,
]

export const PortfolioEvaluationAdvanceBlockingDescription: Record<
  PortfolioEvaluationAdvanceBlockingCode,
  string
> = {
  [PortfolioEvaluationAdvanceBlockingCode.SCORE_VARIANCE_EXCEEDED]: '评分离散超过阈值',
  [PortfolioEvaluationAdvanceBlockingCode.EXPERT_REVIEW_INCOMPLETE]: '专家评审未完成',
}

export function isPortfolioEvaluationAdvanceBlockingCode(
  value: unknown,
): value is PortfolioEvaluationAdvanceBlockingCode {
  return typeof value === 'string'
    && (ALL_PORTFOLIO_EVALUATION_ADVANCE_BLOCKING_CODES as readonly string[]).includes(value)
}
