/** 扫描批次工作台顶栏可执行动作，与后端 ScanBatchWorkbenchTopAction 逐值一致 */
export enum ScanBatchWorkbenchTopActionCode {
  RETRY_PAGE_REGISTER = 'RETRY_PAGE_REGISTER',
  RETRY_PROCESSED_IMAGES = 'RETRY_PROCESSED_IMAGES',
  REBUILD_COMPOSITE_PAGES = 'REBUILD_COMPOSITE_PAGES',
  OPEN_PREP = 'OPEN_PREP',
  SEAL = 'SEAL',
  DISCARD = 'DISCARD',
  SUPPLEMENT = 'SUPPLEMENT',
}

export const ALL_SCAN_BATCH_WORKBENCH_TOP_ACTION_CODES: readonly ScanBatchWorkbenchTopActionCode[] = [
  ScanBatchWorkbenchTopActionCode.RETRY_PAGE_REGISTER,
  ScanBatchWorkbenchTopActionCode.RETRY_PROCESSED_IMAGES,
  ScanBatchWorkbenchTopActionCode.REBUILD_COMPOSITE_PAGES,
  ScanBatchWorkbenchTopActionCode.OPEN_PREP,
  ScanBatchWorkbenchTopActionCode.SEAL,
  ScanBatchWorkbenchTopActionCode.DISCARD,
  ScanBatchWorkbenchTopActionCode.SUPPLEMENT,
]

export const ScanBatchWorkbenchTopActionDescription: Record<ScanBatchWorkbenchTopActionCode, string> = {
  [ScanBatchWorkbenchTopActionCode.RETRY_PAGE_REGISTER]: '重试页登记',
  [ScanBatchWorkbenchTopActionCode.RETRY_PROCESSED_IMAGES]: '补跑脱敏',
  [ScanBatchWorkbenchTopActionCode.REBUILD_COMPOSITE_PAGES]: '物理页重建',
  [ScanBatchWorkbenchTopActionCode.OPEN_PREP]: '去制卷',
  [ScanBatchWorkbenchTopActionCode.SEAL]: '封存',
  [ScanBatchWorkbenchTopActionCode.DISCARD]: '废弃',
  [ScanBatchWorkbenchTopActionCode.SUPPLEMENT]: '补扫',
}
