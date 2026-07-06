/** 归档导入批次状态 */
export enum ArchiveImportBatchStatusCode {
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  PARTIAL_FAILED = 'PARTIAL_FAILED',
  FAILED = 'FAILED',
}

export const ALL_ARCHIVE_IMPORT_BATCH_STATUS_CODES: readonly ArchiveImportBatchStatusCode[] = [
  ArchiveImportBatchStatusCode.PROCESSING,
  ArchiveImportBatchStatusCode.SUCCESS,
  ArchiveImportBatchStatusCode.PARTIAL_FAILED,
  ArchiveImportBatchStatusCode.FAILED,
]
export const ArchiveImportBatchStatusDescription: Record<ArchiveImportBatchStatusCode, string> = {
  [ArchiveImportBatchStatusCode.PROCESSING]: '处理中',
  [ArchiveImportBatchStatusCode.SUCCESS]: '成功',
  [ArchiveImportBatchStatusCode.PARTIAL_FAILED]: '部分失败',
  [ArchiveImportBatchStatusCode.FAILED]: '失败',
}
