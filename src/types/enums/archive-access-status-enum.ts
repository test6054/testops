/** 归档查阅状态（与后端 ArchiveAccessStatus 五态一致） */
export enum ArchiveAccessStatusCode {
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CLOSED = 'CLOSED',
}

export const ALL_ARCHIVE_ACCESS_STATUS_CODES: readonly ArchiveAccessStatusCode[] = [
  ArchiveAccessStatusCode.PENDING,
  ArchiveAccessStatusCode.REJECTED,
  ArchiveAccessStatusCode.ACTIVE,
  ArchiveAccessStatusCode.EXPIRED,
  ArchiveAccessStatusCode.CLOSED,
]
export const ArchiveAccessStatusDescription: Record<ArchiveAccessStatusCode, string> = {
  [ArchiveAccessStatusCode.PENDING]: '待审批',
  [ArchiveAccessStatusCode.REJECTED]: '已驳回',
  [ArchiveAccessStatusCode.ACTIVE]: '生效中',
  [ArchiveAccessStatusCode.EXPIRED]: '已过期',
  [ArchiveAccessStatusCode.CLOSED]: '已关闭',
}
