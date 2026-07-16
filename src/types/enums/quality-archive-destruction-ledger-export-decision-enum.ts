/** 质量归档销毁申请前清册导出决议 - QualityArchiveDestructionLedgerExportDecisionEnum */
export enum QualityArchiveDestructionLedgerExportDecisionCode {
  EXPORT_FIRST = 'EXPORT_FIRST',
  SKIP_CONFIRMED = 'SKIP_CONFIRMED',
}

export const ALL_QUALITY_ARCHIVE_DESTRUCTION_LEDGER_EXPORT_DECISION_CODES = [
  QualityArchiveDestructionLedgerExportDecisionCode.EXPORT_FIRST,
  QualityArchiveDestructionLedgerExportDecisionCode.SKIP_CONFIRMED,
] as const

export const QualityArchiveDestructionLedgerExportDecisionDescription: Record<
  QualityArchiveDestructionLedgerExportDecisionCode,
  string
> = {
  [QualityArchiveDestructionLedgerExportDecisionCode.EXPORT_FIRST]: '先导出清册',
  [QualityArchiveDestructionLedgerExportDecisionCode.SKIP_CONFIRMED]: '确认跳过导出',
}
