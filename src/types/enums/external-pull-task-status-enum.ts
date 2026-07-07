/** 外部拔取任务状态 - ExternalPullTaskStatusEnum */
export enum ExternalPullTaskStatusCode {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export const ALL_EXTERNAL_PULL_TASK_STATUS_CODES: readonly ExternalPullTaskStatusCode[] = [
  ExternalPullTaskStatusCode.PENDING,
  ExternalPullTaskStatusCode.RUNNING,
  ExternalPullTaskStatusCode.SUCCEEDED,
  ExternalPullTaskStatusCode.FAILED,
  ExternalPullTaskStatusCode.CANCELLED,
]

export const ExternalPullTaskStatusDescription: Record<ExternalPullTaskStatusCode, string> = {
  [ExternalPullTaskStatusCode.PENDING]: '待处理',
  [ExternalPullTaskStatusCode.RUNNING]: '执行中',
  [ExternalPullTaskStatusCode.SUCCEEDED]: '成功',
  [ExternalPullTaskStatusCode.FAILED]: '失败',
  [ExternalPullTaskStatusCode.CANCELLED]: '已取消',
}
