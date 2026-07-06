/** 复核任务状态 */
export enum ReviewTaskStatusCode {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  INVALIDATED = 'INVALIDATED',
}

export const ALL_REVIEW_TASK_STATUS_CODES: readonly ReviewTaskStatusCode[] = [
  ReviewTaskStatusCode.PENDING,
  ReviewTaskStatusCode.IN_PROGRESS,
  ReviewTaskStatusCode.APPROVED,
  ReviewTaskStatusCode.REJECTED,
  ReviewTaskStatusCode.INVALIDATED,
]
export const ReviewTaskStatusDescription: Record<ReviewTaskStatusCode, string> = {
  [ReviewTaskStatusCode.PENDING]: '待复核',
  [ReviewTaskStatusCode.IN_PROGRESS]: '复核中',
  [ReviewTaskStatusCode.APPROVED]: '已通过',
  [ReviewTaskStatusCode.REJECTED]: '已驳回',
  [ReviewTaskStatusCode.INVALIDATED]: '已失效',
}


