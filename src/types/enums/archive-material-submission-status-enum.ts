/** 归档材料提交状态 */
export enum ArchiveMaterialSubmissionStatusCode {
  MISSING = 'MISSING',
  SUBMITTED = 'SUBMITTED',
  DELAY_ALLOWED = 'DELAY_ALLOWED',
  OVERDUE = 'OVERDUE',
  WAIVED_WITH_REASON = 'WAIVED_WITH_REASON',
}

export const ALL_ARCHIVE_MATERIAL_SUBMISSION_STATUS_CODES: readonly ArchiveMaterialSubmissionStatusCode[] = [
  ArchiveMaterialSubmissionStatusCode.MISSING,
  ArchiveMaterialSubmissionStatusCode.SUBMITTED,
  ArchiveMaterialSubmissionStatusCode.DELAY_ALLOWED,
  ArchiveMaterialSubmissionStatusCode.OVERDUE,
  ArchiveMaterialSubmissionStatusCode.WAIVED_WITH_REASON,
]

export const ArchiveMaterialSubmissionStatusDescription: Record<ArchiveMaterialSubmissionStatusCode, string> = {
  [ArchiveMaterialSubmissionStatusCode.MISSING]: '缺件',
  [ArchiveMaterialSubmissionStatusCode.SUBMITTED]: '已提交',
  [ArchiveMaterialSubmissionStatusCode.DELAY_ALLOWED]: '允许延迟补交',
  [ArchiveMaterialSubmissionStatusCode.OVERDUE]: '延迟已逾期',
  [ArchiveMaterialSubmissionStatusCode.WAIVED_WITH_REASON]: '缺失已授权',
}

