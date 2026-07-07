/** 归档卷来源类型 */
export enum ArchiveVolumeSourceTypeCode {
  ONLINE_MARKING = 'ONLINE_MARKING',
  OFFLINE_MARKED = 'OFFLINE_MARKED',
  HISTORY_IMPORT = 'HISTORY_IMPORT',
}

export const ALL_ARCHIVE_VOLUME_SOURCE_TYPE_CODES: readonly ArchiveVolumeSourceTypeCode[] = [
  ArchiveVolumeSourceTypeCode.ONLINE_MARKING,
  ArchiveVolumeSourceTypeCode.OFFLINE_MARKED,
  ArchiveVolumeSourceTypeCode.HISTORY_IMPORT,
]
export const ArchiveVolumeSourceTypeDescription: Record<ArchiveVolumeSourceTypeCode, string> = {
  [ArchiveVolumeSourceTypeCode.ONLINE_MARKING]: '线上阅卷',
  [ArchiveVolumeSourceTypeCode.OFFLINE_MARKED]: '线下纯归档',
  [ArchiveVolumeSourceTypeCode.HISTORY_IMPORT]: '历史补录',
}
