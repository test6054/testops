/** 外部数据拔取审计事件 - ExternalPullAuditEventEnum */
export enum ExternalPullAuditEventCode {
  QUERY_SCOPE_CHECK = 'QUERY_SCOPE_CHECK',
  FIELD_SCOPE_CHECK = 'FIELD_SCOPE_CHECK',
  MASK_PREVIEW_CHECK = 'MASK_PREVIEW_CHECK',
  QUERY_TIMEOUT = 'QUERY_TIMEOUT',
  ROW_LIMIT_EXCEEDED = 'ROW_LIMIT_EXCEEDED',
  TASK_FAILED = 'TASK_FAILED',
  TASK_SUCCEEDED = 'TASK_SUCCEEDED',
  MANUAL_REJECT = 'MANUAL_REJECT',
  MANUAL_CONFIRM = 'MANUAL_CONFIRM',
  TASK_CANCELLED = 'TASK_CANCELLED',
}

export const ALL_EXTERNAL_PULL_AUDIT_EVENT_CODES: readonly ExternalPullAuditEventCode[] = [
  ExternalPullAuditEventCode.QUERY_SCOPE_CHECK,
  ExternalPullAuditEventCode.FIELD_SCOPE_CHECK,
  ExternalPullAuditEventCode.MASK_PREVIEW_CHECK,
  ExternalPullAuditEventCode.QUERY_TIMEOUT,
  ExternalPullAuditEventCode.ROW_LIMIT_EXCEEDED,
  ExternalPullAuditEventCode.TASK_FAILED,
  ExternalPullAuditEventCode.TASK_SUCCEEDED,
  ExternalPullAuditEventCode.MANUAL_REJECT,
  ExternalPullAuditEventCode.MANUAL_CONFIRM,
  ExternalPullAuditEventCode.TASK_CANCELLED,
]

export const ExternalPullAuditEventDescription: Record<ExternalPullAuditEventCode, string> = {
  [ExternalPullAuditEventCode.QUERY_SCOPE_CHECK]: '查询范围检查',
  [ExternalPullAuditEventCode.FIELD_SCOPE_CHECK]: '字段范围检查',
  [ExternalPullAuditEventCode.MASK_PREVIEW_CHECK]: '脱敏预览检查',
  [ExternalPullAuditEventCode.QUERY_TIMEOUT]: '查询超时',
  [ExternalPullAuditEventCode.ROW_LIMIT_EXCEEDED]: '返回行数超限',
  [ExternalPullAuditEventCode.TASK_FAILED]: '任务执行失败',
  [ExternalPullAuditEventCode.TASK_SUCCEEDED]: '任务执行完成',
  [ExternalPullAuditEventCode.MANUAL_REJECT]: '人工驳回',
  [ExternalPullAuditEventCode.MANUAL_CONFIRM]: '人工确认',
  [ExternalPullAuditEventCode.TASK_CANCELLED]: '任务取消',
}
