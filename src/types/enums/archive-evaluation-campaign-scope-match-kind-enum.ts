/** 迎评批次卷范围匹配类型 */
export enum ArchiveEvaluationCampaignScopeMatchKindCode {
  IN_TERM = 'IN_TERM',
  CROSS_TERM_REMEDIATION = 'CROSS_TERM_REMEDIATION',
}

export const ALL_ARCHIVE_EVALUATION_CAMPAIGN_SCOPE_MATCH_KIND_CODES: readonly ArchiveEvaluationCampaignScopeMatchKindCode[] = [
  ArchiveEvaluationCampaignScopeMatchKindCode.IN_TERM,
  ArchiveEvaluationCampaignScopeMatchKindCode.CROSS_TERM_REMEDIATION,
]

export const ArchiveEvaluationCampaignScopeMatchKindDescription: Record<
  ArchiveEvaluationCampaignScopeMatchKindCode,
  string
> = {
  [ArchiveEvaluationCampaignScopeMatchKindCode.IN_TERM]: '同学期范围',
  [ArchiveEvaluationCampaignScopeMatchKindCode.CROSS_TERM_REMEDIATION]: '跨学期收集中',
}
