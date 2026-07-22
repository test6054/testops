/** 年度评价课程计划状态 - AnnualEvaluationPlanStatusEnum */
export enum AnnualEvaluationPlanStatusCode {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
}

export const ALL_ANNUAL_EVALUATION_PLAN_STATUS_CODES: readonly AnnualEvaluationPlanStatusCode[] = [
  AnnualEvaluationPlanStatusCode.DRAFT,
  AnnualEvaluationPlanStatusCode.PUBLISHED,
  AnnualEvaluationPlanStatusCode.CLOSED,
]

export const AnnualEvaluationPlanStatusDescription: Record<AnnualEvaluationPlanStatusCode, string> = {
  [AnnualEvaluationPlanStatusCode.DRAFT]: '起草中',
  [AnnualEvaluationPlanStatusCode.PUBLISHED]: '已发布',
  [AnnualEvaluationPlanStatusCode.CLOSED]: '已关闭',
}
