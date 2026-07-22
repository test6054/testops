/** 审核评估问题严重度 - 与后端 AuditIssueSeverityEnum 逐值对齐 */
export enum AuditIssueSeverityCode {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL',
}

export const ALL_AUDIT_ISSUE_SEVERITY_CODES: readonly AuditIssueSeverityCode[] = [
  AuditIssueSeverityCode.MINOR,
  AuditIssueSeverityCode.MAJOR,
  AuditIssueSeverityCode.CRITICAL,
]

export const AuditIssueSeverityDescription: Record<AuditIssueSeverityCode, string> = {
  [AuditIssueSeverityCode.MINOR]: '轻微',
  [AuditIssueSeverityCode.MAJOR]: '严重',
  [AuditIssueSeverityCode.CRITICAL]: '重大',
}

