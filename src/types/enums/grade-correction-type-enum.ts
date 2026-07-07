/** 成绩更正类型 */
export enum GradeCorrectionTypeCode {
  SINGLE_QUESTION = 'SINGLE_QUESTION',
  TOTAL_SCORE = 'TOTAL_SCORE',
  SYSTEM_REJUDGE = 'SYSTEM_REJUDGE',
}

export const ALL_GRADE_CORRECTION_TYPE_CODES: readonly GradeCorrectionTypeCode[] = [
  GradeCorrectionTypeCode.SINGLE_QUESTION,
  GradeCorrectionTypeCode.TOTAL_SCORE,
  GradeCorrectionTypeCode.SYSTEM_REJUDGE,
]

export const GradeCorrectionTypeDescription: Record<GradeCorrectionTypeCode, string> = {
  [GradeCorrectionTypeCode.SINGLE_QUESTION]: '单题更正',
  [GradeCorrectionTypeCode.TOTAL_SCORE]: '总分更正',
  [GradeCorrectionTypeCode.SYSTEM_REJUDGE]: '系统重判',
}

