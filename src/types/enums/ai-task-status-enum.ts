/** AI 任务状态 - 对齐 edu-common AiTaskStatusEnum（唯一真源） */
export enum AiTaskStatusCode {
  NOT_STARTED = 'NOT_STARTED',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export const ALL_AI_TASK_STATUS_CODES: readonly AiTaskStatusCode[] = [
  AiTaskStatusCode.NOT_STARTED,
  AiTaskStatusCode.PENDING,
  AiTaskStatusCode.PROCESSING,
  AiTaskStatusCode.COMPLETED,
  AiTaskStatusCode.FAILED,
  AiTaskStatusCode.CANCELLED,
]

export const AiTaskStatusDescription: Record<AiTaskStatusCode, string> = {
  [AiTaskStatusCode.NOT_STARTED]: '未开始',
  [AiTaskStatusCode.PENDING]: '待处理',
  [AiTaskStatusCode.PROCESSING]: '处理中',
  [AiTaskStatusCode.COMPLETED]: '已完成',
  [AiTaskStatusCode.FAILED]: '失败',
  [AiTaskStatusCode.CANCELLED]: '已取消',
}
