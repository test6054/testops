/** 档案袋 AI 候选字段确认状态 */
export enum PortfolioCandidateConfirmStatusCode {
  PENDING_CONFIRM = 'PENDING_CONFIRM',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  NEEDS_MANUAL_FILL = 'NEEDS_MANUAL_FILL',
}

export const ALL_PORTFOLIO_CANDIDATE_CONFIRM_STATUS_CODES: readonly PortfolioCandidateConfirmStatusCode[] = [
  PortfolioCandidateConfirmStatusCode.PENDING_CONFIRM,
  PortfolioCandidateConfirmStatusCode.CONFIRMED,
  PortfolioCandidateConfirmStatusCode.REJECTED,
  PortfolioCandidateConfirmStatusCode.NEEDS_MANUAL_FILL,
]

export const PortfolioCandidateConfirmStatusDescription: Record<PortfolioCandidateConfirmStatusCode, string> = {
  [PortfolioCandidateConfirmStatusCode.PENDING_CONFIRM]: '待确认',
  [PortfolioCandidateConfirmStatusCode.CONFIRMED]: '已确认',
  [PortfolioCandidateConfirmStatusCode.REJECTED]: '已驳回',
  [PortfolioCandidateConfirmStatusCode.NEEDS_MANUAL_FILL]: '需人工补全',
}
