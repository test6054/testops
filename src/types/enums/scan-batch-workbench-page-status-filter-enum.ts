/** 扫描批次工作台页轨状态筛选，与后端 ScanBatchWorkbenchPageStatusFilter 逐值一致 */
export enum ScanBatchWorkbenchPageStatusFilterCode {
  ALL = 'ALL',
  PENDING = 'PENDING',
  REGISTERED = 'REGISTERED',
  EXCEPTION = 'EXCEPTION',
}

export const ALL_SCAN_BATCH_WORKBENCH_PAGE_STATUS_FILTER_CODES: readonly ScanBatchWorkbenchPageStatusFilterCode[] = [
  ScanBatchWorkbenchPageStatusFilterCode.ALL,
  ScanBatchWorkbenchPageStatusFilterCode.PENDING,
  ScanBatchWorkbenchPageStatusFilterCode.REGISTERED,
  ScanBatchWorkbenchPageStatusFilterCode.EXCEPTION,
]

export const ScanBatchWorkbenchPageStatusFilterDescription: Record<ScanBatchWorkbenchPageStatusFilterCode, string> = {
  [ScanBatchWorkbenchPageStatusFilterCode.ALL]: '全部',
  [ScanBatchWorkbenchPageStatusFilterCode.PENDING]: '待登记',
  [ScanBatchWorkbenchPageStatusFilterCode.REGISTERED]: '已登记',
  [ScanBatchWorkbenchPageStatusFilterCode.EXCEPTION]: '页级异常',
}

