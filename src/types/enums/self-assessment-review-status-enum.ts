/** 认证自评审阅状态 - SelfAssessmentReviewStatusEnum */
export enum SelfAssessmentReviewStatusCode {
  PENDING = 'PENDING',
  DECIDED = 'DECIDED',
}

export const ALL_SELF_ASSESSMENT_REVIEW_STATUS_CODES: readonly SelfAssessmentReviewStatusCode[] = [
  SelfAssessmentReviewStatusCode.PENDING,
  SelfAssessmentReviewStatusCode.DECIDED,
]

export const SelfAssessmentReviewStatusDescription: Record<SelfAssessmentReviewStatusCode, string> = {
  [SelfAssessmentReviewStatusCode.PENDING]: '待审阅',
  [SelfAssessmentReviewStatusCode.DECIDED]: '已决议',
}
