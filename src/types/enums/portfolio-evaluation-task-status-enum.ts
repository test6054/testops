/** 多元评价任务状态 - 与后端 PortfolioEvaluationTaskStatusEnum 逐值对齐 */
export enum PortfolioEvaluationTaskStatusEnum {
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

export const ALL_PORTFOLIO_EVALUATION_TASK_STATUS_ENUMS: readonly PortfolioEvaluationTaskStatusEnum[] = [
  PortfolioEvaluationTaskStatusEnum.DRAFT,
  PortfolioEvaluationTaskStatusEnum.PUBLISHED,
  PortfolioEvaluationTaskStatusEnum.PRELIMINARY_REVIEW,
  PortfolioEvaluationTaskStatusEnum.SCHOOL_REVIEW,
  PortfolioEvaluationTaskStatusEnum.EXPERT_REVIEW,
  PortfolioEvaluationTaskStatusEnum.RESULT_SUMMARY,
  PortfolioEvaluationTaskStatusEnum.PUBLICITY,
  PortfolioEvaluationTaskStatusEnum.OBJECTION_HANDLING,
  PortfolioEvaluationTaskStatusEnum.ARCHIVED,
  PortfolioEvaluationTaskStatusEnum.CORRECTION_REVIEW,
  PortfolioEvaluationTaskStatusEnum.SUSPENDED,
  PortfolioEvaluationTaskStatusEnum.VOID,
  PortfolioEvaluationTaskStatusEnum.CLOSED,
]

export const PortfolioEvaluationTaskStatusDescription: Record<PortfolioEvaluationTaskStatusEnum, string> = {
  [PortfolioEvaluationTaskStatusEnum.DRAFT]: '草稿',
  [PortfolioEvaluationTaskStatusEnum.PUBLISHED]: '已发布',
  [PortfolioEvaluationTaskStatusEnum.PRELIMINARY_REVIEW]: '资格初审中',
  [PortfolioEvaluationTaskStatusEnum.SCHOOL_REVIEW]: '学校复审中',
  [PortfolioEvaluationTaskStatusEnum.EXPERT_REVIEW]: '专家评审中',
  [PortfolioEvaluationTaskStatusEnum.RESULT_SUMMARY]: '结果汇总中',
  [PortfolioEvaluationTaskStatusEnum.PUBLICITY]: '公示中',
  [PortfolioEvaluationTaskStatusEnum.OBJECTION_HANDLING]: '异议处理中',
  [PortfolioEvaluationTaskStatusEnum.ARCHIVED]: '已归档',
  [PortfolioEvaluationTaskStatusEnum.CORRECTION_REVIEW]: '更正复核中',
  [PortfolioEvaluationTaskStatusEnum.SUSPENDED]: '已暂停',
  [PortfolioEvaluationTaskStatusEnum.VOID]: '已作废',
  [PortfolioEvaluationTaskStatusEnum.CLOSED]: '已关闭',
}
