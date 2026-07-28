/** edu-mark 考试质量同步状态 */
export enum MarkExamQualitySyncStatusCode {
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  NOT_SYNCED = 'NOT_SYNCED',
  PARTIALLY_SYNCED = 'PARTIALLY_SYNCED',
  SYNCED = 'SYNCED',
}

export const ALL_MARK_EXAM_QUALITY_SYNC_STATUS_CODES: readonly MarkExamQualitySyncStatusCode[] = [
  MarkExamQualitySyncStatusCode.NOT_CONFIGURED,
  MarkExamQualitySyncStatusCode.NOT_SYNCED,
  MarkExamQualitySyncStatusCode.PARTIALLY_SYNCED,
  MarkExamQualitySyncStatusCode.SYNCED,
]

export const MarkExamQualitySyncStatusDescription: Record<MarkExamQualitySyncStatusCode, string> = {
  [MarkExamQualitySyncStatusCode.NOT_CONFIGURED]: '未配置质量课程',
  [MarkExamQualitySyncStatusCode.NOT_SYNCED]: '未同步',
  [MarkExamQualitySyncStatusCode.PARTIALLY_SYNCED]: '部分同步',
  [MarkExamQualitySyncStatusCode.SYNCED]: '已同步',
}
