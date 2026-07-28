/** GradingExperienceItemType */
export enum GradingExperienceItemTypeCode {
  COMMON_EXPRESSION = 'COMMON_EXPRESSION',
  COMMON_ERROR = 'COMMON_ERROR',
  BOUNDARY_CASE = 'BOUNDARY_CASE',
  SCORING_PATTERN = 'SCORING_PATTERN',
  TEACHER_ANNOTATION = 'TEACHER_ANNOTATION',
}

export const ALL_GRADING_EXPERIENCE_ITEM_TYPE_CODES: readonly GradingExperienceItemTypeCode[] = [
  GradingExperienceItemTypeCode.COMMON_EXPRESSION,
  GradingExperienceItemTypeCode.COMMON_ERROR,
  GradingExperienceItemTypeCode.BOUNDARY_CASE,
  GradingExperienceItemTypeCode.SCORING_PATTERN,
  GradingExperienceItemTypeCode.TEACHER_ANNOTATION,
]

export const GradingExperienceItemTypeDescription: Record<GradingExperienceItemTypeCode, string> = {
  [GradingExperienceItemTypeCode.COMMON_EXPRESSION]: '常见表述',
  [GradingExperienceItemTypeCode.COMMON_ERROR]: '常见错误',
  [GradingExperienceItemTypeCode.BOUNDARY_CASE]: '边界案例',
  [GradingExperienceItemTypeCode.SCORING_PATTERN]: '评分模式',
  [GradingExperienceItemTypeCode.TEACHER_ANNOTATION]: '教师批注',
}
