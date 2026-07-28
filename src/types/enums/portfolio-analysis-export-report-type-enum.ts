/** 档案袋分析报告导出类型 - PortfolioAnalysisExportReportTypeEnum */
export enum PortfolioAnalysisExportReportTypeCode {
  COCKPIT = 'COCKPIT',
  ANNUAL = 'ANNUAL',
}

export const ALL_PORTFOLIO_ANALYSIS_EXPORT_REPORT_TYPE_CODES: readonly PortfolioAnalysisExportReportTypeCode[] = [
  PortfolioAnalysisExportReportTypeCode.COCKPIT,
  PortfolioAnalysisExportReportTypeCode.ANNUAL,
]

export const PortfolioAnalysisExportReportTypeDescription: Record<
  PortfolioAnalysisExportReportTypeCode,
  string
> = {
  [PortfolioAnalysisExportReportTypeCode.COCKPIT]: '驾驶舱分析报告',
  [PortfolioAnalysisExportReportTypeCode.ANNUAL]: '年度分析报告',
}
