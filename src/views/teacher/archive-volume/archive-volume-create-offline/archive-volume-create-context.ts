import type { InjectionKey } from 'vue'
import { inject } from 'vue'
import type {
  ArchiveExamFormCode,
  ArchiveScoreSourceCode,
  ArchiveSecurityLevelCode,
} from '@/apis/mark/archive-volume'
import type { SemesterCode } from '@/types/enums/semester-enum'

export type ArchiveVolumeCreateSectionKey =
  'archive-create-basic' | 'archive-create-config' | 'archive-create-confirm'

export const ARCHIVE_VOLUME_CREATE_SECTION_ORDER: ArchiveVolumeCreateSectionKey[] = [
  'archive-create-basic',
  'archive-create-config',
  'archive-create-confirm',
]

/** 卷宗基本信息草稿 */
export interface ArchiveVolumeCreateBasicForm {
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

/** 归档配置草稿：模板套、密级、成绩源与保管策略 */
export interface ArchiveVolumeCreateConfigForm {
  templateSetCode: string | null
  templateSetName: string
  examForm?: ArchiveExamFormCode
  scoreSource: ArchiveScoreSourceCode
  securityLevel: ArchiveSecurityLevelCode
  retentionYears: number
  permanentRetention: boolean
  responsibleUserId: string | null
  responsibleUserName: string
}

export const archiveVolumeCreateBasicFormKey: InjectionKey<ArchiveVolumeCreateBasicForm> = Symbol(
  'archiveVolumeCreateBasicForm',
)
export const archiveVolumeCreateConfigFormKey: InjectionKey<ArchiveVolumeCreateConfigForm> = Symbol(
  'archiveVolumeCreateConfigForm',
)

export function isArchiveVolumeCreateSectionKey(
  value: string,
): value is ArchiveVolumeCreateSectionKey {
  for (const sectionKey of ARCHIVE_VOLUME_CREATE_SECTION_ORDER) {
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

export function useInjectedArchiveVolumeCreateBasicForm(): ArchiveVolumeCreateBasicForm {
  return requireInjectedContext(
    inject(archiveVolumeCreateBasicFormKey),
    '归档建卷基本信息表单未注入',
  )
}

export function useInjectedArchiveVolumeCreateConfigForm(): ArchiveVolumeCreateConfigForm {
  return requireInjectedContext(inject(archiveVolumeCreateConfigFormKey), '归档建卷配置表单未注入')
}
