/** 审计动作类型 - PortfolioAuditActionTypeEnum */
export enum PortfolioAuditActionTypeCode {
  EXPORT_APPLY = 'EXPORT_APPLY',
  EXPORT_APPROVE = 'EXPORT_APPROVE',
  EXPORT_REJECT = 'EXPORT_REJECT',
  EXPORT_DOWNLOAD = 'EXPORT_DOWNLOAD',
  POLICY_PUBLISH = 'POLICY_PUBLISH',
  POLICY_SUPERSEDE = 'POLICY_SUPERSEDE',
  POLICY_DOWNLOAD = 'POLICY_DOWNLOAD',
  MASK_RULE_SAVE = 'MASK_RULE_SAVE',
  NATIONAL_TEACHER_REPORT = 'NATIONAL_TEACHER_REPORT',
  NATIONAL_TEACHER_INBOUND = 'NATIONAL_TEACHER_INBOUND',
}

export const ALL_PORTFOLIO_AUDIT_ACTION_TYPE_CODES: readonly PortfolioAuditActionTypeCode[] = [
  PortfolioAuditActionTypeCode.EXPORT_APPLY,
  PortfolioAuditActionTypeCode.EXPORT_APPROVE,
  PortfolioAuditActionTypeCode.EXPORT_REJECT,
  PortfolioAuditActionTypeCode.EXPORT_DOWNLOAD,
  PortfolioAuditActionTypeCode.POLICY_PUBLISH,
  PortfolioAuditActionTypeCode.POLICY_SUPERSEDE,
  PortfolioAuditActionTypeCode.POLICY_DOWNLOAD,
  PortfolioAuditActionTypeCode.MASK_RULE_SAVE,
  PortfolioAuditActionTypeCode.NATIONAL_TEACHER_REPORT,
  PortfolioAuditActionTypeCode.NATIONAL_TEACHER_INBOUND,
]

export const PortfolioAuditActionTypeDescription: Record<PortfolioAuditActionTypeCode, string> = {
  [PortfolioAuditActionTypeCode.EXPORT_APPLY]: '导出申请',
  [PortfolioAuditActionTypeCode.EXPORT_APPROVE]: '导出审批',
  [PortfolioAuditActionTypeCode.EXPORT_REJECT]: '导出驳回',
  [PortfolioAuditActionTypeCode.EXPORT_DOWNLOAD]: '导出下载',
  [PortfolioAuditActionTypeCode.POLICY_PUBLISH]: '政策发布',
  [PortfolioAuditActionTypeCode.POLICY_SUPERSEDE]: '政策替代',
  [PortfolioAuditActionTypeCode.POLICY_DOWNLOAD]: '政策下载',
  [PortfolioAuditActionTypeCode.MASK_RULE_SAVE]: '脱敏规则保存',
  [PortfolioAuditActionTypeCode.NATIONAL_TEACHER_REPORT]: '全国教师系统上报',
  [PortfolioAuditActionTypeCode.NATIONAL_TEACHER_INBOUND]: '全国教师系统回流',
}
