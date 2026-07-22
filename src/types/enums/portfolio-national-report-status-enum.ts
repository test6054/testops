/** 全国教师系统上报批次结果状态 */
export enum PortfolioNationalReportStatusCode {
  SUCCESS = 'SUCCESS',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  FAILED = 'FAILED',
}

export const ALL_PORTFOLIO_NATIONAL_REPORT_STATUS_CODES: readonly PortfolioNationalReportStatusCode[] = [
  PortfolioNationalReportStatusCode.SUCCESS,
  PortfolioNationalReportStatusCode.PARTIAL_SUCCESS,
  PortfolioNationalReportStatusCode.FAILED,
]

export const PortfolioNationalReportStatusDescription: Record<PortfolioNationalReportStatusCode, string> = {
  [PortfolioNationalReportStatusCode.SUCCESS]: '全部成功',
  [PortfolioNationalReportStatusCode.PARTIAL_SUCCESS]: '部分成功',
  [PortfolioNationalReportStatusCode.FAILED]: '全部失败',
}
