/** AI 任务状态 - AiTaskStatusEnum */
export enum AiTaskStatusCode {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export const ALL_AI_TASK_STATUS_CODES: readonly AiTaskStatusCode[] = [
  AiTaskStatusCode.PENDING,
  AiTaskStatusCode.PROCESSING,
  AiTaskStatusCode.SUCCEEDED,
  AiTaskStatusCode.FAILED,
  AiTaskStatusCode.CANCELLED,
]

export const AiTaskStatusDescription: Record<AiTaskStatusCode, string> = {
  [AiTaskStatusCode.PENDING]: '待处理',
  [AiTaskStatusCode.PROCESSING]: '处理中',
  [AiTaskStatusCode.SUCCEEDED]: '已完成',
  [AiTaskStatusCode.FAILED]: '已失败',
  [AiTaskStatusCode.CANCELLED]: '已取消',
}
