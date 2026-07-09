/** 扫描批次工作台页轨登记状态，与后端 ScanBatchWorkbenchRegisterStatus 逐值一致 */
export enum ScanBatchWorkbenchRegisterStatusCode {
  PENDING = 'PENDING',
  REGISTERED = 'REGISTERED',
  SUPERSEDED = 'SUPERSEDED',
}

export const ALL_SCAN_BATCH_WORKBENCH_REGISTER_STATUS_CODES: readonly ScanBatchWorkbenchRegisterStatusCode[] = [
  ScanBatchWorkbenchRegisterStatusCode.PENDING,
  ScanBatchWorkbenchRegisterStatusCode.REGISTERED,
  ScanBatchWorkbenchRegisterStatusCode.SUPERSEDED,
]

export const ScanBatchWorkbenchRegisterStatusDescription: Record<ScanBatchWorkbenchRegisterStatusCode, string> = {
  [ScanBatchWorkbenchRegisterStatusCode.PENDING]: '待登记',
  [ScanBatchWorkbenchRegisterStatusCode.REGISTERED]: '已登记',
  [ScanBatchWorkbenchRegisterStatusCode.SUPERSEDED]: '已替换',
}

