/** 阅卷任务状态 */
export enum MarkingTaskStatusCode {
  ALLOCATED = 'ALLOCATED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  FINALIZED = 'FINALIZED',
  RECYCLED = 'RECYCLED',
}

export const ALL_MARKING_TASK_STATUS_CODES: readonly MarkingTaskStatusCode[] = [
  MarkingTaskStatusCode.ALLOCATED,
  MarkingTaskStatusCode.IN_PROGRESS,
  MarkingTaskStatusCode.SUBMITTED,
  MarkingTaskStatusCode.FINALIZED,
  MarkingTaskStatusCode.RECYCLED,
]
export const MarkingTaskStatusDescription: Record<MarkingTaskStatusCode, string> = {
  [MarkingTaskStatusCode.ALLOCATED]: '已分配',
  [MarkingTaskStatusCode.IN_PROGRESS]: '批改中',
  [MarkingTaskStatusCode.SUBMITTED]: '已提交',
  [MarkingTaskStatusCode.FINALIZED]: '已定稿',
  [MarkingTaskStatusCode.RECYCLED]: '已回收',
}
