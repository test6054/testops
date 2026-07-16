/** 导出类型 - PortfolioExportTypeEnum */
export enum PortfolioExportTypeCode {
  MAJOR_GROUP_PORTFOLIO = 'MAJOR_GROUP_PORTFOLIO',
  DEPARTMENT_REPORT = 'DEPARTMENT_REPORT',
  TEACHER_ARCHIVE = 'TEACHER_ARCHIVE',
  ANALYSIS_REPORT = 'ANALYSIS_REPORT',
}

export const ALL_PORTFOLIO_EXPORT_TYPE_CODES: readonly PortfolioExportTypeCode[] = [
  PortfolioExportTypeCode.MAJOR_GROUP_PORTFOLIO,
  PortfolioExportTypeCode.DEPARTMENT_REPORT,
  PortfolioExportTypeCode.TEACHER_ARCHIVE,
  PortfolioExportTypeCode.ANALYSIS_REPORT,
]

export const PortfolioExportTypeDescription: Record<PortfolioExportTypeCode, string> = {
  [PortfolioExportTypeCode.MAJOR_GROUP_PORTFOLIO]: '专业群档案袋',
  [PortfolioExportTypeCode.DEPARTMENT_REPORT]: '院系报告',
  [PortfolioExportTypeCode.TEACHER_ARCHIVE]: '教师档案包',
  [PortfolioExportTypeCode.ANALYSIS_REPORT]: '分析报告',
}
