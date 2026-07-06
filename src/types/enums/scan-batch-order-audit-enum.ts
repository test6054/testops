/** 扫描批次顺序审计异常码 */
export enum ScanBatchOrderAuditCode {
  PAGE_COUNT_MISMATCH = 'PAGE_COUNT_MISMATCH',
  SEQ_GAP = 'SEQ_GAP',
  TEMPLATE_MISMATCH = 'TEMPLATE_MISMATCH',
  SPLIT_BOUNDARY = 'SPLIT_BOUNDARY',
  LEGACY_BULK = 'LEGACY_BULK',
  DUPLEX_INCOMPLETE = 'DUPLEX_INCOMPLETE',
  INSTANCE_COUNT_MISMATCH = 'INSTANCE_COUNT_MISMATCH',
  DIRECT_PAGE_GROUP = 'DIRECT_PAGE_GROUP',
}

export const ALL_SCAN_BATCH_ORDER_AUDIT_CODES: readonly ScanBatchOrderAuditCode[] = [
  ScanBatchOrderAuditCode.PAGE_COUNT_MISMATCH,
  ScanBatchOrderAuditCode.SEQ_GAP,
  ScanBatchOrderAuditCode.TEMPLATE_MISMATCH,
  ScanBatchOrderAuditCode.SPLIT_BOUNDARY,
  ScanBatchOrderAuditCode.LEGACY_BULK,
  ScanBatchOrderAuditCode.DUPLEX_INCOMPLETE,
  ScanBatchOrderAuditCode.INSTANCE_COUNT_MISMATCH,
  ScanBatchOrderAuditCode.DIRECT_PAGE_GROUP,
]

export const ScanBatchOrderAuditDescription: Record<ScanBatchOrderAuditCode, string> = {
  [ScanBatchOrderAuditCode.PAGE_COUNT_MISMATCH]: '落库页数不一致',
  [ScanBatchOrderAuditCode.SEQ_GAP]: '进纸序号不连续',
  [ScanBatchOrderAuditCode.TEMPLATE_MISMATCH]: '模板页位错误',
  [ScanBatchOrderAuditCode.SPLIT_BOUNDARY]: '切卷边界错误',
  [ScanBatchOrderAuditCode.LEGACY_BULK]: '整批单卷误登记',
  [ScanBatchOrderAuditCode.DUPLEX_INCOMPLETE]: '双面配对不完整',
  [ScanBatchOrderAuditCode.INSTANCE_COUNT_MISMATCH]: '试卷实例数不一致',
  [ScanBatchOrderAuditCode.DIRECT_PAGE_GROUP]: '页数不能整卷分组',
}

