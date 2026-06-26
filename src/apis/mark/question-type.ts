/** 题目类型 - 与后端 QuestionType 枚举完全一致 */
export type QuestionTypeCode = 'OBJECTIVE' | 'SUBJECTIVE'

/** 题目类型文案 - 与后端 QuestionType.message 完全一致 */
export const QUESTION_TYPE_LABEL: Record<QuestionTypeCode, string> = {
  OBJECTIVE: '客观题',
  SUBJECTIVE: '主观题',
}
