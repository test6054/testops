import type { InjectionKey } from 'vue'
import type {
  ArchiveExamFormCode,
  ArchiveScoreSourceCode,
  ArchiveSecurityLevelCode,
} from '@/apis/mark/archive-volume'
import type { ArchiveVolumeSourceTypeCode } from '@/types/enums/archive-volume-source-type-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { inject } from 'vue'

export type ArchiveVolumeSupplementSectionKey
  = 'archive-create-basic' | 'archive-create-config' | 'archive-create-confirm'

export const ARCHIVE_VOLUME_SUPPLEMENT_SECTION_ORDER: ArchiveVolumeSupplementSectionKey[] = [
  'archive-create-basic',
  'archive-create-config',
  'archive-create-confirm',
]

export interface ArchiveVolumeSupplementBasicForm {
  courseId: string | null
  courseName: string
  archiveTitle: string
  archiveNo: string
  academicYear: string
  semester: SemesterCode
  departmentId: string | null
  departmentName: string
  teachingClassId: string | null
  teachingClassName: string
  relatedExamId: string | null
  relatedExamName: string
}

export interface ArchiveVolumeSupplementConfigForm {
  sourceType: ArchiveVolumeSourceTypeCode
  examForm?: ArchiveExamFormCode
  scoreSource: ArchiveScoreSourceCode
  securityLevel: ArchiveSecurityLevelCode
  retentionYears: number
  permanentRetention: boolean
  responsibleUserId: string | null
  responsibleUserName: string
}

export const archiveVolumeSupplementBasicFormKey: InjectionKey<ArchiveVolumeSupplementBasicForm> = Symbol(
  'archiveVolumeSupplementBasicForm',
)
export const archiveVolumeSupplementConfigFormKey: InjectionKey<ArchiveVolumeSupplementConfigForm> = Symbol(
  'archiveVolumeSupplementConfigForm',
)

export function isArchiveVolumeSupplementSectionKey(
  value: string,
): value is ArchiveVolumeSupplementSectionKey {
  for (const sectionKey of ARCHIVE_VOLUME_SUPPLEMENT_SECTION_ORDER) {
    if (sectionKey === value) {
      return true
    }
  }
  return false
}

function requireInjectedContext<T>(value: T | undefined, errorMessage: string): T {
  if (!value) {
    throw new Error(errorMessage)
  }
  return value
}

export function useInjectedArchiveVolumeSupplementBasicForm(): ArchiveVolumeSupplementBasicForm {
  return requireInjectedContext(
    inject(archiveVolumeSupplementBasicFormKey),
    '补录建卷基本信息表单未注入',
  )
}

export function useInjectedArchiveVolumeSupplementConfigForm(): ArchiveVolumeSupplementConfigForm {
  return requireInjectedContext(
    inject(archiveVolumeSupplementConfigFormKey),
    '补录建卷配置表单未注入',
  )
}
