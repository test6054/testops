/** TeachingAnalysisType */
export enum TeachingAnalysisTypeCode {
  TEACHING_IMPROVEMENT = 'TEACHING_IMPROVEMENT',
  CLASS_WEAKNESS = 'CLASS_WEAKNESS',
  STUDENT_LEARNING_PROFILE = 'STUDENT_LEARNING_PROFILE',
}

export const ALL_TEACHING_ANALYSIS_TYPE_CODES: readonly TeachingAnalysisTypeCode[] = [
  TeachingAnalysisTypeCode.TEACHING_IMPROVEMENT,
  TeachingAnalysisTypeCode.CLASS_WEAKNESS,
  TeachingAnalysisTypeCode.STUDENT_LEARNING_PROFILE,
]

export const TeachingAnalysisTypeDescription: Record<TeachingAnalysisTypeCode, string> = {
  [TeachingAnalysisTypeCode.TEACHING_IMPROVEMENT]: '教学改进方案',
  [TeachingAnalysisTypeCode.CLASS_WEAKNESS]: '班级薄弱题型',
  [TeachingAnalysisTypeCode.STUDENT_LEARNING_PROFILE]: '学生个体学情',
}
