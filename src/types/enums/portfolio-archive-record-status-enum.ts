/** 档案记录状态 - PortfolioArchiveRecordStatusEnum */
export enum PortfolioArchiveRecordStatusCode {
  DRAFT = 'DRAFT',
  PENDING_CONFIRM = 'PENDING_CONFIRM',
  PENDING_REVIEW = 'PENDING_REVIEW',
  OFFICIAL = 'OFFICIAL',
  SUPERSEDED = 'SUPERSEDED',
  RETURNED = 'RETURNED',
  VOID = 'VOID',
}

export const ALL_PORTFOLIO_ARCHIVE_RECORD_STATUS_CODES: readonly PortfolioArchiveRecordStatusCode[] = [
  PortfolioArchiveRecordStatusCode.DRAFT,
  PortfolioArchiveRecordStatusCode.PENDING_CONFIRM,
  PortfolioArchiveRecordStatusCode.PENDING_REVIEW,
  PortfolioArchiveRecordStatusCode.OFFICIAL,
  PortfolioArchiveRecordStatusCode.SUPERSEDED,
  PortfolioArchiveRecordStatusCode.RETURNED,
  PortfolioArchiveRecordStatusCode.VOID,
]

export const PortfolioArchiveRecordStatusDescription: Record<PortfolioArchiveRecordStatusCode, string> = {
  [PortfolioArchiveRecordStatusCode.DRAFT]: '草稿',
  [PortfolioArchiveRecordStatusCode.PENDING_CONFIRM]: '待确认',
  [PortfolioArchiveRecordStatusCode.PENDING_REVIEW]: '待审核',
  [PortfolioArchiveRecordStatusCode.OFFICIAL]: '正式',
  [PortfolioArchiveRecordStatusCode.SUPERSEDED]: '已被替代',
  [PortfolioArchiveRecordStatusCode.RETURNED]: '退回',
  [PortfolioArchiveRecordStatusCode.VOID]: '作废',
}

