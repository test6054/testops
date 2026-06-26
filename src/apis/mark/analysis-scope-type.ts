/** 分析范围类型 - 与后端 AnalysisScopeType 枚举完全一致 */
export type AnalysisScopeTypeCode
  = | 'EXAM'
    | 'CLASS'
    | 'COURSE'
    | 'QUESTION'
    | 'QUESTION_TYPE'
    | 'STUDENT'

/** 分析范围类型文案 - 与后端 AnalysisScopeType.message 完全一致 */
export const ANALYSIS_SCOPE_TYPE_LABEL: Record<AnalysisScopeTypeCode, string> = {
  EXAM: '考试维度',
  CLASS: '班级维度',
  COURSE: '课程维度',
  QUESTION: '题目维度',
  QUESTION_TYPE: '题型维度',
  STUDENT: '学生个体维度',
}
