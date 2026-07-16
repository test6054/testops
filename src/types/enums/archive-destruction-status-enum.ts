/** 归档销毁状态 */
export enum ArchiveDestructionStatusCode {
  NONE = 'NONE',
  REQUESTED = 'REQUESTED',
  REJECTED = 'REJECTED',
  APPROVED = 'APPROVED',
  EXECUTING = 'EXECUTING',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
  LEDGER_ARCHIVED = 'LEDGER_ARCHIVED',
}

export const ALL_ARCHIVE_DESTRUCTION_STATUS_CODES: readonly ArchiveDestructionStatusCode[] = [
  ArchiveDestructionStatusCode.NONE,
  ArchiveDestructionStatusCode.REQUESTED,
  ArchiveDestructionStatusCode.REJECTED,
  ArchiveDestructionStatusCode.APPROVED,
  ArchiveDestructionStatusCode.EXECUTING,
  ArchiveDestructionStatusCode.EXECUTED,
  ArchiveDestructionStatusCode.FAILED,
  ArchiveDestructionStatusCode.LEDGER_ARCHIVED,
]
export const ArchiveDestructionStatusDescription: Record<ArchiveDestructionStatusCode, string> = {
  [ArchiveDestructionStatusCode.NONE]: '无',
  [ArchiveDestructionStatusCode.REQUESTED]: '销毁申请中',
  [ArchiveDestructionStatusCode.REJECTED]: '销毁已驳回',
  [ArchiveDestructionStatusCode.APPROVED]: '销毁已批准',
  [ArchiveDestructionStatusCode.EXECUTING]: '销毁执行中',
  [ArchiveDestructionStatusCode.EXECUTED]: '已销毁',
  [ArchiveDestructionStatusCode.FAILED]: '销毁失败',
  [ArchiveDestructionStatusCode.LEDGER_ARCHIVED]: '清册已归档',
}

