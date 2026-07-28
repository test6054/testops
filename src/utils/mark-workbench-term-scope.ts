import type { AcademicYearSemester } from '@/utils/academic-year'
import {
  STORAGE_MARK_WORKBENCH_TERM_FILTER_PREFIX,
  STORAGE_TENANT_ID,
} from '@/constants/storage-keys'
import {
  ALL_EXAM_STATUS_CODES,
  ExamStatusCode,
} from '@/types/enums/exam-status-enum'
import {
  ALL_SEMESTER_CODES,
  isSemesterCode,
  SemesterCode,
} from '@/types/enums/semester-enum'
import {
  getDefaultAcademicYearAndSemester,
  resolveDefaultDashboardFilter,
} from '@/utils/academic-year'

/**
 * 阅卷工作台学年学期作用域：考试列表与阅卷总览共用。
 * 合同：必填成对、禁止空筛全量、默认当前学期、租户级偏好记忆。
 * 归档历史存档域不得复用本模块的「禁止清空」语义。
 */

export interface MarkWorkbenchTermPreference {
  academicYear: string
  semester: SemesterCode
  /**
   * 考试状态：合法枚举 | null（全部状态）。
   * 缺省字段表示 ACTIVE（首访默认进行中）。
   */
  status?: ExamStatusCode | null
}

export interface MarkWorkbenchTermResolveOptions {
  academicYears?: string[]
  semesters?: SemesterCode[]
}

export interface MarkWorkbenchResolvedTermFilter {
  academicYear: string
  semester: SemesterCode
  status?: ExamStatusCode
}

function preferenceStorageKey(): string | null {
  const tenantId = localStorage.getItem(STORAGE_TENANT_ID)?.trim()
  if (!tenantId) {
    return null
  }
  return `${STORAGE_MARK_WORKBENCH_TERM_FILTER_PREFIX}:${tenantId}`
}

function isExamStatusCode(value: unknown): value is ExamStatusCode {
  return typeof value === 'string' && (ALL_EXAM_STATUS_CODES as readonly string[]).includes(value)
}

/** 读取租户内阅卷工作台学期偏好；非法或缺失返回 null。 */
export function readMarkWorkbenchTermPreference(): MarkWorkbenchTermPreference | null {
  const key = preferenceStorageKey()
  if (!key) {
    return null
  }
  const raw = localStorage.getItem(key)
  if (!raw?.trim()) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Partial<MarkWorkbenchTermPreference>
    const academicYear = typeof parsed.academicYear === 'string' ? parsed.academicYear.trim() : ''
    if (!academicYear || !isSemesterCode(parsed.semester)) {
      return null
    }
    const result: MarkWorkbenchTermPreference = {
      academicYear,
      semester: parsed.semester,
    }
    if (!('status' in parsed)) {
      return result
    }
    if (parsed.status === null) {
      result.status = null
      return result
    }
    if (!isExamStatusCode(parsed.status)) {
      return null
    }
    result.status = parsed.status
    return result
  } catch {
    return null
  }
}

/** 写入租户内阅卷工作台学期偏好；学年学期须成对。 */
export function writeMarkWorkbenchTermPreference(pref: MarkWorkbenchTermPreference): void {
  const key = preferenceStorageKey()
  if (!key) {
    return
  }
  const academicYear = pref.academicYear?.trim()
  if (!academicYear || !isSemesterCode(pref.semester)) {
    return
  }
  const payload: MarkWorkbenchTermPreference = {
    academicYear,
    semester: pref.semester,
  }
  if (pref.status === null) {
    payload.status = null
  } else if (isExamStatusCode(pref.status)) {
    payload.status = pref.status
  }
  localStorage.setItem(key, JSON.stringify(payload))
}

/** 强制当前学年学期（本学期快捷）。 */
export function resolveCurrentWorkbenchTerm(): AcademicYearSemester {
  return getDefaultAcademicYearAndSemester()
}

/**
 * 工作台必填学年学期归一：空学年回退本学期；有学年无学期补当前季节学期。
 * 禁止返回空学年或空学期。
 */
export function normalizeRequiredWorkbenchTerm(
  academicYear?: string | null,
  semester?: SemesterCode | null,
): AcademicYearSemester {
  const year = academicYear?.trim() || ''
  if (!year) {
    return resolveCurrentWorkbenchTerm()
  }
  if (semester === SemesterCode.AUTUMN || semester === SemesterCode.SPRING) {
    return { academicYear: year, semester }
  }
  return {
    academicYear: year,
    semester: getDefaultAcademicYearAndSemester().semester,
  }
}

/** 是否已选中当前日历学期。 */
export function isCurrentWorkbenchTerm(
  academicYear?: string | null,
  semester?: SemesterCode | null,
): boolean {
  const current = resolveCurrentWorkbenchTerm()
  return academicYear === current.academicYear && semester === current.semester
}

/**
 * 解析阅卷工作台初始学年学期状态。
 * 优先级：合法偏好 → 客户端当前学期 → filterOptions 首项。
 */
export function resolveMarkWorkbenchTermFilter(
  options: MarkWorkbenchTermResolveOptions = {},
): MarkWorkbenchResolvedTermFilter {
  const calendar = getDefaultAcademicYearAndSemester()
  const preferred = readMarkWorkbenchTermPreference()
  const years = options.academicYears?.length ? options.academicYears : undefined
  const semesters = options.semesters?.length ? options.semesters : undefined

  let academicYear = preferred?.academicYear ?? calendar.academicYear
  let semester = preferred?.semester ?? calendar.semester

  if (years?.length && !years.includes(academicYear)) {
    const fallback = resolveDefaultDashboardFilter({
      academicYears: years,
      semesters: semesters?.length ? semesters : [...ALL_SEMESTER_CODES],
    })
    academicYear = fallback.academicYear
    semester = fallback.semester
  } else if (semesters?.length && !semesters.includes(semester)) {
    semester = semesters.includes(calendar.semester) ? calendar.semester : semesters[0]
  }

  const normalized = normalizeRequiredWorkbenchTerm(academicYear, semester)
  let status: ExamStatusCode | undefined = ExamStatusCode.ACTIVE
  if (preferred && 'status' in preferred) {
    status = preferred.status === null ? undefined : preferred.status
  }

  return {
    academicYear: normalized.academicYear,
    semester: normalized.semester,
    status,
  }
}
