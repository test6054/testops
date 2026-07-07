/** 批改处理任务状态 */
export enum TaskStatusCode {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
  FAILED = 'FAILED',
}

export const ALL_TASK_STATUS_CODES: readonly TaskStatusCode[] = [
  TaskStatusCode.PENDING,
  TaskStatusCode.PROCESSING,
  TaskStatusCode.COMPLETED,
  TaskStatusCode.BLOCKED,
  TaskStatusCode.FAILED,
]

export const TaskStatusDescription: Record<TaskStatusCode, string> = {
  [TaskStatusCode.PENDING]: '待处理',
  [TaskStatusCode.PROCESSING]: '处理中',
  [TaskStatusCode.COMPLETED]: '已完成',
  [TaskStatusCode.BLOCKED]: '已阻断',
  [TaskStatusCode.FAILED]: '失败',
}
