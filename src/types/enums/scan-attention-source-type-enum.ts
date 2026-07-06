/** 扫描异常来源类型 */
export enum ScanAttentionSourceTypeCode {
  SCANNED_PAGE = 'SCANNED_PAGE',
  PROCESSING_TASK = 'PROCESSING_TASK',
  DUPLICATE_RESOLUTION = 'DUPLICATE_RESOLUTION',
  GRADE_RESULT = 'GRADE_RESULT',
  PAPER_INSTANCE = 'PAPER_INSTANCE',
  IMAGE_LEDGER = 'IMAGE_LEDGER',
}

export const ALL_SCAN_ATTENTION_SOURCE_TYPE_CODES: readonly ScanAttentionSourceTypeCode[] = [
  ScanAttentionSourceTypeCode.SCANNED_PAGE,
  ScanAttentionSourceTypeCode.PROCESSING_TASK,
  ScanAttentionSourceTypeCode.DUPLICATE_RESOLUTION,
  ScanAttentionSourceTypeCode.GRADE_RESULT,
  ScanAttentionSourceTypeCode.PAPER_INSTANCE,
  ScanAttentionSourceTypeCode.IMAGE_LEDGER,
]

export const ScanAttentionSourceTypeDescription: Record<ScanAttentionSourceTypeCode, string> = {
  [ScanAttentionSourceTypeCode.SCANNED_PAGE]: '扫描页',
  [ScanAttentionSourceTypeCode.PROCESSING_TASK]: '处理任务',
  [ScanAttentionSourceTypeCode.DUPLICATE_RESOLUTION]: '重复扫描处置',
  [ScanAttentionSourceTypeCode.GRADE_RESULT]: '阅卷结果',
  [ScanAttentionSourceTypeCode.PAPER_INSTANCE]: '试卷实例',
  [ScanAttentionSourceTypeCode.IMAGE_LEDGER]: '影像账本',
}
