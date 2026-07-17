/** 多元评价任务状态 */
export enum PortfolioEvaluationTaskStatusCode {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PRELIMINARY_REVIEW = 'PRELIMINARY_REVIEW',
  SCHOOL_REVIEW = 'SCHOOL_REVIEW',
  EXPERT_REVIEW = 'EXPERT_REVIEW',
  RESULT_SUMMARY = 'RESULT_SUMMARY',
  PUBLICITY = 'PUBLICITY',
  OBJECTION_HANDLING = 'OBJECTION_HANDLING',
  ARCHIVED = 'ARCHIVED',
  CORRECTION_REVIEW = 'CORRECTION_REVIEW',
  SUSPENDED = 'SUSPENDED',
  VOID = 'VOID',
  CLOSED = 'CLOSED',
}

export const ALL_PORTFOLIO_EVALUATION_TASK_STATUS_CODES: readonly PortfolioEvaluationTaskStatusCode[] = [
  PortfolioEvaluationTaskStatusCode.DRAFT,
  PortfolioEvaluationTaskStatusCode.PUBLISHED,
  PortfolioEvaluationTaskStatusCode.PRELIMINARY_REVIEW,
  PortfolioEvaluationTaskStatusCode.SCHOOL_REVIEW,
  PortfolioEvaluationTaskStatusCode.EXPERT_REVIEW,
  PortfolioEvaluationTaskStatusCode.RESULT_SUMMARY,
  PortfolioEvaluationTaskStatusCode.PUBLICITY,
  PortfolioEvaluationTaskStatusCode.OBJECTION_HANDLING,
  PortfolioEvaluationTaskStatusCode.ARCHIVED,
  PortfolioEvaluationTaskStatusCode.CORRECTION_REVIEW,
  PortfolioEvaluationTaskStatusCode.SUSPENDED,
  PortfolioEvaluationTaskStatusCode.VOID,
  PortfolioEvaluationTaskStatusCode.CLOSED,
]

export const PortfolioEvaluationTaskStatusDescription: Record<PortfolioEvaluationTaskStatusCode, string> = {
  [PortfolioEvaluationTaskStatusCode.DRAFT]: '草稿',
  [PortfolioEvaluationTaskStatusCode.PUBLISHED]: '已发布',
  [PortfolioEvaluationTaskStatusCode.PRELIMINARY_REVIEW]: '资格初审中',
  [PortfolioEvaluationTaskStatusCode.SCHOOL_REVIEW]: '学校复审中',
  [PortfolioEvaluationTaskStatusCode.EXPERT_REVIEW]: '专家评审中',
  [PortfolioEvaluationTaskStatusCode.RESULT_SUMMARY]: '结果汇总中',
  [PortfolioEvaluationTaskStatusCode.PUBLICITY]: '公示中',
  [PortfolioEvaluationTaskStatusCode.OBJECTION_HANDLING]: '异议处理中',
  [PortfolioEvaluationTaskStatusCode.ARCHIVED]: '已归档',
  [PortfolioEvaluationTaskStatusCode.CORRECTION_REVIEW]: '更正复核中',
  [PortfolioEvaluationTaskStatusCode.SUSPENDED]: '已暂停',
  [PortfolioEvaluationTaskStatusCode.VOID]: '已作废',
  [PortfolioEvaluationTaskStatusCode.CLOSED]: '已关闭',
}
