/** 评价异议复核动作 - PortfolioEvaluationObjectionHandleActionEnum */
export enum PortfolioEvaluationObjectionHandleActionCode {
  MAINTAIN = 'MAINTAIN',
  CORRECT = 'CORRECT',
  REVOKE = 'REVOKE',
  RE_REVIEW = 'RE_REVIEW',
}

export const ALL_PORTFOLIO_EVALUATION_OBJECTION_HANDLE_ACTION_CODES: readonly PortfolioEvaluationObjectionHandleActionCode[] = [
  PortfolioEvaluationObjectionHandleActionCode.MAINTAIN,
  PortfolioEvaluationObjectionHandleActionCode.CORRECT,
  PortfolioEvaluationObjectionHandleActionCode.REVOKE,
  PortfolioEvaluationObjectionHandleActionCode.RE_REVIEW,
]

export const PortfolioEvaluationObjectionHandleActionDescription: Record<PortfolioEvaluationObjectionHandleActionCode, string> = {
  [PortfolioEvaluationObjectionHandleActionCode.MAINTAIN]: '维持原结果',
  [PortfolioEvaluationObjectionHandleActionCode.CORRECT]: '修正评价结果',
  [PortfolioEvaluationObjectionHandleActionCode.REVOKE]: '撤销评价结论',
  [PortfolioEvaluationObjectionHandleActionCode.RE_REVIEW]: '重新评审',
}
