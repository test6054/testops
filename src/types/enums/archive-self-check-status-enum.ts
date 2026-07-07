/** 归档自检状态 */
export enum ArchiveSelfCheckStatusCode {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export const ALL_ARCHIVE_SELF_CHECK_STATUS_CODES: readonly ArchiveSelfCheckStatusCode[] = [
  ArchiveSelfCheckStatusCode.NOT_STARTED,
  ArchiveSelfCheckStatusCode.IN_PROGRESS,
  ArchiveSelfCheckStatusCode.COMPLETED,
]
export const ArchiveSelfCheckStatusDescription: Record<ArchiveSelfCheckStatusCode, string> = {
  [ArchiveSelfCheckStatusCode.NOT_STARTED]: '未开始',
  [ArchiveSelfCheckStatusCode.IN_PROGRESS]: '进行中',
  [ArchiveSelfCheckStatusCode.COMPLETED]: '已完成',
}


