/** 分析范围类型 */
export enum AnalysisScopeTypeCode {
  EXAM = 'EXAM',
  CLASS = 'CLASS',
  COURSE = 'COURSE',
  QUESTION = 'QUESTION',
  QUESTION_TYPE = 'QUESTION_TYPE',
  STUDENT = 'STUDENT',
}

export const ALL_ANALYSIS_SCOPE_TYPE_CODES: readonly AnalysisScopeTypeCode[] = [
  AnalysisScopeTypeCode.EXAM,
  AnalysisScopeTypeCode.CLASS,
  AnalysisScopeTypeCode.COURSE,
  AnalysisScopeTypeCode.QUESTION,
  AnalysisScopeTypeCode.QUESTION_TYPE,
  AnalysisScopeTypeCode.STUDENT,
]

export const AnalysisScopeTypeDescription: Record<AnalysisScopeTypeCode, string> = {
  [AnalysisScopeTypeCode.EXAM]: '考试维度',
  [AnalysisScopeTypeCode.CLASS]: '班级维度',
  [AnalysisScopeTypeCode.COURSE]: '课程维度',
  [AnalysisScopeTypeCode.QUESTION]: '题目维度',
  [AnalysisScopeTypeCode.QUESTION_TYPE]: '题型维度',
  [AnalysisScopeTypeCode.STUDENT]: '学生个体维度',
}
