/** 按卷反查迎评批次命中来源 */
export enum ArchiveEvaluationCampaignResolveMatchKindCode {
  TERM_SCOPE = 'TERM_SCOPE',
  REMEDIATION_SCOPE = 'REMEDIATION_SCOPE',
  NONE = 'NONE',
}

export const ALL_ARCHIVE_EVALUATION_CAMPAIGN_RESOLVE_MATCH_KIND_CODES: readonly ArchiveEvaluationCampaignResolveMatchKindCode[] = [
  ArchiveEvaluationCampaignResolveMatchKindCode.TERM_SCOPE,
  ArchiveEvaluationCampaignResolveMatchKindCode.REMEDIATION_SCOPE,
  ArchiveEvaluationCampaignResolveMatchKindCode.NONE,
]

export const ArchiveEvaluationCampaignResolveMatchKindDescription: Record<
  ArchiveEvaluationCampaignResolveMatchKindCode,
  string
> = {
  [ArchiveEvaluationCampaignResolveMatchKindCode.TERM_SCOPE]: '同学期范围',
  [ArchiveEvaluationCampaignResolveMatchKindCode.REMEDIATION_SCOPE]: '整改关联',
  [ArchiveEvaluationCampaignResolveMatchKindCode.NONE]: '未命中',
}
