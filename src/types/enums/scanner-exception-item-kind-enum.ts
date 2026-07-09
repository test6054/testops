/** 扫描异常看板条目类型 - ScannerExceptionItemKind */
export enum ScannerExceptionItemKindCode {
  TICKET = 'TICKET',
  WORK_ORDER = 'WORK_ORDER',
  COMMITTING = 'COMMITTING',
  MIXED_BATCH = 'MIXED_BATCH',
  PAGE_REGISTER_BLOCKED = 'PAGE_REGISTER_BLOCKED',
  PARTIAL_TAIL = 'PARTIAL_TAIL',
}

export const ALL_SCANNER_EXCEPTION_ITEM_KIND_CODES = [
  ScannerExceptionItemKindCode.TICKET,
  ScannerExceptionItemKindCode.WORK_ORDER,
  ScannerExceptionItemKindCode.COMMITTING,
  ScannerExceptionItemKindCode.MIXED_BATCH,
  ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED,
  ScannerExceptionItemKindCode.PARTIAL_TAIL,
] as const

export const ScannerExceptionItemKindDescription: Record<ScannerExceptionItemKindCode, string> = {
  [ScannerExceptionItemKindCode.TICKET]: '失败派单',
  [ScannerExceptionItemKindCode.WORK_ORDER]: '失败工单',
  [ScannerExceptionItemKindCode.COMMITTING]: '合成中工单',
  [ScannerExceptionItemKindCode.MIXED_BATCH]: '疑似混扫',
  [ScannerExceptionItemKindCode.PAGE_REGISTER_BLOCKED]: '页登记阻断',
  [ScannerExceptionItemKindCode.PARTIAL_TAIL]: '批次余页未完整切卷',
}
