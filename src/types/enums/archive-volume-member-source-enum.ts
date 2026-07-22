import { strictEnumLabel } from '@/utils/strict-enum'

/** 归档卷协作成员来源 */
export enum ArchiveVolumeMemberSourceCode {
  MANUAL = 'MANUAL',
  RESPONSIBLE = 'RESPONSIBLE',
  CREATE_USER_FALLBACK = 'CREATE_USER_FALLBACK',
  AUTO_EXAM_REVIEWER = 'AUTO_EXAM_REVIEWER',
  AUTO_COURSE_TEACHER = 'AUTO_COURSE_TEACHER',
}

export const ALL_ARCHIVE_VOLUME_MEMBER_SOURCE_CODES: readonly ArchiveVolumeMemberSourceCode[] = [
  ArchiveVolumeMemberSourceCode.MANUAL,
  ArchiveVolumeMemberSourceCode.RESPONSIBLE,
  ArchiveVolumeMemberSourceCode.CREATE_USER_FALLBACK,
  ArchiveVolumeMemberSourceCode.AUTO_EXAM_REVIEWER,
  ArchiveVolumeMemberSourceCode.AUTO_COURSE_TEACHER,
]

export const ArchiveVolumeMemberSourceDescription: Record<ArchiveVolumeMemberSourceCode, string> = {
  [ArchiveVolumeMemberSourceCode.MANUAL]: '组织老师手动添加',
  [ArchiveVolumeMemberSourceCode.RESPONSIBLE]: '建卷指定组织老师',
  [ArchiveVolumeMemberSourceCode.CREATE_USER_FALLBACK]: '建卷人兜底',
  [ArchiveVolumeMemberSourceCode.AUTO_EXAM_REVIEWER]: '策略自动播种阅卷组',
  [ArchiveVolumeMemberSourceCode.AUTO_COURSE_TEACHER]: '策略自动播种任课教师',
}

export function archiveVolumeMemberSourceLabel(
  source?: ArchiveVolumeMemberSourceCode | null,
): string {
  if (!source) {
    return '—'
  }
  return strictEnumLabel(ArchiveVolumeMemberSourceDescription, source, '归档卷协作成员来源')
}
