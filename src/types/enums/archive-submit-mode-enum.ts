/** 归档任务提交权模式 */
export enum ArchiveSubmitModeCode {
  ORGANIZER_AND_ASSIGNED = 'ORGANIZER_AND_ASSIGNED',
  ORGANIZER_ONLY = 'ORGANIZER_ONLY',
}

export const ALL_ARCHIVE_SUBMIT_MODE_CODES: readonly ArchiveSubmitModeCode[] = [
  ArchiveSubmitModeCode.ORGANIZER_AND_ASSIGNED,
  ArchiveSubmitModeCode.ORGANIZER_ONLY,
]

export const ArchiveSubmitModeDescription: Record<ArchiveSubmitModeCode, string> = {
  [ArchiveSubmitModeCode.ORGANIZER_AND_ASSIGNED]: '归档责任人与被指定提交老师',
  [ArchiveSubmitModeCode.ORGANIZER_ONLY]: '仅归档责任人可提交',
}
