/** 质量材料归档销毁状态 - QualityArchiveDestructionStatusEnum */
export enum QualityArchiveDestructionStatusCode {
  NONE = 'NONE',
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  EXECUTING = 'EXECUTING',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
  SUPERVISED = 'SUPERVISED',
}

export const ALL_QUALITY_ARCHIVE_DESTRUCTION_STATUS_CODES = [
  QualityArchiveDestructionStatusCode.NONE,
  QualityArchiveDestructionStatusCode.REQUESTED,
  QualityArchiveDestructionStatusCode.APPROVED,
  QualityArchiveDestructionStatusCode.EXECUTING,
  QualityArchiveDestructionStatusCode.EXECUTED,
  QualityArchiveDestructionStatusCode.FAILED,
  QualityArchiveDestructionStatusCode.SUPERVISED,
] as const

export const QualityArchiveDestructionStatusDescription: Record<
  QualityArchiveDestructionStatusCode,
  string
> = {
  [QualityArchiveDestructionStatusCode.NONE]: '无',
  [QualityArchiveDestructionStatusCode.REQUESTED]: '已申请',
  [QualityArchiveDestructionStatusCode.APPROVED]: '已批准',
  [QualityArchiveDestructionStatusCode.EXECUTING]: '执行中',
  [QualityArchiveDestructionStatusCode.EXECUTED]: '已执行',
  [QualityArchiveDestructionStatusCode.FAILED]: '执行失败',
  [QualityArchiveDestructionStatusCode.SUPERVISED]: '已监销',
}

export const QUALITY_ARCHIVE_DESTRUCTION_STATUS_TONE: Record<
  QualityArchiveDestructionStatusCode,
  'gray' | 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'yellow'
> = {
  [QualityArchiveDestructionStatusCode.NONE]: 'gray',
  [QualityArchiveDestructionStatusCode.REQUESTED]: 'orange',
  [QualityArchiveDestructionStatusCode.APPROVED]: 'blue',
  [QualityArchiveDestructionStatusCode.EXECUTING]: 'yellow',
  [QualityArchiveDestructionStatusCode.EXECUTED]: 'purple',
  [QualityArchiveDestructionStatusCode.FAILED]: 'red',
  [QualityArchiveDestructionStatusCode.SUPERVISED]: 'green',
}
