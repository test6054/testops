/** 归档成绩来源 */
export enum ArchiveScoreSourceCode {
  MARK_INTERNAL = 'MARK_INTERNAL',
  TEACHING_AFFAIRS = 'TEACHING_AFFAIRS',
  OFFLINE_CONFIRMED = 'OFFLINE_CONFIRMED',
  NOT_REQUIRED = 'NOT_REQUIRED',
}

export const ALL_ARCHIVE_SCORE_SOURCE_CODES: readonly ArchiveScoreSourceCode[] = [
  ArchiveScoreSourceCode.MARK_INTERNAL,
  ArchiveScoreSourceCode.TEACHING_AFFAIRS,
  ArchiveScoreSourceCode.OFFLINE_CONFIRMED,
  ArchiveScoreSourceCode.NOT_REQUIRED,
]
export const ArchiveScoreSourceDescription: Record<ArchiveScoreSourceCode, string> = {
  [ArchiveScoreSourceCode.MARK_INTERNAL]: 'mark 内部成绩',
  [ArchiveScoreSourceCode.TEACHING_AFFAIRS]: '教务系统',
  [ArchiveScoreSourceCode.OFFLINE_CONFIRMED]: '线下确认',
  [ArchiveScoreSourceCode.NOT_REQUIRED]: '无需成绩',
}


