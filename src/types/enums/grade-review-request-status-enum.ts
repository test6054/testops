/** 成绩复核申请状态 */
export enum GradeReviewRequestStatusCode {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CORRECTED = 'CORRECTED',
}

export const ALL_GRADE_REVIEW_REQUEST_STATUS_CODES: readonly GradeReviewRequestStatusCode[] = [
  GradeReviewRequestStatusCode.PENDING,
  GradeReviewRequestStatusCode.IN_REVIEW,
  GradeReviewRequestStatusCode.APPROVED,
  GradeReviewRequestStatusCode.REJECTED,
  GradeReviewRequestStatusCode.CORRECTED,
]

export const GradeReviewRequestStatusDescription: Record<GradeReviewRequestStatusCode, string> = {
  [GradeReviewRequestStatusCode.PENDING]: '待处理',
  [GradeReviewRequestStatusCode.IN_REVIEW]: '复核中',
  [GradeReviewRequestStatusCode.APPROVED]: '已通过',
  [GradeReviewRequestStatusCode.REJECTED]: '已驳回',
  [GradeReviewRequestStatusCode.CORRECTED]: '已更正',
}

