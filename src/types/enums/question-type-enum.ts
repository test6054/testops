/** 题目类型 */
export enum QuestionTypeCode {
  OBJECTIVE = 'OBJECTIVE',
  SUBJECTIVE = 'SUBJECTIVE',
}

export const ALL_QUESTION_TYPE_CODES: readonly QuestionTypeCode[] = [
  QuestionTypeCode.OBJECTIVE,
  QuestionTypeCode.SUBJECTIVE,
]

export const QuestionTypeDescription: Record<QuestionTypeCode, string> = {
  [QuestionTypeCode.OBJECTIVE]: '客观题',
  [QuestionTypeCode.SUBJECTIVE]: '主观题',
}

