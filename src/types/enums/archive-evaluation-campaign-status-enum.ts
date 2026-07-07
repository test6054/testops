/** 归档评价活动状态 */
export enum ArchiveEvaluationCampaignStatusCode {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export const ALL_ARCHIVE_EVALUATION_CAMPAIGN_STATUS_CODES: readonly ArchiveEvaluationCampaignStatusCode[] = [
  ArchiveEvaluationCampaignStatusCode.ACTIVE,
  ArchiveEvaluationCampaignStatusCode.CLOSED,
]

export const ArchiveEvaluationCampaignStatusDescription: Record<ArchiveEvaluationCampaignStatusCode, string> = {
  [ArchiveEvaluationCampaignStatusCode.ACTIVE]: '进行中',
  [ArchiveEvaluationCampaignStatusCode.CLOSED]: '已关闭',
}

