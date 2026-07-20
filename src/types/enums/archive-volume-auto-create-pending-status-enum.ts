/** 归档卷自动建卷待重试队列状态 */
export enum ArchiveVolumeAutoCreatePendingStatusCode {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  MANUAL_REQUIRED = 'MANUAL_REQUIRED',
}

export const ALL_ARCHIVE_VOLUME_AUTO_CREATE_PENDING_STATUS_CODES:
  readonly ArchiveVolumeAutoCreatePendingStatusCode[] = [
  ArchiveVolumeAutoCreatePendingStatusCode.PENDING,
  ArchiveVolumeAutoCreatePendingStatusCode.SUCCEEDED,
  ArchiveVolumeAutoCreatePendingStatusCode.MANUAL_REQUIRED,
]

export const ArchiveVolumeAutoCreatePendingStatusDescription:
  Record<ArchiveVolumeAutoCreatePendingStatusCode, string> = {
  [ArchiveVolumeAutoCreatePendingStatusCode.PENDING]: '待重试',
  [ArchiveVolumeAutoCreatePendingStatusCode.SUCCEEDED]: '已完成',
  [ArchiveVolumeAutoCreatePendingStatusCode.MANUAL_REQUIRED]: '需人工介入',
}
