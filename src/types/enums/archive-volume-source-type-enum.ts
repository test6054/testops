/** 归档卷来源类型 */
export enum ArchiveVolumeSourceTypeCode {
  ONLINE_MARKING = 'ONLINE_MARKING',
  OFFLINE_MARKED = 'OFFLINE_MARKED',
  HISTORY_IMPORT = 'HISTORY_IMPORT',
  RESEARCH_PROJECT = 'RESEARCH_PROJECT',
  GRADUATION_THESIS = 'GRADUATION_THESIS',
  STUDENT_RECORD = 'STUDENT_RECORD',
}

export const ALL_ARCHIVE_VOLUME_SOURCE_TYPE_CODES: readonly ArchiveVolumeSourceTypeCode[] = [
  ArchiveVolumeSourceTypeCode.ONLINE_MARKING,
  ArchiveVolumeSourceTypeCode.OFFLINE_MARKED,
  ArchiveVolumeSourceTypeCode.HISTORY_IMPORT,
  ArchiveVolumeSourceTypeCode.RESEARCH_PROJECT,
  ArchiveVolumeSourceTypeCode.GRADUATION_THESIS,
  ArchiveVolumeSourceTypeCode.STUDENT_RECORD,
]
export const ArchiveVolumeSourceTypeDescription: Record<ArchiveVolumeSourceTypeCode, string> = {
  [ArchiveVolumeSourceTypeCode.ONLINE_MARKING]: '线上阅卷',
  [ArchiveVolumeSourceTypeCode.OFFLINE_MARKED]: '线下纯归档',
  [ArchiveVolumeSourceTypeCode.HISTORY_IMPORT]: '历史补录',
  [ArchiveVolumeSourceTypeCode.RESEARCH_PROJECT]: '科研项目归档',
  [ArchiveVolumeSourceTypeCode.GRADUATION_THESIS]: '毕设归档',
  [ArchiveVolumeSourceTypeCode.STUDENT_RECORD]: '学籍归档',
}
