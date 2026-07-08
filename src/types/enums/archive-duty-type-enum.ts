/** 归档职责类型 */
export enum ArchiveDutyTypeCode {
  VOLUME_OWNER = 'VOLUME_OWNER',
  CONTRIBUTOR = 'CONTRIBUTOR',
  COLLEGE_COORDINATOR = 'COLLEGE_COORDINATOR',
  TRANSFER_REVIEWER = 'TRANSFER_REVIEWER',
  ARCHIVE_ADMIN = 'ARCHIVE_ADMIN',
  DESTRUCTION_APPROVER = 'DESTRUCTION_APPROVER',
  SUPERVISION_INSPECTOR = 'SUPERVISION_INSPECTOR',
  DEPARTMENT_ARCHIVIST = 'DEPARTMENT_ARCHIVIST',
}

export const ALL_ARCHIVE_DUTY_TYPE_CODES: readonly ArchiveDutyTypeCode[] = [
  ArchiveDutyTypeCode.VOLUME_OWNER,
  ArchiveDutyTypeCode.CONTRIBUTOR,
  ArchiveDutyTypeCode.COLLEGE_COORDINATOR,
  ArchiveDutyTypeCode.TRANSFER_REVIEWER,
  ArchiveDutyTypeCode.ARCHIVE_ADMIN,
  ArchiveDutyTypeCode.DESTRUCTION_APPROVER,
  ArchiveDutyTypeCode.SUPERVISION_INSPECTOR,
  ArchiveDutyTypeCode.DEPARTMENT_ARCHIVIST,
]

export const ArchiveDutyTypeDescription: Record<ArchiveDutyTypeCode, string> = {
  [ArchiveDutyTypeCode.VOLUME_OWNER]: '卷归属人',
  [ArchiveDutyTypeCode.CONTRIBUTOR]: '任课教师协作',
  [ArchiveDutyTypeCode.COLLEGE_COORDINATOR]: '学院协调',
  [ArchiveDutyTypeCode.TRANSFER_REVIEWER]: '移交验收',
  [ArchiveDutyTypeCode.ARCHIVE_ADMIN]: '档案管理',
  [ArchiveDutyTypeCode.DESTRUCTION_APPROVER]: '销毁审批',
  [ArchiveDutyTypeCode.SUPERVISION_INSPECTOR]: '督导抽查',
  [ArchiveDutyTypeCode.DEPARTMENT_ARCHIVIST]: '部门档案员',
}
