/** 本地 Scanner Agent 扫描页状态 */
export enum LocalScanPageStatusCode {
  CAPTURED = 'CAPTURED',
  PREPROCESSED = 'PREPROCESSED',
  UPLOADING = 'UPLOADING',
  UPLOADED = 'UPLOADED',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

export const ALL_LOCAL_SCAN_PAGE_STATUS_CODES: readonly LocalScanPageStatusCode[] = [
  LocalScanPageStatusCode.CAPTURED,
  LocalScanPageStatusCode.PREPROCESSED,
  LocalScanPageStatusCode.UPLOADING,
  LocalScanPageStatusCode.UPLOADED,
  LocalScanPageStatusCode.FAILED,
  LocalScanPageStatusCode.DELETED,
]

export const LocalScanPageStatusDescription: Record<LocalScanPageStatusCode, string> = {
  [LocalScanPageStatusCode.CAPTURED]: '已采集',
  [LocalScanPageStatusCode.PREPROCESSED]: '已预处理',
  [LocalScanPageStatusCode.UPLOADING]: '上传中',
  [LocalScanPageStatusCode.UPLOADED]: '已上传',
  [LocalScanPageStatusCode.FAILED]: '失败',
  [LocalScanPageStatusCode.DELETED]: '已删除',
}

/** 一体机 ledger 合成展示态（非 Agent 协议字段） */
export enum KioskSyntheticScanPageStatusCode {
  SCANNED = 'SCANNED',
}

export const KioskSyntheticScanPageStatusDescription: Record<KioskSyntheticScanPageStatusCode, string> = {
  [KioskSyntheticScanPageStatusCode.SCANNED]: '已扫描',
}
