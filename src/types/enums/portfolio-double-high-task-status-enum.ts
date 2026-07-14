/** 双高任务状态 - PortfolioDoubleHighTaskStatusEnum */
export enum PortfolioDoubleHighTaskStatusCode {
  PUBLISHED = 'PUBLISHED',
  CLAIMED = 'CLAIMED',
  IN_PROGRESS = 'IN_PROGRESS',
  STAGE_SUBMITTED = 'STAGE_SUBMITTED',
  STAGE_REVIEWING = 'STAGE_REVIEWING',
  ACCEPTANCE = 'ACCEPTANCE',
  ARCHIVED = 'ARCHIVED',
  VOID = 'VOID',
}

export const ALL_PORTFOLIO_DOUBLE_HIGH_TASK_STATUS_CODES: readonly PortfolioDoubleHighTaskStatusCode[] = [
  PortfolioDoubleHighTaskStatusCode.PUBLISHED,
  PortfolioDoubleHighTaskStatusCode.CLAIMED,
  PortfolioDoubleHighTaskStatusCode.IN_PROGRESS,
  PortfolioDoubleHighTaskStatusCode.STAGE_SUBMITTED,
  PortfolioDoubleHighTaskStatusCode.STAGE_REVIEWING,
  PortfolioDoubleHighTaskStatusCode.ACCEPTANCE,
  PortfolioDoubleHighTaskStatusCode.ARCHIVED,
  PortfolioDoubleHighTaskStatusCode.VOID,
]

export const PortfolioDoubleHighTaskStatusDescription: Record<PortfolioDoubleHighTaskStatusCode, string> = {
  [PortfolioDoubleHighTaskStatusCode.PUBLISHED]: '已发布',
  [PortfolioDoubleHighTaskStatusCode.CLAIMED]: '已认领',
  [PortfolioDoubleHighTaskStatusCode.IN_PROGRESS]: '实施中',
  [PortfolioDoubleHighTaskStatusCode.STAGE_SUBMITTED]: '阶段已提交',
  [PortfolioDoubleHighTaskStatusCode.STAGE_REVIEWING]: '阶段审核中',
  [PortfolioDoubleHighTaskStatusCode.ACCEPTANCE]: '验收中',
  [PortfolioDoubleHighTaskStatusCode.ARCHIVED]: '已归档',
  [PortfolioDoubleHighTaskStatusCode.VOID]: '已作废',
}
