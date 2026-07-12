import { strictEnumLabel } from '@/utils/strict-enum'

/** 归档时限法规档位 */
export enum ArchiveDeadlineTierCode {
  FACULTY_WINTER_BREAK = 'FACULTY_WINTER_BREAK',
  DEPARTMENT_JUNE_END = 'DEPARTMENT_JUNE_END',
}

export const ALL_ARCHIVE_DEADLINE_TIER_CODES: readonly ArchiveDeadlineTierCode[] = [
  ArchiveDeadlineTierCode.FACULTY_WINTER_BREAK,
  ArchiveDeadlineTierCode.DEPARTMENT_JUNE_END,
]

export const ArchiveDeadlineTierDescription: Record<ArchiveDeadlineTierCode, string> = {
  [ArchiveDeadlineTierCode.FACULTY_WINTER_BREAK]: '次学年寒假前（1月20日）',
  [ArchiveDeadlineTierCode.DEPARTMENT_JUNE_END]: '次学年6月底',
}

export const ARCHIVE_DEADLINE_TIER_OPTIONS = ALL_ARCHIVE_DEADLINE_TIER_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ArchiveDeadlineTierDescription, value, '归档时限档位'),
}))
