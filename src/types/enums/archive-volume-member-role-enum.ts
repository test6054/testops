/** 归档卷协作成员角色 */
export enum ArchiveVolumeMemberRoleCode {
  ORGANIZER = 'ORGANIZER',
  SCAN_OPERATOR = 'SCAN_OPERATOR',
  CATALOG_EDITOR = 'CATALOG_EDITOR',
  SUBMITTER = 'SUBMITTER',
  VIEWER = 'VIEWER',
}

export const ALL_ARCHIVE_VOLUME_MEMBER_ROLE_CODES: readonly ArchiveVolumeMemberRoleCode[] = [
  ArchiveVolumeMemberRoleCode.ORGANIZER,
  ArchiveVolumeMemberRoleCode.SCAN_OPERATOR,
  ArchiveVolumeMemberRoleCode.CATALOG_EDITOR,
  ArchiveVolumeMemberRoleCode.SUBMITTER,
  ArchiveVolumeMemberRoleCode.VIEWER,
]

export const ArchiveVolumeMemberRoleDescription: Record<ArchiveVolumeMemberRoleCode, string> = {
  [ArchiveVolumeMemberRoleCode.ORGANIZER]: '归档责任人（任课教师）',
  [ArchiveVolumeMemberRoleCode.SCAN_OPERATOR]: '协作老师',
  [ArchiveVolumeMemberRoleCode.CATALOG_EDITOR]: '编目老师',
  [ArchiveVolumeMemberRoleCode.SUBMITTER]: '提交老师',
  [ArchiveVolumeMemberRoleCode.VIEWER]: '只读',
}

export function isArchiveVolumeMemberRoleCode(value: string): value is ArchiveVolumeMemberRoleCode {
  return (ALL_ARCHIVE_VOLUME_MEMBER_ROLE_CODES as string[]).includes(value)
}

export function archiveVolumeMemberRoleLabel(role?: ArchiveVolumeMemberRoleCode | string | null): string {
  if (!role || !isArchiveVolumeMemberRoleCode(role)) {
    return '协作成员'
  }
  return ArchiveVolumeMemberRoleDescription[role]
}
