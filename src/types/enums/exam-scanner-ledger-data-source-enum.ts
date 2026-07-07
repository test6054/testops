/** 考试扫描 ledger 数据来源 */
export enum ExamScannerLedgerDataSourceCode {
  DATABASE = 'DATABASE',
  REDIS_PENDING = 'REDIS_PENDING',
  NONE = 'NONE',
}

export const ALL_EXAM_SCANNER_LEDGER_DATA_SOURCE_CODES: readonly ExamScannerLedgerDataSourceCode[] = [
  ExamScannerLedgerDataSourceCode.DATABASE,
  ExamScannerLedgerDataSourceCode.REDIS_PENDING,
  ExamScannerLedgerDataSourceCode.NONE,
]

export const ExamScannerLedgerDataSourceDescription: Record<ExamScannerLedgerDataSourceCode, string> = {
  [ExamScannerLedgerDataSourceCode.DATABASE]: '已落库',
  [ExamScannerLedgerDataSourceCode.REDIS_PENDING]: '等待提交',
  [ExamScannerLedgerDataSourceCode.NONE]: '空批次',
}

