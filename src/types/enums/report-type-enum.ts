/** 报告类型 - ReportTypeEnum */
export enum ReportTypeCode {
  COURSE_ACHIEVEMENT = 'COURSE_ACHIEVEMENT',
  PROGRAM_QUALITY = 'PROGRAM_QUALITY',
  IMPROVEMENT = 'IMPROVEMENT',
  AUDIT_EVALUATION_RECTIFICATION = 'AUDIT_EVALUATION_RECTIFICATION',
}

export const ALL_REPORT_TYPE_CODES: readonly ReportTypeCode[] = [
  ReportTypeCode.COURSE_ACHIEVEMENT,
  ReportTypeCode.PROGRAM_QUALITY,
  ReportTypeCode.IMPROVEMENT,
  ReportTypeCode.AUDIT_EVALUATION_RECTIFICATION,
]

export const ReportTypeDescription: Record<ReportTypeCode, string> = {
  [ReportTypeCode.COURSE_ACHIEVEMENT]: '课程目标达成情况评价报告',
  [ReportTypeCode.PROGRAM_QUALITY]: '专业质量分析报告',
  [ReportTypeCode.IMPROVEMENT]: '持续改进报告',
  [ReportTypeCode.AUDIT_EVALUATION_RECTIFICATION]: '审核评估整改报告',
}
