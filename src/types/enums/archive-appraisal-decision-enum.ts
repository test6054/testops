/** 档案鉴定决议 - ArchiveAppraisalDecision */
export enum ArchiveAppraisalDecisionCode {
  RETAIN = 'RETAIN',
  DESTROY = 'DESTROY',
}

export const ALL_ARCHIVE_APPRAISAL_DECISION_CODES: readonly ArchiveAppraisalDecisionCode[] = [
  ArchiveAppraisalDecisionCode.RETAIN,
  ArchiveAppraisalDecisionCode.DESTROY,
]

export const ArchiveAppraisalDecisionDescription: Record<ArchiveAppraisalDecisionCode, string> = {
  [ArchiveAppraisalDecisionCode.RETAIN]: '继续保留',
  [ArchiveAppraisalDecisionCode.DESTROY]: '可销毁',
}
