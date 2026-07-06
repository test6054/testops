/** 归档移交状态 */
export enum ArchiveTransferStatusCode {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const ALL_ARCHIVE_TRANSFER_STATUS_CODES: readonly ArchiveTransferStatusCode[] = [
  ArchiveTransferStatusCode.NOT_SUBMITTED,
  ArchiveTransferStatusCode.PENDING_REVIEW,
  ArchiveTransferStatusCode.APPROVED,
  ArchiveTransferStatusCode.REJECTED,
]
export const ArchiveTransferStatusDescription: Record<ArchiveTransferStatusCode, string> = {
  [ArchiveTransferStatusCode.NOT_SUBMITTED]: '未提交',
  [ArchiveTransferStatusCode.PENDING_REVIEW]: '待验收',
  [ArchiveTransferStatusCode.APPROVED]: '验收通过',
  [ArchiveTransferStatusCode.REJECTED]: '退回补正',
}


