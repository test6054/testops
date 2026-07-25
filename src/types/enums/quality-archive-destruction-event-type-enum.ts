/**
 * 质量材料归档销毁审计事件类型 - QualityArchiveDestructionEventTypeEnum
 */
export enum QualityArchiveDestructionEventTypeCode {
  DESTRUCTION_REQUESTED = 'DESTRUCTION_REQUESTED',
  DESTRUCTION_APPROVED = 'DESTRUCTION_APPROVED',
  DESTRUCTION_REJECTED = 'DESTRUCTION_REJECTED',
  DESTRUCTION_EXECUTION_STARTED = 'DESTRUCTION_EXECUTION_STARTED',
  DESTRUCTION_EXECUTED = 'DESTRUCTION_EXECUTED',
  DESTRUCTION_FAILED = 'DESTRUCTION_FAILED',
  DESTRUCTION_STORAGE_CLEANUP_FAILED = 'DESTRUCTION_STORAGE_CLEANUP_FAILED',
  DESTRUCTION_RETRY_REQUESTED = 'DESTRUCTION_RETRY_REQUESTED',
  DESTRUCTION_SUPERVISED = 'DESTRUCTION_SUPERVISED',
  DESTRUCTION_LEDGER_EXPORTED = 'DESTRUCTION_LEDGER_EXPORTED',
  DESTRUCTION_LEDGER_SKIPPED = 'DESTRUCTION_LEDGER_SKIPPED',
}

export const ALL_QUALITY_ARCHIVE_DESTRUCTION_EVENT_TYPE_CODES: readonly QualityArchiveDestructionEventTypeCode[] = [
  QualityArchiveDestructionEventTypeCode.DESTRUCTION_REQUESTED,
  QualityArchiveDestructionEventTypeCode.DESTRUCTION_APPROVED,
  QualityArchiveDestructionEventTypeCode.DESTRUCTION_REJECTED,
  QualityArchiveDestructionEventTypeCode.DESTRUCTION_EXECUTION_STARTED,
  QualityArchiveDestructionEventTypeCode.DESTRUCTION_EXECUTED,
  QualityArchiveDestructionEventTypeCode.DESTRUCTION_FAILED,
  QualityArchiveDestructionEventTypeCode.DESTRUCTION_STORAGE_CLEANUP_FAILED,
  QualityArchiveDestructionEventTypeCode.DESTRUCTION_RETRY_REQUESTED,
  QualityArchiveDestructionEventTypeCode.DESTRUCTION_SUPERVISED,
  QualityArchiveDestructionEventTypeCode.DESTRUCTION_LEDGER_EXPORTED,
  QualityArchiveDestructionEventTypeCode.DESTRUCTION_LEDGER_SKIPPED,
]

export const QualityArchiveDestructionEventTypeDescription: Record<
  QualityArchiveDestructionEventTypeCode,
  string
> = {
  [QualityArchiveDestructionEventTypeCode.DESTRUCTION_REQUESTED]: '销毁申请',
  [QualityArchiveDestructionEventTypeCode.DESTRUCTION_APPROVED]: '销毁审批通过',
  [QualityArchiveDestructionEventTypeCode.DESTRUCTION_REJECTED]: '销毁审批驳回',
  [QualityArchiveDestructionEventTypeCode.DESTRUCTION_EXECUTION_STARTED]: '销毁执行启动',
  [QualityArchiveDestructionEventTypeCode.DESTRUCTION_EXECUTED]: '销毁执行完成',
  [QualityArchiveDestructionEventTypeCode.DESTRUCTION_FAILED]: '销毁执行失败',
  [QualityArchiveDestructionEventTypeCode.DESTRUCTION_STORAGE_CLEANUP_FAILED]: '存储清理失败',
  [QualityArchiveDestructionEventTypeCode.DESTRUCTION_RETRY_REQUESTED]: '销毁重新执行',
  [QualityArchiveDestructionEventTypeCode.DESTRUCTION_SUPERVISED]: '销毁监销确认',
  [QualityArchiveDestructionEventTypeCode.DESTRUCTION_LEDGER_EXPORTED]: '销毁清册已导出',
  [QualityArchiveDestructionEventTypeCode.DESTRUCTION_LEDGER_SKIPPED]: '销毁清册已跳过',
}
