/** 导出任务状态 */
export enum ExportTaskStatusCode {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export const ALL_EXPORT_TASK_STATUS_CODES: readonly ExportTaskStatusCode[] = [
  ExportTaskStatusCode.PENDING,
  ExportTaskStatusCode.GENERATING,
  ExportTaskStatusCode.COMPLETED,
  ExportTaskStatusCode.FAILED,
  ExportTaskStatusCode.CANCELLED,
]

export const ExportTaskStatusDescription: Record<ExportTaskStatusCode, string> = {
  [ExportTaskStatusCode.PENDING]: '待执行',
  [ExportTaskStatusCode.GENERATING]: '生成中',
  [ExportTaskStatusCode.COMPLETED]: '已完成',
  [ExportTaskStatusCode.FAILED]: '失败',
  [ExportTaskStatusCode.CANCELLED]: '已取消',
}

