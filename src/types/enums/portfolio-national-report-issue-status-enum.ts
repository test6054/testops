/** 全国教师系统上报待修正状态 */
export enum PortfolioNationalReportIssueStatusCode {
  OPEN = 'OPEN',
  FIXED = 'FIXED',
}

export const ALL_PORTFOLIO_NATIONAL_REPORT_ISSUE_STATUS_CODES: readonly PortfolioNationalReportIssueStatusCode[]
  = [PortfolioNationalReportIssueStatusCode.OPEN, PortfolioNationalReportIssueStatusCode.FIXED]

export const PortfolioNationalReportIssueStatusDescription: Record<
  PortfolioNationalReportIssueStatusCode,
  string
> = {
  [PortfolioNationalReportIssueStatusCode.OPEN]: '待修正',
  [PortfolioNationalReportIssueStatusCode.FIXED]: '已修正',
}
