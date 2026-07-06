/** 归档密级 */
export enum ArchiveSecurityLevelCode {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  RESTRICTED = 'RESTRICTED',
  CONFIDENTIAL = 'CONFIDENTIAL',
}

export const ALL_ARCHIVE_SECURITY_LEVEL_CODES: readonly ArchiveSecurityLevelCode[] = [
  ArchiveSecurityLevelCode.PUBLIC,
  ArchiveSecurityLevelCode.INTERNAL,
  ArchiveSecurityLevelCode.RESTRICTED,
  ArchiveSecurityLevelCode.CONFIDENTIAL,
]
export const ArchiveSecurityLevelDescription: Record<ArchiveSecurityLevelCode, string> = {
  [ArchiveSecurityLevelCode.PUBLIC]: '公开',
  [ArchiveSecurityLevelCode.INTERNAL]: '内部',
  [ArchiveSecurityLevelCode.RESTRICTED]: '限制',
  [ArchiveSecurityLevelCode.CONFIDENTIAL]: '机密',
}
