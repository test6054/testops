/** ExportScope */
export enum ExportScopeCode {
  EXAM = 'EXAM',
  CLASS = 'CLASS',
  QUESTION = 'QUESTION',
  STUDENT = 'STUDENT',
}

export const ALL_EXPORT_SCOPE_CODES: readonly ExportScopeCode[] = [
  ExportScopeCode.EXAM,
  ExportScopeCode.CLASS,
  ExportScopeCode.QUESTION,
  ExportScopeCode.STUDENT,
]

export const ExportScopeDescription: Record<ExportScopeCode, string> = {
  [ExportScopeCode.EXAM]: '整场考试',
  [ExportScopeCode.CLASS]: '指定班级',
  [ExportScopeCode.QUESTION]: '指定题目',
  [ExportScopeCode.STUDENT]: '指定学生',
}

