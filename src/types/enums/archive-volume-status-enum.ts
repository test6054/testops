/** 归档任务主状态 */
export enum ArchiveVolumeStatusCode {
  DRAFT = 'DRAFT',
  COLLECTING = 'COLLECTING',
  DEPARTMENT_REVIEW_PENDING = 'DEPARTMENT_REVIEW_PENDING',
  DEPARTMENT_REVIEWED = 'DEPARTMENT_REVIEWED',
  SUBMITTED = 'SUBMITTED',
  STORED = 'STORED',
  ARCHIVED_DESTROYED = 'ARCHIVED_DESTROYED',
}

export const ALL_ARCHIVE_VOLUME_STATUS_CODES: readonly ArchiveVolumeStatusCode[] = [
  ArchiveVolumeStatusCode.DRAFT,
  ArchiveVolumeStatusCode.COLLECTING,
  ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING,
  ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED,
  ArchiveVolumeStatusCode.SUBMITTED,
  ArchiveVolumeStatusCode.STORED,
  ArchiveVolumeStatusCode.ARCHIVED_DESTROYED,
]
export const ArchiveVolumeStatusDescription: Record<ArchiveVolumeStatusCode, string> = {
  [ArchiveVolumeStatusCode.DRAFT]: '草稿',
  [ArchiveVolumeStatusCode.COLLECTING]: '收集中',
  [ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING]: '待院系审核',
  [ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED]: '院系审核通过',
  [ArchiveVolumeStatusCode.SUBMITTED]: '已提交待移交',
  [ArchiveVolumeStatusCode.STORED]: '已入库',
  [ArchiveVolumeStatusCode.ARCHIVED_DESTROYED]: '销毁清册归档',
}


