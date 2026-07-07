/** 题目区域角色编码 - 与后端 ExamQuestionRegionRole.code 完全一致 */
export type ExamQuestionRegionRoleCode
  = 'QUESTION_STEM'
    | 'ANSWER_AREA'
    | 'BUBBLE_AREA'
    | 'SCORE_AREA'
    | 'ANSWER_KEY_AREA'

/** 题目区域角色文案 - 与后端 ExamQuestionRegionRole.message 完全一致 */
export const EXAM_QUESTION_REGION_ROLE_LABEL: Record<ExamQuestionRegionRoleCode, string> = {
  QUESTION_STEM: '题面区',
  ANSWER_AREA: '作答区',
  BUBBLE_AREA: '填涂区',
  SCORE_AREA: '得分区',
  ANSWER_KEY_AREA: '答案区',
}
