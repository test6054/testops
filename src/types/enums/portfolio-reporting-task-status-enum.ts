/** 上级报送任务状态 */
export enum PortfolioReportingTaskStatusCode {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SUBMITTED = 'SUBMITTED',
  REJECTED = 'REJECTED',
}

export const ALL_PORTFOLIO_REPORTING_TASK_STATUS_CODES: readonly PortfolioReportingTaskStatusCode[] = [
  PortfolioReportingTaskStatusCode.DRAFT,
  PortfolioReportingTaskStatusCode.PENDING_APPROVAL,
  PortfolioReportingTaskStatusCode.APPROVED,
  PortfolioReportingTaskStatusCode.SUBMITTED,
  PortfolioReportingTaskStatusCode.REJECTED,
]

export const PortfolioReportingTaskStatusDescription: Record<PortfolioReportingTaskStatusCode, string> = {
  [PortfolioReportingTaskStatusCode.DRAFT]: '草稿',
  [PortfolioReportingTaskStatusCode.PENDING_APPROVAL]: '待审批',
  [PortfolioReportingTaskStatusCode.APPROVED]: '已审批',
  [PortfolioReportingTaskStatusCode.SUBMITTED]: '已报送',
  [PortfolioReportingTaskStatusCode.REJECTED]: '已驳回',
}
