/** 评价异议状态 - PortfolioEvaluationObjectionStatusEnum */
export enum PortfolioEvaluationObjectionStatusCode {
  SUBMITTED = 'SUBMITTED',
  UPHELD = 'UPHELD',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
}

export const ALL_PORTFOLIO_EVALUATION_OBJECTION_STATUS_CODES: readonly PortfolioEvaluationObjectionStatusCode[] = [
  PortfolioEvaluationObjectionStatusCode.SUBMITTED,
  PortfolioEvaluationObjectionStatusCode.UPHELD,
  PortfolioEvaluationObjectionStatusCode.REJECTED,
  PortfolioEvaluationObjectionStatusCode.CLOSED,
]

export const PortfolioEvaluationObjectionStatusDescription: Record<PortfolioEvaluationObjectionStatusCode, string> = {
  [PortfolioEvaluationObjectionStatusCode.SUBMITTED]: '已提交',
  [PortfolioEvaluationObjectionStatusCode.UPHELD]: '异议成立',
  [PortfolioEvaluationObjectionStatusCode.REJECTED]: '异议驳回',
  [PortfolioEvaluationObjectionStatusCode.CLOSED]: '已关闭',
}
