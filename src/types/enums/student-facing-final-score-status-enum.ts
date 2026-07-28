/** 学生端可见最终成绩态 — StudentFacingFinalScoreStatus */
export enum StudentFacingFinalScoreStatusCode {
  UNPUBLISHED = 'UNPUBLISHED',
  PUBLISHED = 'PUBLISHED',
  CORRECTED = 'CORRECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export const ALL_STUDENT_FACING_FINAL_SCORE_STATUS_CODES: readonly StudentFacingFinalScoreStatusCode[] = [
  StudentFacingFinalScoreStatusCode.UNPUBLISHED,
  StudentFacingFinalScoreStatusCode.PUBLISHED,
  StudentFacingFinalScoreStatusCode.CORRECTED,
  StudentFacingFinalScoreStatusCode.WITHDRAWN,
]

export const StudentFacingFinalScoreStatusDescription: Record<StudentFacingFinalScoreStatusCode, string> = {
  [StudentFacingFinalScoreStatusCode.UNPUBLISHED]: '未发布',
  [StudentFacingFinalScoreStatusCode.PUBLISHED]: '已发布',
  [StudentFacingFinalScoreStatusCode.CORRECTED]: '更正待重发',
  [StudentFacingFinalScoreStatusCode.WITHDRAWN]: '已撤回',
}
