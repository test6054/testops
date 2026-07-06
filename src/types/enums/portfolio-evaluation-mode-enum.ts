/** 多元评价模式 */
export enum PortfolioEvaluationModeCode {
  BY_PERSON = 'BY_PERSON',
  BY_INDICATOR = 'BY_INDICATOR',
}

export const ALL_PORTFOLIO_EVALUATION_MODE_CODES: readonly PortfolioEvaluationModeCode[] = [
  PortfolioEvaluationModeCode.BY_PERSON,
  PortfolioEvaluationModeCode.BY_INDICATOR,
]

export const PortfolioEvaluationModeDescription: Record<PortfolioEvaluationModeCode, string> = {
  [PortfolioEvaluationModeCode.BY_PERSON]: '以人为主',
  [PortfolioEvaluationModeCode.BY_INDICATOR]: '以指标为主',
}
