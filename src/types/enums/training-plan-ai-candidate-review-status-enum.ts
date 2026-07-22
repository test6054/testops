/** 培养方案 AI 候选审阅状态 - TrainingPlanAiCandidateReviewStatusEnum */
export enum TrainingPlanAiCandidateReviewStatusCode {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

export const ALL_TRAINING_PLAN_AI_CANDIDATE_REVIEW_STATUS_CODES: readonly TrainingPlanAiCandidateReviewStatusCode[] = [
  TrainingPlanAiCandidateReviewStatusCode.PENDING,
  TrainingPlanAiCandidateReviewStatusCode.CONFIRMED,
  TrainingPlanAiCandidateReviewStatusCode.REJECTED,
]

export const TrainingPlanAiCandidateReviewStatusDescription: Record<TrainingPlanAiCandidateReviewStatusCode, string> = {
  [TrainingPlanAiCandidateReviewStatusCode.PENDING]: '待确认',
  [TrainingPlanAiCandidateReviewStatusCode.CONFIRMED]: '已确认',
  [TrainingPlanAiCandidateReviewStatusCode.REJECTED]: '已驳回',
}
