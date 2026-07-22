/** 评价任务推进动作 - PortfolioEvaluationTaskAdvanceActionEnum */
export enum PortfolioEvaluationTaskAdvanceActionCode {
  START_PRELIMINARY_REVIEW = 'START_PRELIMINARY_REVIEW',
  START_SCHOOL_REVIEW = 'START_SCHOOL_REVIEW',
  START_EXPERT_REVIEW = 'START_EXPERT_REVIEW',
  START_RESULT_SUMMARY = 'START_RESULT_SUMMARY',
  START_PUBLICITY = 'START_PUBLICITY',
  START_OBJECTION_HANDLING = 'START_OBJECTION_HANDLING',
  ARCHIVE = 'ARCHIVE',
  SUSPEND = 'SUSPEND',
  RESUME = 'RESUME',
  VOID = 'VOID',
  CLOSE = 'CLOSE',
  START_CORRECTION_REVIEW = 'START_CORRECTION_REVIEW',
  COMPLETE_CORRECTION_REVIEW = 'COMPLETE_CORRECTION_REVIEW',
}

export const ALL_PORTFOLIO_EVALUATION_TASK_ADVANCE_ACTION_CODES: readonly PortfolioEvaluationTaskAdvanceActionCode[] = [
  PortfolioEvaluationTaskAdvanceActionCode.START_PRELIMINARY_REVIEW,
  PortfolioEvaluationTaskAdvanceActionCode.START_SCHOOL_REVIEW,
  PortfolioEvaluationTaskAdvanceActionCode.START_EXPERT_REVIEW,
  PortfolioEvaluationTaskAdvanceActionCode.START_RESULT_SUMMARY,
  PortfolioEvaluationTaskAdvanceActionCode.START_PUBLICITY,
  PortfolioEvaluationTaskAdvanceActionCode.START_OBJECTION_HANDLING,
  PortfolioEvaluationTaskAdvanceActionCode.ARCHIVE,
  PortfolioEvaluationTaskAdvanceActionCode.SUSPEND,
  PortfolioEvaluationTaskAdvanceActionCode.RESUME,
  PortfolioEvaluationTaskAdvanceActionCode.VOID,
  PortfolioEvaluationTaskAdvanceActionCode.CLOSE,
  PortfolioEvaluationTaskAdvanceActionCode.START_CORRECTION_REVIEW,
  PortfolioEvaluationTaskAdvanceActionCode.COMPLETE_CORRECTION_REVIEW,
]

export const PortfolioEvaluationTaskAdvanceActionDescription: Record<PortfolioEvaluationTaskAdvanceActionCode, string> = {
  [PortfolioEvaluationTaskAdvanceActionCode.START_PRELIMINARY_REVIEW]: '进入资格初审',
  [PortfolioEvaluationTaskAdvanceActionCode.START_SCHOOL_REVIEW]: '进入学校复审',
  [PortfolioEvaluationTaskAdvanceActionCode.START_EXPERT_REVIEW]: '进入专家评审',
  [PortfolioEvaluationTaskAdvanceActionCode.START_RESULT_SUMMARY]: '进入结果汇总',
  [PortfolioEvaluationTaskAdvanceActionCode.START_PUBLICITY]: '发布公示',
  [PortfolioEvaluationTaskAdvanceActionCode.START_OBJECTION_HANDLING]: '进入异议处理',
  [PortfolioEvaluationTaskAdvanceActionCode.ARCHIVE]: '归档',
  [PortfolioEvaluationTaskAdvanceActionCode.SUSPEND]: '暂停',
  [PortfolioEvaluationTaskAdvanceActionCode.RESUME]: '恢复',
  [PortfolioEvaluationTaskAdvanceActionCode.VOID]: '作废',
  [PortfolioEvaluationTaskAdvanceActionCode.CLOSE]: '关闭',
  [PortfolioEvaluationTaskAdvanceActionCode.START_CORRECTION_REVIEW]: '进入更正复核',
  [PortfolioEvaluationTaskAdvanceActionCode.COMPLETE_CORRECTION_REVIEW]: '完成更正复核',
}
