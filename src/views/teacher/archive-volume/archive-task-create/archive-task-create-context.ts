import type { InjectionKey } from 'vue'
import type {
  ArchiveExamFormCode,
  ArchiveSecurityLevelCode,
} from '@/apis/mark/archive-volume'
import type { ArchiveTaskProvenanceCode } from '@/types/enums/archive-task-provenance-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { inject } from 'vue'

export type ArchiveTaskCreateSectionKey
  = 'archive-task-basic' | 'archive-task-plan' | 'archive-task-confirm'

export const ARCHIVE_TASK_CREATE_SECTION_ORDER: ArchiveTaskCreateSectionKey[] = [
  'archive-task-basic',
  'archive-task-plan',
  'archive-task-confirm',
]

/** 卷宗基本信息草稿 */
export interface ArchiveTaskCreateBasicForm {
  courseId: string | null
  courseName: string
  archiveTitle: string
  archiveNo: string
  /** 学年，如 2024-2025，与考试 academicYear 合同一致 */
  academicYear: string
  semester: SemesterCode
  departmentId: string | null
  departmentName: string
  teachingClassId: string | null
  teachingClassName: string
  relatedExamId: string | null
  relatedExamName: string
}

/** 归档方案草稿：模板套、密级与保管策略（成绩齐备走材料目录） */
export interface ArchiveTaskCreatePlanForm {
  templateSetCode: string | null
  templateSetName: string
  examForm?: ArchiveExamFormCode
  securityLevel: ArchiveSecurityLevelCode
  retentionYears?: number
  permanentRetention: boolean
  responsibleUserId: string | null
  responsibleUserName: string
  archiveDueTimeOverride?: string
}

export interface ArchiveTaskCreateWizardState {
  provenance: ArchiveTaskProvenanceCode | null
}

export const archiveTaskCreateBasicFormKey: InjectionKey<ArchiveTaskCreateBasicForm> = Symbol(
  'archiveTaskCreateBasicForm',
)
export const archiveTaskCreatePlanFormKey: InjectionKey<ArchiveTaskCreatePlanForm> = Symbol(
  'archiveTaskCreatePlanForm',
)
export const archiveTaskCreateWizardStateKey: InjectionKey<ArchiveTaskCreateWizardState> = Symbol(
  'archiveTaskCreateWizardState',
)

export function isArchiveTaskCreateSectionKey(value: string): value is ArchiveTaskCreateSectionKey {
  for (const sectionKey of ARCHIVE_TASK_CREATE_SECTION_ORDER) {
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

export function useInjectedArchiveTaskCreateBasicForm(): ArchiveTaskCreateBasicForm {
  return requireInjectedContext(inject(archiveTaskCreateBasicFormKey), '课程考核袋基本信息表单未注入')
}

export function useInjectedArchiveTaskCreatePlanForm(): ArchiveTaskCreatePlanForm {
  return requireInjectedContext(inject(archiveTaskCreatePlanFormKey), '课程考核袋方案表单未注入')
}

export function useInjectedArchiveTaskCreateWizardState(): ArchiveTaskCreateWizardState {
  return requireInjectedContext(inject(archiveTaskCreateWizardStateKey), '课程考核袋向导状态未注入')
}
