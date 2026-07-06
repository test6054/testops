/** 成绩复核原因类型 */
export enum GradeReviewReasonTypeCode {
  SCORE_ERROR = 'SCORE_ERROR',
  RUBRIC = 'RUBRIC',
  OBJECTIVE = 'OBJECTIVE',
  OTHER = 'OTHER',
}

export const ALL_GRADE_REVIEW_REASON_TYPE_CODES: readonly GradeReviewReasonTypeCode[] = [
  GradeReviewReasonTypeCode.SCORE_ERROR,
  GradeReviewReasonTypeCode.RUBRIC,
  GradeReviewReasonTypeCode.OBJECTIVE,
  GradeReviewReasonTypeCode.OTHER,
]

export const GradeReviewReasonTypeDescription: Record<GradeReviewReasonTypeCode, string> = {
  [GradeReviewReasonTypeCode.SCORE_ERROR]: '分数计算错误',
  [GradeReviewReasonTypeCode.RUBRIC]: '评分标准争议',
  [GradeReviewReasonTypeCode.OBJECTIVE]: '客观题判定争议',
  [GradeReviewReasonTypeCode.OTHER]: '其他',
}

