/** 审核评估整改任务状态 - AuditRectificationStatusEnum */
export enum AuditRectificationStatusCode {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
  RETURNED = 'RETURNED',
  CLOSED = 'CLOSED',
}

export const ALL_AUDIT_RECTIFICATION_STATUS_CODES: readonly AuditRectificationStatusCode[] = [
  AuditRectificationStatusCode.PLANNED,
  AuditRectificationStatusCode.IN_PROGRESS,
  AuditRectificationStatusCode.SUBMITTED,
  AuditRectificationStatusCode.VERIFIED,
  AuditRectificationStatusCode.RETURNED,
  AuditRectificationStatusCode.CLOSED,
]

export const AuditRectificationStatusDescription: Record<AuditRectificationStatusCode, string> = {
  [AuditRectificationStatusCode.PLANNED]: '已规划',
  [AuditRectificationStatusCode.IN_PROGRESS]: '进行中',
  [AuditRectificationStatusCode.SUBMITTED]: '已提交',
  [AuditRectificationStatusCode.VERIFIED]: '复核通过',
  [AuditRectificationStatusCode.RETURNED]: '已退回',
  [AuditRectificationStatusCode.CLOSED]: '已闭环',
}
