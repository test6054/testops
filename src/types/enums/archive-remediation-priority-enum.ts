/** 归档整改优先级 */
export enum ArchiveRemediationPriorityCode {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export const ALL_ARCHIVE_REMEDIATION_PRIORITY_CODES: readonly ArchiveRemediationPriorityCode[] = [
  ArchiveRemediationPriorityCode.HIGH,
  ArchiveRemediationPriorityCode.MEDIUM,
  ArchiveRemediationPriorityCode.LOW,
]

export const ArchiveRemediationPriorityDescription: Record<ArchiveRemediationPriorityCode, string> = {
  [ArchiveRemediationPriorityCode.HIGH]: '高',
  [ArchiveRemediationPriorityCode.MEDIUM]: '中',
  [ArchiveRemediationPriorityCode.LOW]: '低',
}

