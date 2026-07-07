/** 自评审阅决议 - SelfAssessmentReviewDecisionEnum */
export enum SelfAssessmentReviewDecisionCode {
  ACCEPTED = 'ACCEPTED',
  SUPPLEMENT_REQUIRED = 'SUPPLEMENT_REQUIRED',
  REJECTED = 'REJECTED',
}

export const ALL_SELF_ASSESSMENT_REVIEW_DECISION_CODES: readonly SelfAssessmentReviewDecisionCode[] = [
  SelfAssessmentReviewDecisionCode.ACCEPTED,
  SelfAssessmentReviewDecisionCode.SUPPLEMENT_REQUIRED,
  SelfAssessmentReviewDecisionCode.REJECTED,
]

export const SelfAssessmentReviewDecisionDescription: Record<SelfAssessmentReviewDecisionCode, string> = {
  [SelfAssessmentReviewDecisionCode.ACCEPTED]: '接受',
  [SelfAssessmentReviewDecisionCode.SUPPLEMENT_REQUIRED]: '需补正',
  [SelfAssessmentReviewDecisionCode.REJECTED]: '驳回',
}

