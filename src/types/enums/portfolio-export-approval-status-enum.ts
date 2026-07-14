/** 导出审批状态 - PortfolioExportApprovalStatusEnum */
export enum PortfolioExportApprovalStatusCode {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DOWNLOADED = 'DOWNLOADED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export const ALL_PORTFOLIO_EXPORT_APPROVAL_STATUS_CODES: readonly PortfolioExportApprovalStatusCode[] = [
  PortfolioExportApprovalStatusCode.PENDING,
  PortfolioExportApprovalStatusCode.APPROVED,
  PortfolioExportApprovalStatusCode.REJECTED,
  PortfolioExportApprovalStatusCode.DOWNLOADED,
  PortfolioExportApprovalStatusCode.EXPIRED,
  PortfolioExportApprovalStatusCode.REVOKED,
]

export const PortfolioExportApprovalStatusDescription: Record<PortfolioExportApprovalStatusCode, string> = {
  [PortfolioExportApprovalStatusCode.PENDING]: '待审批',
  [PortfolioExportApprovalStatusCode.APPROVED]: '已批准',
  [PortfolioExportApprovalStatusCode.REJECTED]: '已驳回',
  [PortfolioExportApprovalStatusCode.DOWNLOADED]: '已下载',
  [PortfolioExportApprovalStatusCode.EXPIRED]: '已过期',
  [PortfolioExportApprovalStatusCode.REVOKED]: '已撤销',
}
