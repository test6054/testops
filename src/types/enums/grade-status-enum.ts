/** 题目批改状态 */
export enum GradeStatusCode {
  PENDING = 'PENDING',
  NEED_REVIEW = 'NEED_REVIEW',
  CONFIRMED = 'CONFIRMED',
}

export const ALL_GRADE_STATUS_CODES: readonly GradeStatusCode[] = [
  GradeStatusCode.PENDING,
  GradeStatusCode.NEED_REVIEW,
  GradeStatusCode.CONFIRMED,
]

export const GradeStatusDescription: Record<GradeStatusCode, string> = {
  [GradeStatusCode.PENDING]: '待批改',
  [GradeStatusCode.NEED_REVIEW]: '待复核',
  [GradeStatusCode.CONFIRMED]: '已确认',
}

