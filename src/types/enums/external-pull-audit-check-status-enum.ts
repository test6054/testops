/** 外部数据拔取审计检查状态 */
export enum ExternalPullAuditCheckStatusCode {
  PASSED = 'PASSED',
  REJECTED = 'REJECTED',
  WARNING = 'WARNING',
}

export const ALL_EXTERNAL_PULL_AUDIT_CHECK_STATUS_CODES: readonly ExternalPullAuditCheckStatusCode[] = [
  ExternalPullAuditCheckStatusCode.PASSED,
  ExternalPullAuditCheckStatusCode.REJECTED,
  ExternalPullAuditCheckStatusCode.WARNING,
]

export const ExternalPullAuditCheckStatusDescription: Record<ExternalPullAuditCheckStatusCode, string> = {
  [ExternalPullAuditCheckStatusCode.PASSED]: '通过',
  [ExternalPullAuditCheckStatusCode.REJECTED]: '拒绝',
  [ExternalPullAuditCheckStatusCode.WARNING]: '预警',
}
