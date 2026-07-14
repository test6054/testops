/** 上级报送范围 */
export enum PortfolioReportingScopeTypeCode {
  SCHOOL = 'SCHOOL',
  DEPARTMENT = 'DEPARTMENT',
}

export const ALL_PORTFOLIO_REPORTING_SCOPE_TYPE_CODES: readonly PortfolioReportingScopeTypeCode[] = [
  PortfolioReportingScopeTypeCode.SCHOOL,
  PortfolioReportingScopeTypeCode.DEPARTMENT,
]

export const PortfolioReportingScopeTypeDescription: Record<PortfolioReportingScopeTypeCode, string> = {
  [PortfolioReportingScopeTypeCode.SCHOOL]: '全校',
  [PortfolioReportingScopeTypeCode.DEPARTMENT]: '院系',
}
