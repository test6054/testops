/** 归档查阅状态 */
export enum ArchiveAccessStatusCode {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CLOSED = 'CLOSED',
}

export const ALL_ARCHIVE_ACCESS_STATUS_CODES: readonly ArchiveAccessStatusCode[] = [
  ArchiveAccessStatusCode.PENDING,
  ArchiveAccessStatusCode.APPROVED,
  ArchiveAccessStatusCode.REJECTED,
  ArchiveAccessStatusCode.ACTIVE,
  ArchiveAccessStatusCode.EXPIRED,
  ArchiveAccessStatusCode.CLOSED,
]
export const ArchiveAccessStatusDescription: Record<ArchiveAccessStatusCode, string> = {
  [ArchiveAccessStatusCode.PENDING]: '待审批',
  [ArchiveAccessStatusCode.APPROVED]: '已批准',
  [ArchiveAccessStatusCode.REJECTED]: '已驳回',
  [ArchiveAccessStatusCode.ACTIVE]: '生效中',
  [ArchiveAccessStatusCode.EXPIRED]: '已过期',
  [ArchiveAccessStatusCode.CLOSED]: '已关闭',
}
