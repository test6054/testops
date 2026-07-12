import { strictEnumLabel } from '@/utils/strict-enum'

/** 按卷反查迎评批次时的主要命中来源，与后端 ArchiveEvaluationCampaignResolveMatchKind 一致 */
export enum ArchiveEvaluationCampaignResolveMatchKindCode {
  TERM_SCOPE = 'TERM_SCOPE',
  REMEDIATION_SCOPE = 'REMEDIATION_SCOPE',
  NONE = 'NONE',
}

export const ALL_ARCHIVE_EVALUATION_CAMPAIGN_RESOLVE_MATCH_KIND_CODES = [
  ArchiveEvaluationCampaignResolveMatchKindCode.TERM_SCOPE,
  ArchiveEvaluationCampaignResolveMatchKindCode.REMEDIATION_SCOPE,
  ArchiveEvaluationCampaignResolveMatchKindCode.NONE,
] as const

export const ArchiveEvaluationCampaignResolveMatchKindDescription: Record<
  ArchiveEvaluationCampaignResolveMatchKindCode,
  string
> = {
  [ArchiveEvaluationCampaignResolveMatchKindCode.TERM_SCOPE]: '同学期范围',
  [ArchiveEvaluationCampaignResolveMatchKindCode.REMEDIATION_SCOPE]: '整改关联',
  [ArchiveEvaluationCampaignResolveMatchKindCode.NONE]: '未命中',
}

export function archiveEvaluationCampaignResolveMatchKindLabel(
  code: ArchiveEvaluationCampaignResolveMatchKindCode,
): string {
  return strictEnumLabel(ArchiveEvaluationCampaignResolveMatchKindDescription, code, 'matchedBy')
}
