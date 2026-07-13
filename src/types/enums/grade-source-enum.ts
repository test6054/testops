/** GradeSource */
export enum GradeSourceCode {
  AUTO_OBJECTIVE = 'AUTO_OBJECTIVE',
  AUTO_OBJECTIVE_AI = 'AUTO_OBJECTIVE_AI',
  LOCAL_SUBJECTIVE_AI = 'LOCAL_SUBJECTIVE_AI',
  TEACHER = 'TEACHER',
}

export const ALL_GRADE_SOURCE_CODES: readonly GradeSourceCode[] = [
  GradeSourceCode.AUTO_OBJECTIVE,
  GradeSourceCode.AUTO_OBJECTIVE_AI,
  GradeSourceCode.LOCAL_SUBJECTIVE_AI,
  GradeSourceCode.TEACHER,
]

export const GradeSourceDescription: Record<GradeSourceCode, string> = {
  [GradeSourceCode.AUTO_OBJECTIVE]: '客观题硬判（待确认）',
  [GradeSourceCode.AUTO_OBJECTIVE_AI]: '客观题AI批改',
  [GradeSourceCode.LOCAL_SUBJECTIVE_AI]: '本地主观题AI批改',
  [GradeSourceCode.TEACHER]: '教师人工批改',
}
