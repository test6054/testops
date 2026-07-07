/** 归档扫描批次模式 */
export enum ArchiveScanBatchModeCode {
  MERGED = 'MERGED',
  PER_PAGE = 'PER_PAGE',
}

export const ALL_ARCHIVE_SCAN_BATCH_MODE_CODES: readonly ArchiveScanBatchModeCode[] = [
  ArchiveScanBatchModeCode.MERGED,
  ArchiveScanBatchModeCode.PER_PAGE,
]

export const ArchiveScanBatchModeDescription: Record<ArchiveScanBatchModeCode, string> = {
  [ArchiveScanBatchModeCode.MERGED]: '合并 PDF',
  [ArchiveScanBatchModeCode.PER_PAGE]: '逐页登记',
}
