/** 档案销毁审批决议 - ArchiveDestructionDecision */
export enum ArchiveDestructionDecisionCode {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const ALL_ARCHIVE_DESTRUCTION_DECISION_CODES: readonly ArchiveDestructionDecisionCode[] = [
  ArchiveDestructionDecisionCode.APPROVED,
  ArchiveDestructionDecisionCode.REJECTED,
]

export const ArchiveDestructionDecisionDescription: Record<ArchiveDestructionDecisionCode, string> = {
  [ArchiveDestructionDecisionCode.APPROVED]: '审批通过',
  [ArchiveDestructionDecisionCode.REJECTED]: '审批拒绝',
}
