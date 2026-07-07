/** 归档成绩完成状态 */
export enum ArchiveScoreCompletionStatusCode {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
  NOT_REQUIRED = 'NOT_REQUIRED',
}

export const ALL_ARCHIVE_SCORE_COMPLETION_STATUS_CODES: readonly ArchiveScoreCompletionStatusCode[] = [
  ArchiveScoreCompletionStatusCode.PENDING,
  ArchiveScoreCompletionStatusCode.COMPLETED,
  ArchiveScoreCompletionStatusCode.VERIFIED,
  ArchiveScoreCompletionStatusCode.NOT_REQUIRED,
]

export const ArchiveScoreCompletionStatusDescription: Record<ArchiveScoreCompletionStatusCode, string> = {
  [ArchiveScoreCompletionStatusCode.PENDING]: '待确认',
  [ArchiveScoreCompletionStatusCode.COMPLETED]: '已完成',
  [ArchiveScoreCompletionStatusCode.VERIFIED]: '已核验',
  [ArchiveScoreCompletionStatusCode.NOT_REQUIRED]: '无需确认',
}

