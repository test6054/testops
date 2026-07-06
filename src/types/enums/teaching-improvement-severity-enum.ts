/** TeachingImprovementSeverity */
export enum TeachingImprovementSeverityCode {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export const ALL_TEACHING_IMPROVEMENT_SEVERITY_CODES: readonly TeachingImprovementSeverityCode[] = [
  TeachingImprovementSeverityCode.HIGH,
  TeachingImprovementSeverityCode.MEDIUM,
  TeachingImprovementSeverityCode.LOW,
]

export const TeachingImprovementSeverityDescription: Record<TeachingImprovementSeverityCode, string> = {
  [TeachingImprovementSeverityCode.HIGH]: '高',
  [TeachingImprovementSeverityCode.MEDIUM]: '中',
  [TeachingImprovementSeverityCode.LOW]: '低',
}

