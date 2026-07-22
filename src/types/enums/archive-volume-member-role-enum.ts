import { strictEnumLabel } from '@/utils/strict-enum'

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
  [ArchiveVolumeMemberRoleCode.ORGANIZER]: '组织老师',
  [ArchiveVolumeMemberRoleCode.SCAN_OPERATOR]: '协作老师',
  [ArchiveVolumeMemberRoleCode.CATALOG_EDITOR]: '编目老师',
  [ArchiveVolumeMemberRoleCode.SUBMITTER]: '提交老师',
  [ArchiveVolumeMemberRoleCode.VIEWER]: '只读',
}


export function archiveVolumeMemberRoleLabel(role?: ArchiveVolumeMemberRoleCode | null): string {
  if (!role) {
    return '协作成员'
  }
  return strictEnumLabel(ArchiveVolumeMemberRoleDescription, role, '归档卷协作成员角色')
}
