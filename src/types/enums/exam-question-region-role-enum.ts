/** 制卷题目区域角色，与后端 ExamQuestionRegionRole 逐值一致 */
export enum ExamQuestionRegionRoleCode {
  QUESTION_STEM = 'QUESTION_STEM',
  ANSWER_AREA = 'ANSWER_AREA',
  BUBBLE_AREA = 'BUBBLE_AREA',
  SCORE_AREA = 'SCORE_AREA',
  ANSWER_KEY_AREA = 'ANSWER_KEY_AREA',
}

export const ALL_EXAM_QUESTION_REGION_ROLE_CODES: readonly ExamQuestionRegionRoleCode[] = [
  ExamQuestionRegionRoleCode.QUESTION_STEM,
  ExamQuestionRegionRoleCode.ANSWER_AREA,
  ExamQuestionRegionRoleCode.BUBBLE_AREA,
  ExamQuestionRegionRoleCode.SCORE_AREA,
  ExamQuestionRegionRoleCode.ANSWER_KEY_AREA,
]

export const ExamQuestionRegionRoleDescription: Record<ExamQuestionRegionRoleCode, string> = {
  [ExamQuestionRegionRoleCode.QUESTION_STEM]: '题面区',
  [ExamQuestionRegionRoleCode.ANSWER_AREA]: '作答区',
  [ExamQuestionRegionRoleCode.BUBBLE_AREA]: '填涂区',
  [ExamQuestionRegionRoleCode.SCORE_AREA]: '得分区',
  [ExamQuestionRegionRoleCode.ANSWER_KEY_AREA]: '答案区',
}

