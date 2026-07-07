/** CourseObjectiveDimension */
export enum CourseObjectiveDimensionCode {
  OVERALL_SCORE_RATE = 'OVERALL_SCORE_RATE',
  PASS_RATE = 'PASS_RATE',
  SCORE_STABILITY = 'SCORE_STABILITY',
}

export const ALL_COURSE_OBJECTIVE_DIMENSION_CODES: readonly CourseObjectiveDimensionCode[] = [
  CourseObjectiveDimensionCode.OVERALL_SCORE_RATE,
  CourseObjectiveDimensionCode.PASS_RATE,
  CourseObjectiveDimensionCode.SCORE_STABILITY,
]

export const CourseObjectiveDimensionDescription: Record<CourseObjectiveDimensionCode, string> = {
  [CourseObjectiveDimensionCode.OVERALL_SCORE_RATE]: '总体得分率',
  [CourseObjectiveDimensionCode.PASS_RATE]: '及格率',
  [CourseObjectiveDimensionCode.SCORE_STABILITY]: '成绩稳定性',
}

