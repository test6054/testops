/** 导出类型 - PortfolioExportTypeEnum */
export enum PortfolioExportTypeCode {
  MAJOR_GROUP_PORTFOLIO = 'MAJOR_GROUP_PORTFOLIO',
  DEPARTMENT_REPORT = 'DEPARTMENT_REPORT',
  TEACHER_ARCHIVE = 'TEACHER_ARCHIVE',
  ANALYSIS_REPORT = 'ANALYSIS_REPORT',
  MAJOR_GROUP_MATERIAL_PACKAGE = 'MAJOR_GROUP_MATERIAL_PACKAGE',
  DOUBLE_HIGH_ACCEPTANCE_PACKAGE = 'DOUBLE_HIGH_ACCEPTANCE_PACKAGE',
  MATERIAL_PACKAGE = 'MATERIAL_PACKAGE',
  NATIONAL_TEACHER_REPORT = 'NATIONAL_TEACHER_REPORT',
  NATIONAL_TEACHER_REPORT_RETRANSMIT = 'NATIONAL_TEACHER_REPORT_RETRANSMIT',
  SUPERIOR_REPORTING = 'SUPERIOR_REPORTING',
  TEACHER_PK_COMPARE = 'TEACHER_PK_COMPARE',
  TEACHER_TRANSFER_PACKAGE = 'TEACHER_TRANSFER_PACKAGE',
  TEACHER_TRANSFER_IMPORT = 'TEACHER_TRANSFER_IMPORT',
}

/** 可走导出审批申请的类型子集 */
export const ALL_PORTFOLIO_EXPORT_APPROVAL_TYPE_CODES: readonly PortfolioExportTypeCode[] = [
  PortfolioExportTypeCode.MAJOR_GROUP_PORTFOLIO,
  PortfolioExportTypeCode.DEPARTMENT_REPORT,
  PortfolioExportTypeCode.TEACHER_ARCHIVE,
  PortfolioExportTypeCode.ANALYSIS_REPORT,
  PortfolioExportTypeCode.TEACHER_PK_COMPARE,
]

export const ALL_PORTFOLIO_EXPORT_TYPE_CODES: readonly PortfolioExportTypeCode[] = [
  PortfolioExportTypeCode.MAJOR_GROUP_PORTFOLIO,
  PortfolioExportTypeCode.DEPARTMENT_REPORT,
  PortfolioExportTypeCode.TEACHER_ARCHIVE,
  PortfolioExportTypeCode.ANALYSIS_REPORT,
  PortfolioExportTypeCode.MAJOR_GROUP_MATERIAL_PACKAGE,
  PortfolioExportTypeCode.DOUBLE_HIGH_ACCEPTANCE_PACKAGE,
  PortfolioExportTypeCode.MATERIAL_PACKAGE,
  PortfolioExportTypeCode.NATIONAL_TEACHER_REPORT,
  PortfolioExportTypeCode.NATIONAL_TEACHER_REPORT_RETRANSMIT,
  PortfolioExportTypeCode.SUPERIOR_REPORTING,
  PortfolioExportTypeCode.TEACHER_PK_COMPARE,
  PortfolioExportTypeCode.TEACHER_TRANSFER_PACKAGE,
  PortfolioExportTypeCode.TEACHER_TRANSFER_IMPORT,
]

export const PortfolioExportTypeDescription: Record<PortfolioExportTypeCode, string> = {
  [PortfolioExportTypeCode.MAJOR_GROUP_PORTFOLIO]: '专业群档案袋',
  [PortfolioExportTypeCode.DEPARTMENT_REPORT]: '院系报告',
  [PortfolioExportTypeCode.TEACHER_ARCHIVE]: '教师档案包',
  [PortfolioExportTypeCode.ANALYSIS_REPORT]: '分析报告',
  [PortfolioExportTypeCode.MAJOR_GROUP_MATERIAL_PACKAGE]: '专业群教学档案袋材料包',
  [PortfolioExportTypeCode.DOUBLE_HIGH_ACCEPTANCE_PACKAGE]: '双高建设任务验收材料包',
  [PortfolioExportTypeCode.MATERIAL_PACKAGE]: '档案材料包',
  [PortfolioExportTypeCode.NATIONAL_TEACHER_REPORT]: '国家级教师报表',
  [PortfolioExportTypeCode.NATIONAL_TEACHER_REPORT_RETRANSMIT]: '国家级教师报表重传',
  [PortfolioExportTypeCode.SUPERIOR_REPORTING]: '上级报送',
  [PortfolioExportTypeCode.TEACHER_PK_COMPARE]: '教师 PK 对比',
  [PortfolioExportTypeCode.TEACHER_TRANSFER_PACKAGE]: '教师迁出数据包',
  [PortfolioExportTypeCode.TEACHER_TRANSFER_IMPORT]: '教师迁出数据导入',
}
