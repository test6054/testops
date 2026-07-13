/** ExamQuestionCourseGoalMappingStatus */
export enum ExamQuestionCourseGoalMappingStatusCode {
  MAPPED = 'MAPPED',
  UNMAPPED = 'UNMAPPED',
}

export const ALL_EXAM_QUESTION_COURSE_GOAL_MAPPING_STATUS_CODES: readonly ExamQuestionCourseGoalMappingStatusCode[]
  = [ExamQuestionCourseGoalMappingStatusCode.MAPPED, ExamQuestionCourseGoalMappingStatusCode.UNMAPPED]

export const ExamQuestionCourseGoalMappingStatusDescription: Record<
  ExamQuestionCourseGoalMappingStatusCode,
  string
> = {
  [ExamQuestionCourseGoalMappingStatusCode.MAPPED]: '已映射',
  [ExamQuestionCourseGoalMappingStatusCode.UNMAPPED]: '未映射',
}

export const EXAM_QUESTION_COURSE_GOAL_MAPPING_STATUS_TONE: Record<
  ExamQuestionCourseGoalMappingStatusCode,
  'green' | 'gray'
> = {
  [ExamQuestionCourseGoalMappingStatusCode.MAPPED]: 'green',
  [ExamQuestionCourseGoalMappingStatusCode.UNMAPPED]: 'gray',
}
