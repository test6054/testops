/** 审核评估整改任务复核结论 - AuditRectificationVerifyDecisionEnum */
export enum AuditRectificationVerifyDecisionCode {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const ALL_AUDIT_RECTIFICATION_VERIFY_DECISION_CODES: readonly AuditRectificationVerifyDecisionCode[] = [
  AuditRectificationVerifyDecisionCode.APPROVED,
  AuditRectificationVerifyDecisionCode.REJECTED,
]

export const AuditRectificationVerifyDecisionDescription: Record<AuditRectificationVerifyDecisionCode, string> = {
  [AuditRectificationVerifyDecisionCode.APPROVED]: '复核通过',
  [AuditRectificationVerifyDecisionCode.REJECTED]: '复核驳回',
}
