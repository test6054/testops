/** 达成度审核责任链事件 - AchievementAuditEventEnum */
export enum AchievementAuditEventCode {
  CALCULATE = 'CALCULATE',
  SUBMIT = 'SUBMIT',
  APPROVE = 'APPROVE',
  RETURN = 'RETURN',
  CONFIRM = 'CONFIRM',
  ARCHIVE = 'ARCHIVE',
}

export const ALL_ACHIEVEMENT_AUDIT_EVENT_CODES: readonly AchievementAuditEventCode[] = [
  AchievementAuditEventCode.CALCULATE,
  AchievementAuditEventCode.SUBMIT,
  AchievementAuditEventCode.APPROVE,
  AchievementAuditEventCode.RETURN,
  AchievementAuditEventCode.CONFIRM,
  AchievementAuditEventCode.ARCHIVE,
]

export const AchievementAuditEventDescription: Record<AchievementAuditEventCode, string> = {
  [AchievementAuditEventCode.CALCULATE]: '计算完成',
  [AchievementAuditEventCode.SUBMIT]: '提交审核',
  [AchievementAuditEventCode.APPROVE]: '审核通过',
  [AchievementAuditEventCode.RETURN]: '退回',
  [AchievementAuditEventCode.CONFIRM]: '确认',
  [AchievementAuditEventCode.ARCHIVE]: '归档',
}
