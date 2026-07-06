/** 归档卷签核角色 */
export enum ArchiveVolumeSignOffRoleCode {
  PROPOSER = 'PROPOSER',
  REVIEWER = 'REVIEWER',
  GRADER = 'GRADER',
  SCORER = 'SCORER',
  RECHECKER = 'RECHECKER',
}

export const ALL_ARCHIVE_VOLUME_SIGN_OFF_ROLE_CODES: readonly ArchiveVolumeSignOffRoleCode[] = [
  ArchiveVolumeSignOffRoleCode.PROPOSER,
  ArchiveVolumeSignOffRoleCode.REVIEWER,
  ArchiveVolumeSignOffRoleCode.GRADER,
  ArchiveVolumeSignOffRoleCode.SCORER,
  ArchiveVolumeSignOffRoleCode.RECHECKER,
]

