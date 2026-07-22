/** 归档鉴定状态 */
export enum ArchiveAppraisalStatusCode {
  NOT_DUE = 'NOT_DUE',
  REMINDER_SENT = 'REMINDER_SENT',
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  OPINION_RECORDED = 'OPINION_RECORDED',
}

export const ALL_ARCHIVE_APPRAISAL_STATUS_CODES: readonly ArchiveAppraisalStatusCode[] = [
  ArchiveAppraisalStatusCode.NOT_DUE,
  ArchiveAppraisalStatusCode.REMINDER_SENT,
  ArchiveAppraisalStatusCode.REQUESTED,
  ArchiveAppraisalStatusCode.APPROVED,
  ArchiveAppraisalStatusCode.REJECTED,
  ArchiveAppraisalStatusCode.OPINION_RECORDED,
]
export const ArchiveAppraisalStatusDescription: Record<ArchiveAppraisalStatusCode, string> = {
  [ArchiveAppraisalStatusCode.NOT_DUE]: '未到期',
  [ArchiveAppraisalStatusCode.REMINDER_SENT]: '已提醒',
  [ArchiveAppraisalStatusCode.REQUESTED]: '已申请',
  [ArchiveAppraisalStatusCode.APPROVED]: '已通过',
  [ArchiveAppraisalStatusCode.REJECTED]: '已驳回',
  [ArchiveAppraisalStatusCode.OPINION_RECORDED]: '意见已记录',
}


