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
  [QualityArchiveDestructionStatusCode.NONE]: '正常保管',
  [QualityArchiveDestructionStatusCode.REQUESTED]: '销毁申请中',
  [QualityArchiveDestructionStatusCode.APPROVED]: '销毁已批准',
  [QualityArchiveDestructionStatusCode.EXECUTING]: '销毁执行中',
  [QualityArchiveDestructionStatusCode.EXECUTED]: '已销毁',
  [QualityArchiveDestructionStatusCode.FAILED]: '销毁失败',
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
