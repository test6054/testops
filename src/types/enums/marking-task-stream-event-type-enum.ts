/** 阅卷任务 SSE 事件类型 */
export enum MarkingTaskStreamEventTypeCode {
  TASK_ALLOCATED = 'TASK_ALLOCATED',
  TASK_RECYCLED = 'TASK_RECYCLED',
  TASK_SUBMITTED = 'TASK_SUBMITTED',
  TASK_WITHDRAWN = 'TASK_WITHDRAWN',
  SESSION_PAUSED = 'SESSION_PAUSED',
  SESSION_RESUMED = 'SESSION_RESUMED',
  SESSION_PROGRESS = 'SESSION_PROGRESS',
}

export const ALL_MARKING_TASK_STREAM_EVENT_TYPE_CODES: readonly MarkingTaskStreamEventTypeCode[] = [
  MarkingTaskStreamEventTypeCode.TASK_ALLOCATED,
  MarkingTaskStreamEventTypeCode.TASK_RECYCLED,
  MarkingTaskStreamEventTypeCode.TASK_SUBMITTED,
  MarkingTaskStreamEventTypeCode.TASK_WITHDRAWN,
  MarkingTaskStreamEventTypeCode.SESSION_PAUSED,
  MarkingTaskStreamEventTypeCode.SESSION_RESUMED,
  MarkingTaskStreamEventTypeCode.SESSION_PROGRESS,
]

export const MarkingTaskStreamEventTypeDescription: Record<MarkingTaskStreamEventTypeCode, string> = {
  [MarkingTaskStreamEventTypeCode.TASK_ALLOCATED]: '任务已分配',
  [MarkingTaskStreamEventTypeCode.TASK_RECYCLED]: '任务已回收',
  [MarkingTaskStreamEventTypeCode.TASK_SUBMITTED]: '任务已提交',
  [MarkingTaskStreamEventTypeCode.TASK_WITHDRAWN]: '任务已撤回',
  [MarkingTaskStreamEventTypeCode.SESSION_PAUSED]: '正评会话已暂停',
  [MarkingTaskStreamEventTypeCode.SESSION_RESUMED]: '正评会话已恢复',
  [MarkingTaskStreamEventTypeCode.SESSION_PROGRESS]: '正评会话进度更新',
}
