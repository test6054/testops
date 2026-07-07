/** 归档卷提交清单阻塞项维度 - 与 edu-mark ArchiveVolumeSubmitChecklistItemResponse.dimension 对齐 */
export enum ArchiveVolumeSubmitChecklistDimensionCode {
  INTEGRITY = 'INTEGRITY',
  FOUR_PROPERTY = 'FOUR_PROPERTY',
  FOUR_PROPERTY_SECURITY = 'FOUR_PROPERTY_SECURITY',
  REMEDIATION = 'REMEDIATION',
  SCORE = 'SCORE',
  CATALOG_NOT_READY = 'CATALOG_NOT_READY',
  CATALOG = 'CATALOG',
  SELF_CHECK_PENDING = 'SELF_CHECK_PENDING',
  SELF_CHECK = 'SELF_CHECK',
  SELF_CHECK_FORM = 'SELF_CHECK_FORM',
  SIGN_OFF = 'SIGN_OFF',
}

export const ALL_ARCHIVE_VOLUME_SUBMIT_CHECKLIST_DIMENSION_CODES: readonly ArchiveVolumeSubmitChecklistDimensionCode[] = [
  ArchiveVolumeSubmitChecklistDimensionCode.INTEGRITY,
  ArchiveVolumeSubmitChecklistDimensionCode.FOUR_PROPERTY,
  ArchiveVolumeSubmitChecklistDimensionCode.FOUR_PROPERTY_SECURITY,
  ArchiveVolumeSubmitChecklistDimensionCode.REMEDIATION,
  ArchiveVolumeSubmitChecklistDimensionCode.SCORE,
  ArchiveVolumeSubmitChecklistDimensionCode.CATALOG_NOT_READY,
  ArchiveVolumeSubmitChecklistDimensionCode.CATALOG,
  ArchiveVolumeSubmitChecklistDimensionCode.SELF_CHECK_PENDING,
  ArchiveVolumeSubmitChecklistDimensionCode.SELF_CHECK,
  ArchiveVolumeSubmitChecklistDimensionCode.SELF_CHECK_FORM,
  ArchiveVolumeSubmitChecklistDimensionCode.SIGN_OFF,
]

export const ArchiveVolumeSubmitChecklistDimensionDescription: Record<ArchiveVolumeSubmitChecklistDimensionCode, string> = {
  [ArchiveVolumeSubmitChecklistDimensionCode.INTEGRITY]: '完整性',
  [ArchiveVolumeSubmitChecklistDimensionCode.FOUR_PROPERTY]: '四性检测',
  [ArchiveVolumeSubmitChecklistDimensionCode.FOUR_PROPERTY_SECURITY]: '四性安全性',
  [ArchiveVolumeSubmitChecklistDimensionCode.REMEDIATION]: '整改',
  [ArchiveVolumeSubmitChecklistDimensionCode.SCORE]: '成绩证明',
  [ArchiveVolumeSubmitChecklistDimensionCode.CATALOG_NOT_READY]: '归档目录',
  [ArchiveVolumeSubmitChecklistDimensionCode.CATALOG]: '归档目录',
  [ArchiveVolumeSubmitChecklistDimensionCode.SELF_CHECK_PENDING]: '逐项自查',
  [ArchiveVolumeSubmitChecklistDimensionCode.SELF_CHECK]: '自查',
  [ArchiveVolumeSubmitChecklistDimensionCode.SELF_CHECK_FORM]: '自查表',
  [ArchiveVolumeSubmitChecklistDimensionCode.SIGN_OFF]: '签字确认',
}
