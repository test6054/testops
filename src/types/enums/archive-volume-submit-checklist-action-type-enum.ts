/** 归档卷提交检查清单动作类型 */
export enum ArchiveVolumeSubmitChecklistActionTypeCode {
  OPEN_TAB = 'OPEN_TAB',
  RUN_CHECK = 'RUN_CHECK',
  OPEN_CATALOG = 'OPEN_CATALOG',
  OPEN_SELF_CHECK = 'OPEN_SELF_CHECK',
  OPEN_EXAM_WORKSPACE = 'OPEN_EXAM_WORKSPACE',
}

export const ALL_ARCHIVE_VOLUME_SUBMIT_CHECKLIST_ACTION_TYPE_CODES: readonly ArchiveVolumeSubmitChecklistActionTypeCode[] = [
  ArchiveVolumeSubmitChecklistActionTypeCode.OPEN_TAB,
  ArchiveVolumeSubmitChecklistActionTypeCode.RUN_CHECK,
  ArchiveVolumeSubmitChecklistActionTypeCode.OPEN_CATALOG,
  ArchiveVolumeSubmitChecklistActionTypeCode.OPEN_SELF_CHECK,
  ArchiveVolumeSubmitChecklistActionTypeCode.OPEN_EXAM_WORKSPACE,
]

