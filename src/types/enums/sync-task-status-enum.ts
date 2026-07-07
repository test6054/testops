/** 教务同步任务状态 */
export enum SyncTaskStatusCode {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SUCCESS = 'SUCCESS',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export const ALL_SYNC_TASK_STATUS_CODES: readonly SyncTaskStatusCode[] = [
  SyncTaskStatusCode.PENDING,
  SyncTaskStatusCode.SYNCING,
  SyncTaskStatusCode.SUCCESS,
  SyncTaskStatusCode.PARTIAL_SUCCESS,
  SyncTaskStatusCode.FAILED,
  SyncTaskStatusCode.CANCELLED,
]

export const SyncTaskStatusDescription: Record<SyncTaskStatusCode, string> = {
  [SyncTaskStatusCode.PENDING]: '待执行',
  [SyncTaskStatusCode.SYNCING]: '同步中',
  [SyncTaskStatusCode.SUCCESS]: '完成',
  [SyncTaskStatusCode.PARTIAL_SUCCESS]: '部分成功',
  [SyncTaskStatusCode.FAILED]: '失败',
  [SyncTaskStatusCode.CANCELLED]: '已取消',
}
