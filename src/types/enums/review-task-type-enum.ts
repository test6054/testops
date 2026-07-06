/** 复核任务类型 - 与后端 TaskType 对齐 */
export enum ReviewTaskTypeCode {
  OBJECTIVE_AUTO_REVIEW = 'OBJECTIVE_AUTO_REVIEW',
  OBJECTIVE_AI_REVIEW = 'OBJECTIVE_AI_REVIEW',
  SUBJECTIVE_AI_REVIEW = 'SUBJECTIVE_AI_REVIEW',
  QUESTION_REVIEW_ARBITRATION = 'QUESTION_REVIEW_ARBITRATION',
}

export const ALL_REVIEW_TASK_TYPE_CODES: readonly ReviewTaskTypeCode[] = [
  ReviewTaskTypeCode.OBJECTIVE_AUTO_REVIEW,
  ReviewTaskTypeCode.OBJECTIVE_AI_REVIEW,
  ReviewTaskTypeCode.SUBJECTIVE_AI_REVIEW,
  ReviewTaskTypeCode.QUESTION_REVIEW_ARBITRATION,
]

export const ReviewTaskTypeDescription: Record<ReviewTaskTypeCode, string> = {
  [ReviewTaskTypeCode.OBJECTIVE_AUTO_REVIEW]: '客观题（硬比对）',
  [ReviewTaskTypeCode.OBJECTIVE_AI_REVIEW]: '客观题（AI 评分）',
  [ReviewTaskTypeCode.SUBJECTIVE_AI_REVIEW]: '主观题（AI 评分）',
  [ReviewTaskTypeCode.QUESTION_REVIEW_ARBITRATION]: '题目复核仲裁',
}

export const ReviewTaskTypeTone: Record<ReviewTaskTypeCode, 'blue' | 'green' | 'purple'> = {
  [ReviewTaskTypeCode.OBJECTIVE_AUTO_REVIEW]: 'green',
  [ReviewTaskTypeCode.OBJECTIVE_AI_REVIEW]: 'blue',
  [ReviewTaskTypeCode.SUBJECTIVE_AI_REVIEW]: 'purple',
  [ReviewTaskTypeCode.QUESTION_REVIEW_ARBITRATION]: 'blue',
}
