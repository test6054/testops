/** RejudgePlanStatus */
export enum RejudgePlanStatusCode {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export const ALL_REJUDGE_PLAN_STATUS_CODES: readonly RejudgePlanStatusCode[] = [
  RejudgePlanStatusCode.DRAFT,
  RejudgePlanStatusCode.PENDING_APPROVAL,
  RejudgePlanStatusCode.APPROVED,
  RejudgePlanStatusCode.EXECUTING,
  RejudgePlanStatusCode.COMPLETED,
  RejudgePlanStatusCode.REJECTED,
]

export const RejudgePlanStatusDescription: Record<RejudgePlanStatusCode, string> = {
  [RejudgePlanStatusCode.DRAFT]: '草稿',
  [RejudgePlanStatusCode.PENDING_APPROVAL]: '待审批',
  [RejudgePlanStatusCode.APPROVED]: '已审批',
  [RejudgePlanStatusCode.EXECUTING]: '执行中',
  [RejudgePlanStatusCode.COMPLETED]: '已完成',
  [RejudgePlanStatusCode.REJECTED]: '已驳回',
}

