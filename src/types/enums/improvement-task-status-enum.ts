/** 持续改进任务状态 - ImprovementTaskStatusEnum */
export enum ImprovementTaskStatusCode {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  REVIEWED = 'REVIEWED',
  CLOSED = 'CLOSED',
  RETURNED = 'RETURNED',
}

export const ALL_IMPROVEMENT_TASK_STATUS_CODES: readonly ImprovementTaskStatusCode[] = [
  ImprovementTaskStatusCode.OPEN,
  ImprovementTaskStatusCode.IN_PROGRESS,
  ImprovementTaskStatusCode.SUBMITTED,
  ImprovementTaskStatusCode.REVIEWED,
  ImprovementTaskStatusCode.CLOSED,
  ImprovementTaskStatusCode.RETURNED,
]

export const ImprovementTaskStatusDescription: Record<ImprovementTaskStatusCode, string> = {
  [ImprovementTaskStatusCode.OPEN]: '已开启',
  [ImprovementTaskStatusCode.IN_PROGRESS]: '进行中',
  [ImprovementTaskStatusCode.SUBMITTED]: '已提交整改证据',
  [ImprovementTaskStatusCode.REVIEWED]: '已复评',
  [ImprovementTaskStatusCode.CLOSED]: '已闭环',
  [ImprovementTaskStatusCode.RETURNED]: '已退回',
}

