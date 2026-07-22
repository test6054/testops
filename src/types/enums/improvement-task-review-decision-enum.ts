/** 持续改进任务复评结论 - ImprovementTaskReviewDecisionEnum */
export enum ImprovementTaskReviewDecisionCode {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const ALL_IMPROVEMENT_TASK_REVIEW_DECISION_CODES: readonly ImprovementTaskReviewDecisionCode[] = [
  ImprovementTaskReviewDecisionCode.APPROVED,
  ImprovementTaskReviewDecisionCode.REJECTED,
]

export const ImprovementTaskReviewDecisionDescription: Record<ImprovementTaskReviewDecisionCode, string> = {
  [ImprovementTaskReviewDecisionCode.APPROVED]: '复评通过',
  [ImprovementTaskReviewDecisionCode.REJECTED]: '复评驳回',
}
