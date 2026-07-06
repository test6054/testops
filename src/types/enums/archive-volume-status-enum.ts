/** 归档卷状态 */
export enum ArchiveVolumeStatusCode {
  DRAFT = 'DRAFT',
  COLLECTING = 'COLLECTING',
  SUBMITTED = 'SUBMITTED',
  STORED = 'STORED',
  ARCHIVED_DESTROYED = 'ARCHIVED_DESTROYED',
}

export const ALL_ARCHIVE_VOLUME_STATUS_CODES: readonly ArchiveVolumeStatusCode[] = [
  ArchiveVolumeStatusCode.DRAFT,
  ArchiveVolumeStatusCode.COLLECTING,
  ArchiveVolumeStatusCode.SUBMITTED,
  ArchiveVolumeStatusCode.STORED,
  ArchiveVolumeStatusCode.ARCHIVED_DESTROYED,
]
export const ArchiveVolumeStatusDescription: Record<ArchiveVolumeStatusCode, string> = {
  [ArchiveVolumeStatusCode.DRAFT]: '草稿',
  [ArchiveVolumeStatusCode.COLLECTING]: '收集中',
  [ArchiveVolumeStatusCode.SUBMITTED]: '已提交待移交',
  [ArchiveVolumeStatusCode.STORED]: '已入库',
  [ArchiveVolumeStatusCode.ARCHIVED_DESTROYED]: '销毁清册归档',
}


