/** 评价任务推进阻断编码 - PortfolioEvaluationAdvanceBlockingCode */
export enum PortfolioEvaluationAdvanceBlockingCode {
  SCORE_VARIANCE_EXCEEDED = 'SCORE_VARIANCE_EXCEEDED',
}

export const ALL_PORTFOLIO_EVALUATION_ADVANCE_BLOCKING_CODES: readonly PortfolioEvaluationAdvanceBlockingCode[] = [
  PortfolioEvaluationAdvanceBlockingCode.SCORE_VARIANCE_EXCEEDED,
]

export const PortfolioEvaluationAdvanceBlockingDescription: Record<
  PortfolioEvaluationAdvanceBlockingCode,
  string
> = {
  [PortfolioEvaluationAdvanceBlockingCode.SCORE_VARIANCE_EXCEEDED]: '评分离散超过阈值',
}

export function isPortfolioEvaluationAdvanceBlockingCode(
  value: unknown,
): value is PortfolioEvaluationAdvanceBlockingCode {
  return typeof value === 'string'
    && (ALL_PORTFOLIO_EVALUATION_ADVANCE_BLOCKING_CODES as readonly string[]).includes(value)
}
