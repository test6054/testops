/** 审核评估问题状态 - AuditIssueStatusEnum */
export enum AuditIssueStatusCode {
  OPEN = 'OPEN',
  IN_RECTIFICATION = 'IN_RECTIFICATION',
  RECTIFIED = 'RECTIFIED',
  VERIFIED = 'VERIFIED',
  CLOSED = 'CLOSED',
}

export const ALL_AUDIT_ISSUE_STATUS_CODES: readonly AuditIssueStatusCode[] = [
  AuditIssueStatusCode.OPEN,
  AuditIssueStatusCode.IN_RECTIFICATION,
  AuditIssueStatusCode.RECTIFIED,
  AuditIssueStatusCode.VERIFIED,
  AuditIssueStatusCode.CLOSED,
]

export const AuditIssueStatusDescription: Record<AuditIssueStatusCode, string> = {
  [AuditIssueStatusCode.OPEN]: '待整改',
  [AuditIssueStatusCode.IN_RECTIFICATION]: '整改中',
  [AuditIssueStatusCode.RECTIFIED]: '已整改',
  [AuditIssueStatusCode.VERIFIED]: '已复核',
  [AuditIssueStatusCode.CLOSED]: '已闭环',
}

