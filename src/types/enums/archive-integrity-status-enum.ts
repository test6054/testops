/** 归档完整性状态 */
export enum ArchiveIntegrityStatusCode {
  UNKNOWN = 'UNKNOWN',
  CHECKING = 'CHECKING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  WAIVED = 'WAIVED',
}

export const ALL_ARCHIVE_INTEGRITY_STATUS_CODES: readonly ArchiveIntegrityStatusCode[] = [
  ArchiveIntegrityStatusCode.UNKNOWN,
  ArchiveIntegrityStatusCode.CHECKING,
  ArchiveIntegrityStatusCode.PASSED,
  ArchiveIntegrityStatusCode.FAILED,
  ArchiveIntegrityStatusCode.WAIVED,
]
export const ArchiveIntegrityStatusDescription: Record<ArchiveIntegrityStatusCode, string> = {
  [ArchiveIntegrityStatusCode.UNKNOWN]: '未检查',
  [ArchiveIntegrityStatusCode.CHECKING]: '检查中',
  [ArchiveIntegrityStatusCode.PASSED]: '已通过',
  [ArchiveIntegrityStatusCode.FAILED]: '未通过',
  [ArchiveIntegrityStatusCode.WAIVED]: '已授权豁免',
}


