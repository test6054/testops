/** 扫描批次工作台页轨绑定状态，与后端 ScanBatchWorkbenchBindingStatus 逐值一致 */
export enum ScanBatchWorkbenchBindingStatusCode {
  UNBOUND = 'UNBOUND',
  CONFLICT = 'CONFLICT',
  BOUND = 'BOUND',
}

export const ALL_SCAN_BATCH_WORKBENCH_BINDING_STATUS_CODES: readonly ScanBatchWorkbenchBindingStatusCode[] = [
  ScanBatchWorkbenchBindingStatusCode.UNBOUND,
  ScanBatchWorkbenchBindingStatusCode.CONFLICT,
  ScanBatchWorkbenchBindingStatusCode.BOUND,
]

export const ScanBatchWorkbenchBindingStatusDescription: Record<ScanBatchWorkbenchBindingStatusCode, string> = {
  [ScanBatchWorkbenchBindingStatusCode.UNBOUND]: '待绑定',
  [ScanBatchWorkbenchBindingStatusCode.CONFLICT]: '绑定冲突',
  [ScanBatchWorkbenchBindingStatusCode.BOUND]: '已绑定',
}

