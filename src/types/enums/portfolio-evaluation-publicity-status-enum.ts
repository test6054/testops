/** 评价公示状态 - PortfolioEvaluationPublicityStatusEnum */
export enum PortfolioEvaluationPublicityStatusCode {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export const ALL_PORTFOLIO_EVALUATION_PUBLICITY_STATUS_CODES: readonly PortfolioEvaluationPublicityStatusCode[] = [
  PortfolioEvaluationPublicityStatusCode.OPEN,
  PortfolioEvaluationPublicityStatusCode.CLOSED,
]

export const PortfolioEvaluationPublicityStatusDescription: Record<PortfolioEvaluationPublicityStatusCode, string> = {
  [PortfolioEvaluationPublicityStatusCode.OPEN]: '公示中',
  [PortfolioEvaluationPublicityStatusCode.CLOSED]: '已结束',
}
