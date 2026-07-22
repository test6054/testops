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
  [ArchiveDestructionStatusCode.REQUESTED]: '已申请',
  [ArchiveDestructionStatusCode.REJECTED]: '已驳回',
  [ArchiveDestructionStatusCode.APPROVED]: '已批准',
  [ArchiveDestructionStatusCode.EXECUTING]: '执行中',
  [ArchiveDestructionStatusCode.EXECUTED]: '已执行',
  [ArchiveDestructionStatusCode.FAILED]: '执行失败',
  [ArchiveDestructionStatusCode.LEDGER_ARCHIVED]: '清册已归档',
}

