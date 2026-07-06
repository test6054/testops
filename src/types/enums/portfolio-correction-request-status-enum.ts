/** 纠错工单状态 - PortfolioCorrectionRequestStatusEnum */
export enum PortfolioCorrectionRequestStatusCode {
  SUBMITTED = 'SUBMITTED',
  ACCEPTING = 'ACCEPTING',
  ARCHIVE_CORRECTING = 'ARCHIVE_CORRECTING',
  SOURCE_FIXING = 'SOURCE_FIXING',
  PENDING_VERIFY = 'PENDING_VERIFY',
  CLOSED = 'CLOSED',
  REJECTED = 'REJECTED',
}

export const ALL_PORTFOLIO_CORRECTION_REQUEST_STATUS_CODES: readonly PortfolioCorrectionRequestStatusCode[] = [
  PortfolioCorrectionRequestStatusCode.SUBMITTED,
  PortfolioCorrectionRequestStatusCode.ACCEPTING,
  PortfolioCorrectionRequestStatusCode.ARCHIVE_CORRECTING,
  PortfolioCorrectionRequestStatusCode.SOURCE_FIXING,
  PortfolioCorrectionRequestStatusCode.PENDING_VERIFY,
  PortfolioCorrectionRequestStatusCode.CLOSED,
  PortfolioCorrectionRequestStatusCode.REJECTED,
]

export const PortfolioCorrectionRequestStatusDescription: Record<PortfolioCorrectionRequestStatusCode, string> = {
  [PortfolioCorrectionRequestStatusCode.SUBMITTED]: '已提交',
  [PortfolioCorrectionRequestStatusCode.ACCEPTING]: '受理中',
  [PortfolioCorrectionRequestStatusCode.ARCHIVE_CORRECTING]: '档案更正',
  [PortfolioCorrectionRequestStatusCode.SOURCE_FIXING]: '源系统整改',
  [PortfolioCorrectionRequestStatusCode.PENDING_VERIFY]: '待验证',
  [PortfolioCorrectionRequestStatusCode.CLOSED]: '已关闭',
  [PortfolioCorrectionRequestStatusCode.REJECTED]: '驳回',
}
