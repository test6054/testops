/** 派单队列页状态筛选（含 UI 合成项 ALL / FAILED） */
export enum DispatchQueueStatusFilterCode {
  ALL = 'ALL',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUSPENDED = 'SUSPENDED',
  FAILED = 'FAILED',
}

export const ALL_DISPATCH_QUEUE_STATUS_FILTER_CODES: readonly DispatchQueueStatusFilterCode[] = [
  DispatchQueueStatusFilterCode.ALL,
  DispatchQueueStatusFilterCode.PENDING,
  DispatchQueueStatusFilterCode.PROCESSING,
  DispatchQueueStatusFilterCode.SUSPENDED,
  DispatchQueueStatusFilterCode.FAILED,
]

export const DispatchQueueStatusFilterDescription: Record<DispatchQueueStatusFilterCode, string> = {
  [DispatchQueueStatusFilterCode.ALL]: '全部',
  [DispatchQueueStatusFilterCode.PENDING]: '待处理',
  [DispatchQueueStatusFilterCode.PROCESSING]: '处理中',
  [DispatchQueueStatusFilterCode.SUSPENDED]: '已挂起',
  [DispatchQueueStatusFilterCode.FAILED]: '失败',
}
