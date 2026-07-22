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
  PARTIAL_TAIL = 'PARTIAL_TAIL',
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
  ScanBatchOrderAuditCode.PARTIAL_TAIL,
]

export const ScanBatchOrderAuditDescription: Record<ScanBatchOrderAuditCode, string> = {
  [ScanBatchOrderAuditCode.PAGE_COUNT_MISMATCH]: '落库页数与批次声明不一致',
  [ScanBatchOrderAuditCode.SEQ_GAP]: '批次内物理进纸序号不连续',
  [ScanBatchOrderAuditCode.TEMPLATE_MISMATCH]: '模板页位与固定页数映射不一致',
  [ScanBatchOrderAuditCode.SPLIT_BOUNDARY]: '切卷边界试卷实例分组错误',
  [ScanBatchOrderAuditCode.LEGACY_BULK]: '整批误挂同一试卷实例',
  [ScanBatchOrderAuditCode.DUPLEX_INCOMPLETE]: '双面批次试卷正反面不完整',
  [ScanBatchOrderAuditCode.INSTANCE_COUNT_MISMATCH]: '试卷实例数量与页数分组不一致',
  [ScanBatchOrderAuditCode.DIRECT_PAGE_GROUP]: '首次扫描页数不能按模板整卷分组',
  [ScanBatchOrderAuditCode.PARTIAL_TAIL]: '切卷后存在余页待人工处理',
}

