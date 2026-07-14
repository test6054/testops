/** 审计资源类型 - PortfolioAuditResourceTypeEnum */
export enum PortfolioAuditResourceTypeCode {
  EXPORT_APPROVAL = 'EXPORT_APPROVAL',
  POLICY_DOCUMENT = 'POLICY_DOCUMENT',
  MASK_RULE = 'MASK_RULE',
  INTEGRATION_SYNC = 'INTEGRATION_SYNC',
  INTEGRATION_CONFLICT = 'INTEGRATION_CONFLICT',
  INTEGRATION_IDENTITY = 'INTEGRATION_IDENTITY',
  ALERT_RECORD = 'ALERT_RECORD',
  COMPLIANCE_ALERT = 'COMPLIANCE_ALERT',
  AI_TASK = 'AI_TASK',
  AI_ANALYSIS_RESULT = 'AI_ANALYSIS_RESULT',
  PRIVACY_CONSENT = 'PRIVACY_CONSENT',
  TEACHER_PK_SESSION = 'TEACHER_PK_SESSION',
  CORRECTION_IMPACT = 'CORRECTION_IMPACT',
}

export const ALL_PORTFOLIO_AUDIT_RESOURCE_TYPE_CODES: readonly PortfolioAuditResourceTypeCode[] = [
  PortfolioAuditResourceTypeCode.EXPORT_APPROVAL,
  PortfolioAuditResourceTypeCode.POLICY_DOCUMENT,
  PortfolioAuditResourceTypeCode.MASK_RULE,
  PortfolioAuditResourceTypeCode.INTEGRATION_SYNC,
  PortfolioAuditResourceTypeCode.INTEGRATION_CONFLICT,
  PortfolioAuditResourceTypeCode.INTEGRATION_IDENTITY,
  PortfolioAuditResourceTypeCode.ALERT_RECORD,
  PortfolioAuditResourceTypeCode.COMPLIANCE_ALERT,
  PortfolioAuditResourceTypeCode.AI_TASK,
  PortfolioAuditResourceTypeCode.AI_ANALYSIS_RESULT,
  PortfolioAuditResourceTypeCode.PRIVACY_CONSENT,
  PortfolioAuditResourceTypeCode.TEACHER_PK_SESSION,
  PortfolioAuditResourceTypeCode.CORRECTION_IMPACT,
]

export const PortfolioAuditResourceTypeDescription: Record<PortfolioAuditResourceTypeCode, string> = {
  [PortfolioAuditResourceTypeCode.EXPORT_APPROVAL]: '导出审批',
  [PortfolioAuditResourceTypeCode.POLICY_DOCUMENT]: '政策文件',
  [PortfolioAuditResourceTypeCode.MASK_RULE]: '脱敏规则',
  [PortfolioAuditResourceTypeCode.INTEGRATION_SYNC]: '集成同步',
  [PortfolioAuditResourceTypeCode.INTEGRATION_CONFLICT]: '集成冲突单',
  [PortfolioAuditResourceTypeCode.INTEGRATION_IDENTITY]: '身份待匹配',
  [PortfolioAuditResourceTypeCode.ALERT_RECORD]: '画像预警',
  [PortfolioAuditResourceTypeCode.COMPLIANCE_ALERT]: '结构合规预警',
  [PortfolioAuditResourceTypeCode.AI_TASK]: 'AI 任务',
  [PortfolioAuditResourceTypeCode.AI_ANALYSIS_RESULT]: 'AI 分析结果',
  [PortfolioAuditResourceTypeCode.PRIVACY_CONSENT]: '个人信息处理同意',
  [PortfolioAuditResourceTypeCode.TEACHER_PK_SESSION]: '教师 PK 对比会话',
  [PortfolioAuditResourceTypeCode.CORRECTION_IMPACT]: '纠错影响报告',
}
