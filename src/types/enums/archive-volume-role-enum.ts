/** 归档卷角色 */
export enum ArchiveVolumeRoleCode {
  OWNER = 'OWNER',
  CONTRIBUTOR = 'CONTRIBUTOR',
  REVIEWER = 'REVIEWER',
  READONLY = 'READONLY',
}

export const ALL_ARCHIVE_VOLUME_ROLE_CODES: readonly ArchiveVolumeRoleCode[] = [
  ArchiveVolumeRoleCode.OWNER,
  ArchiveVolumeRoleCode.CONTRIBUTOR,
  ArchiveVolumeRoleCode.REVIEWER,
  ArchiveVolumeRoleCode.READONLY,
]
export const ArchiveVolumeRoleDescription: Record<ArchiveVolumeRoleCode, string> = {
  [ArchiveVolumeRoleCode.OWNER]: '归档责任人',
  [ArchiveVolumeRoleCode.CONTRIBUTOR]: '协作上传人',
  [ArchiveVolumeRoleCode.REVIEWER]: '验收审核',
  [ArchiveVolumeRoleCode.READONLY]: '只读',
}
