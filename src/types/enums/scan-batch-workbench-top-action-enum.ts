/** 扫描批次工作台顶栏可执行动作，与后端 ScanBatchWorkbenchTopAction 逐值一致 */
export enum ScanBatchWorkbenchTopActionCode {
  RETRY_PAGE_REGISTER = 'RETRY_PAGE_REGISTER',
  OPEN_PREP = 'OPEN_PREP',
  SEAL = 'SEAL',
  DISCARD = 'DISCARD',
  SUPPLEMENT = 'SUPPLEMENT',
}

export const ALL_SCAN_BATCH_WORKBENCH_TOP_ACTION_CODES: readonly ScanBatchWorkbenchTopActionCode[] = [
  ScanBatchWorkbenchTopActionCode.RETRY_PAGE_REGISTER,
  ScanBatchWorkbenchTopActionCode.OPEN_PREP,
  ScanBatchWorkbenchTopActionCode.SEAL,
  ScanBatchWorkbenchTopActionCode.DISCARD,
  ScanBatchWorkbenchTopActionCode.SUPPLEMENT,
]

export const ScanBatchWorkbenchTopActionDescription: Record<ScanBatchWorkbenchTopActionCode, string> = {
  [ScanBatchWorkbenchTopActionCode.RETRY_PAGE_REGISTER]: '重试页登记',
  [ScanBatchWorkbenchTopActionCode.OPEN_PREP]: '去制卷',
  [ScanBatchWorkbenchTopActionCode.SEAL]: '封存',
  [ScanBatchWorkbenchTopActionCode.DISCARD]: '废弃',
  [ScanBatchWorkbenchTopActionCode.SUPPLEMENT]: '补扫',
}

