/** 归档整改状态 */
export enum ArchiveRemediationStatusCode {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESUBMITTED = 'RESUBMITTED',
  CLOSED = 'CLOSED',
}

export const ALL_ARCHIVE_REMEDIATION_STATUS_CODES: readonly ArchiveRemediationStatusCode[] = [
  ArchiveRemediationStatusCode.OPEN,
  ArchiveRemediationStatusCode.IN_PROGRESS,
  ArchiveRemediationStatusCode.RESUBMITTED,
  ArchiveRemediationStatusCode.CLOSED,
]
export const ArchiveRemediationStatusDescription: Record<ArchiveRemediationStatusCode, string> = {
  [ArchiveRemediationStatusCode.OPEN]: '待处理',
  [ArchiveRemediationStatusCode.IN_PROGRESS]: '处理中',
  [ArchiveRemediationStatusCode.RESUBMITTED]: '已重提',
  [ArchiveRemediationStatusCode.CLOSED]: '已关闭',
}


