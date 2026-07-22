/** 现场考查计划状态 - OnsiteVisitPlanStatusEnum */
export enum OnsiteVisitPlanStatusCode {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const ALL_ONSITE_VISIT_PLAN_STATUS_CODES: readonly OnsiteVisitPlanStatusCode[] = [
  OnsiteVisitPlanStatusCode.PLANNED,
  OnsiteVisitPlanStatusCode.IN_PROGRESS,
  OnsiteVisitPlanStatusCode.COMPLETED,
  OnsiteVisitPlanStatusCode.CANCELLED,
]

export const OnsiteVisitPlanStatusDescription: Record<OnsiteVisitPlanStatusCode, string> = {
  [OnsiteVisitPlanStatusCode.PLANNED]: '已制定',
  [OnsiteVisitPlanStatusCode.IN_PROGRESS]: '执行中',
  [OnsiteVisitPlanStatusCode.COMPLETED]: '已完成',
  [OnsiteVisitPlanStatusCode.CANCELLED]: '已取消',
}
