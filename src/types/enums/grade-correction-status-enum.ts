/** 成绩更正记录状态 */
export enum GradeCorrectionStatusCode {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  EXECUTED = 'EXECUTED',
  REJECTED = 'REJECTED',
}

export const ALL_GRADE_CORRECTION_STATUS_CODES: readonly GradeCorrectionStatusCode[] = [
  GradeCorrectionStatusCode.PENDING,
  GradeCorrectionStatusCode.APPROVED,
  GradeCorrectionStatusCode.EXECUTED,
  GradeCorrectionStatusCode.REJECTED,
]

export const GradeCorrectionStatusDescription: Record<GradeCorrectionStatusCode, string> = {
  [GradeCorrectionStatusCode.PENDING]: '待处理',
  [GradeCorrectionStatusCode.APPROVED]: '已通过',
  [GradeCorrectionStatusCode.EXECUTED]: '已执行',
  [GradeCorrectionStatusCode.REJECTED]: '已驳回',
}

