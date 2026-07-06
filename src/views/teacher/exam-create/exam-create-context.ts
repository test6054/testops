import type { InjectionKey } from 'vue'
import type {
  ExamGradingStrategyCode,
  ExamKindCode,
  ExamRosterScopeModeCode,
  ExamScorePolicyCode,
} from '@/apis/mark/exam'
import type { ExamCandidateVO } from '@/apis/mark/exam-scope'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { inject } from 'vue'

export type ExamScoreCompositionMode = 'EXAM_ONLY' | 'EXAM_WITH_DAILY'

export type ExamCreateSectionKey
  = | 'exam-create-basic'
    | 'exam-create-marking-team'
    | 'exam-create-candidates'
    | 'exam-create-confirm'

export const EXAM_CREATE_SECTION_ORDER: ExamCreateSectionKey[] = [
  'exam-create-basic',
  'exam-create-marking-team',
  'exam-create-candidates',
  'exam-create-confirm',
]

/** 考务草稿：字段对齐 ExamCreateRequest，另含向导表单绑定项。 */
export interface ExamCreateBasicForm {
  courseId: string | null
  courseName: string
  examName: string
  examNo: string
  academicYear: string
  semester: SemesterCode
  examWindow?: [string, string]
  gradingStrategy: ExamGradingStrategyCode
  scoreCompositionMode: ExamScoreCompositionMode
  dailyScoreFull?: number
  /** 是否涉密考试场次 */
  confidential: boolean
  /** 考试性质 */
  examKind: ExamKindCode
  /** 原正考 ID；补考/缓考/重考/重修必填 */
  sourceExamId?: string
  /** 原正考名称（展示用） */
  sourceExamName?: string
  /** 成绩合成策略；提交时按性质推导 */
  scorePolicy?: ExamScorePolicyCode
  remark?: string
}

/** 阅卷队伍草稿：字段对齐 ExamMarkingTeamCreateRequest，另含教师姓名展示。 */
export interface ExamCreateMarkingTeamForm {
  chiefExaminerUserId: string | null
  chiefExaminerNickName: string
  anonymousMode: boolean
  reviewerUserIds: string[]
  reviewerNickNames: string[]
  remark?: string
}

/** 考生范围草稿：scope/classIds 对齐 ExamRosterCreateRequest，candidates 为 preview API 的 ExamCandidateVO。 */
export interface ExamCreateRosterForm {
  scopeMode: ExamRosterScopeModeCode
  classIds: string[]
  /** 参考班级维护上下文院系 ID */
  referenceDepartmentId?: string
  candidates: ExamCandidateVO[]
}

export const examCreateBasicFormKey: InjectionKey<ExamCreateBasicForm> = Symbol('examCreateBasicForm')
export const examCreateMarkingTeamFormKey: InjectionKey<ExamCreateMarkingTeamForm> = Symbol('examCreateMarkingTeamForm')
export const examCreateRosterFormKey: InjectionKey<ExamCreateRosterForm> = Symbol('examCreateRosterForm')

export type { ExamRosterScopeModeCode } from '@/apis/mark/exam'

/** 校验侧栏 sectionId 是否为创建考试步骤键。 */
export function isExamCreateSectionKey(value: string): value is ExamCreateSectionKey {
  for (const sectionKey of EXAM_CREATE_SECTION_ORDER) {
    if (sectionKey === value) {
      return true
    }
  }
  return false
}

function requireInjectedExamCreateContext<T>(value: T | undefined, errorMessage: string): T {
  if (!value) {
    throw new Error(errorMessage)
  }
  return value
}

/** 读取创建考试考务表单；未 provide 时抛错。 */
export function useInjectedExamCreateBasicForm(): ExamCreateBasicForm {
  return requireInjectedExamCreateContext(inject(examCreateBasicFormKey), '创建考试考务表单未注入')
}

/** 读取创建考试阅卷队伍表单；未 provide 时抛错。 */
export function useInjectedExamCreateMarkingTeamForm(): ExamCreateMarkingTeamForm {
  return requireInjectedExamCreateContext(inject(examCreateMarkingTeamFormKey), '创建考试阅卷队伍表单未注入')
}

/** 读取创建考试考生范围表单；未 provide 时抛错。 */
export function useInjectedExamCreateRosterForm(): ExamCreateRosterForm {
  return requireInjectedExamCreateContext(inject(examCreateRosterFormKey), '创建考试考生范围表单未注入')
}
