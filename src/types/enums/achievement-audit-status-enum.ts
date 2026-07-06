/** 达成度审核状态 - AchievementAuditStatusEnum */
export enum AchievementAuditStatusCode {
  DRAFT = 'DRAFT',
  CALCULATED = 'CALCULATED',
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  RETURNED = 'RETURNED',
  ARCHIVED = 'ARCHIVED',
}

export const ALL_ACHIEVEMENT_AUDIT_STATUS_CODES: readonly AchievementAuditStatusCode[] = [
  AchievementAuditStatusCode.DRAFT,
  AchievementAuditStatusCode.CALCULATED,
  AchievementAuditStatusCode.SUBMITTED,
  AchievementAuditStatusCode.CONFIRMED,
  AchievementAuditStatusCode.RETURNED,
  AchievementAuditStatusCode.ARCHIVED,
]

export const AchievementAuditStatusDescription: Record<AchievementAuditStatusCode, string> = {
  [AchievementAuditStatusCode.DRAFT]: '起草中',
  [AchievementAuditStatusCode.CALCULATED]: '已计算',
  [AchievementAuditStatusCode.SUBMITTED]: '已提交',
  [AchievementAuditStatusCode.CONFIRMED]: '已确认',
  [AchievementAuditStatusCode.RETURNED]: '已退回',
  [AchievementAuditStatusCode.ARCHIVED]: '已归档',
}
