/** 导出类型 */
export enum ExportTypeCode {
  SCORE_EXCEL = 'SCORE_EXCEL',
  SCORE_PDF = 'SCORE_PDF',
  ANALYSIS_REPORT = 'ANALYSIS_REPORT',
  IMAGE_ARCHIVE = 'IMAGE_ARCHIVE',
}

export const ALL_EXPORT_TYPE_CODES: readonly ExportTypeCode[] = [
  ExportTypeCode.SCORE_EXCEL,
  ExportTypeCode.SCORE_PDF,
  ExportTypeCode.ANALYSIS_REPORT,
  ExportTypeCode.IMAGE_ARCHIVE,
]

export const ExportTypeDescription: Record<ExportTypeCode, string> = {
  [ExportTypeCode.SCORE_EXCEL]: '成绩 Excel',
  [ExportTypeCode.SCORE_PDF]: '成绩 PDF',
  [ExportTypeCode.ANALYSIS_REPORT]: '分析报告',
  [ExportTypeCode.IMAGE_ARCHIVE]: '影像归档包',
}
