/** 导出范围 - PortfolioMaskExportScopeEnum */
export enum PortfolioMaskExportScopeCode {
  TEACHER_SELF = 'TEACHER_SELF',
  DEPARTMENT = 'DEPARTMENT',
  SCHOOL = 'SCHOOL',
  EXTERNAL_EXPERT = 'EXTERNAL_EXPERT',
}

export const ALL_PORTFOLIO_MASK_EXPORT_SCOPE_CODES: readonly PortfolioMaskExportScopeCode[] = [
  PortfolioMaskExportScopeCode.TEACHER_SELF,
  PortfolioMaskExportScopeCode.DEPARTMENT,
  PortfolioMaskExportScopeCode.SCHOOL,
  PortfolioMaskExportScopeCode.EXTERNAL_EXPERT,
]

export const PortfolioMaskExportScopeDescription: Record<PortfolioMaskExportScopeCode, string> = {
  [PortfolioMaskExportScopeCode.TEACHER_SELF]: '教师本人',
  [PortfolioMaskExportScopeCode.DEPARTMENT]: '院系导出',
  [PortfolioMaskExportScopeCode.SCHOOL]: '学校导出',
  [PortfolioMaskExportScopeCode.EXTERNAL_EXPERT]: '外部专家',
}
