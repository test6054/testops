/** 归档材料排序规则 */
export enum ArchiveMaterialSortRuleCode {
  STUDENT_NO = 'STUDENT_NO',
  STUDENT_NAME = 'STUDENT_NAME',
  CLASS_NAME = 'CLASS_NAME',
  SEAT_NO = 'SEAT_NO',
  MANUAL_SEQUENCE = 'MANUAL_SEQUENCE',
  CATALOG_ORDER = 'CATALOG_ORDER',
}

export const ALL_ARCHIVE_MATERIAL_SORT_RULE_CODES: readonly ArchiveMaterialSortRuleCode[] = [
  ArchiveMaterialSortRuleCode.STUDENT_NO,
  ArchiveMaterialSortRuleCode.STUDENT_NAME,
  ArchiveMaterialSortRuleCode.CLASS_NAME,
  ArchiveMaterialSortRuleCode.SEAT_NO,
  ArchiveMaterialSortRuleCode.MANUAL_SEQUENCE,
  ArchiveMaterialSortRuleCode.CATALOG_ORDER,
]

