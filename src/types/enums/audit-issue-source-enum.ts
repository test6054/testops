/** 审核评估问题来源 - 与后端 AuditIssueSourceEnum 逐值对齐 */
export enum AuditIssueSourceCode {
  SELF_AUDIT = 'SELF_AUDIT',
  EXPERT_AUDIT = 'EXPERT_AUDIT',
  ACCREDITATION_AUDIT = 'ACCREDITATION_AUDIT',
  EXTERNAL_INSPECTION = 'EXTERNAL_INSPECTION',
}

export const ALL_AUDIT_ISSUE_SOURCE_CODES: readonly AuditIssueSourceCode[] = [
  AuditIssueSourceCode.SELF_AUDIT,
  AuditIssueSourceCode.EXPERT_AUDIT,
  AuditIssueSourceCode.ACCREDITATION_AUDIT,
  AuditIssueSourceCode.EXTERNAL_INSPECTION,
]

export const AuditIssueSourceDescription: Record<AuditIssueSourceCode, string> = {
  [AuditIssueSourceCode.SELF_AUDIT]: '自评自查',
  [AuditIssueSourceCode.EXPERT_AUDIT]: '专家审核',
  [AuditIssueSourceCode.ACCREDITATION_AUDIT]: '认证审核',
  [AuditIssueSourceCode.EXTERNAL_INSPECTION]: '外部检查',
}

