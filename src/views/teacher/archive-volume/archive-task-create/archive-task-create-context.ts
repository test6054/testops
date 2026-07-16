import type { InjectionKey } from 'vue'
import type {
  ArchiveExamFormCode,
  ArchiveScoreSourceCode,
  ArchiveSecurityLevelCode,
} from '@/apis/mark/archive-volume'
import type { ArchiveTaskProvenanceCode } from '@/types/enums/archive-task-provenance-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { inject } from 'vue'

export type ArchiveTaskCreateSectionKey
  = 'archive-task-provenance' | 'archive-task-basic' | 'archive-task-plan' | 'archive-task-confirm'

export const ARCHIVE_TASK_CREATE_SECTION_ORDER: ArchiveTaskCreateSectionKey[] = [
  'archive-task-provenance',
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
  /** 学年起始年（结束年 = 起始年 + 1） */
  academicYearStartYear: number
  semester: SemesterCode
  departmentId: string | null
  departmentName: string
  teachingClassId: string | null
  teachingClassName: string
  relatedExamId: string | null
  relatedExamName: string
}

/** 归档方案草稿：模板套、密级、成绩与保管策略 */
export interface ArchiveTaskCreatePlanForm {
  templateSetCode: string | null
  templateSetName: string
  examForm?: ArchiveExamFormCode
  scoreSource: ArchiveScoreSourceCode
  scoreProofFileId?: string | null
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
  return requireInjectedContext(inject(archiveTaskCreateBasicFormKey), '归档任务基本信息表单未注入')
}

export function useInjectedArchiveTaskCreatePlanForm(): ArchiveTaskCreatePlanForm {
  return requireInjectedContext(inject(archiveTaskCreatePlanFormKey), '归档任务方案表单未注入')
}

export function useInjectedArchiveTaskCreateWizardState(): ArchiveTaskCreateWizardState {
  return requireInjectedContext(inject(archiveTaskCreateWizardStateKey), '归档任务向导状态未注入')
}
