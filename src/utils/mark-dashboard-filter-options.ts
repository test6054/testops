import type { ExamStatusCode } from '@/types/enums/exam-status-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { ALL_EXAM_STATUS_CODES, ExamStatusDescription } from '@/types/enums/exam-status-enum'
import { ALL_SEMESTER_CODES, formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import { generateAcademicYearOptions } from '@/utils/academic-year'

/** 工作台 ContextBar 三筛选项 placeholder 文案 */
export const MARK_DASHBOARD_FILTER_PLACEHOLDERS = {
  academicYear: '选择学年',
  semester: '选择学期',
  status: '选择状态',
} as const

/** 学年下拉：标准窗口 + 后端 DISTINCT 合并，默认选中当前学年由页面初始化负责 */
export function buildMarkDashboardAcademicYearSelectOptions(
  apiYears?: string[],
): Array<{ label: string, value: string }> {
  const windowYears = generateAcademicYearOptions()
  const merged = [...new Set([...windowYears, ...(apiYears ?? [])])].sort().reverse()
  return merged.map((year) => ({ label: year, value: year }))
}

/** 学期下拉：优先后端 filterOptions.semesters，回退 SemesterEnum 全集 */
export function buildMarkDashboardSemesterSelectOptions(
  apiSemesters?: SemesterCode[],
): Array<{ label: string, value: SemesterCode }> {
  const codes = apiSemesters?.length ? apiSemesters : [...ALL_SEMESTER_CODES]
  return codes.map((code) => {
    if (!ALL_SEMESTER_CODES.includes(code)) {
      throw new Error(`未知学期: ${String(code)}`)
    }
    const option = SemesterOptions.find((item) => item.value === code)
    return { label: option?.label ?? formatSemester(code), value: code }
  })
}

/** 状态下拉：优先后端 filterOptions.statuses，回退 ExamStatus 枚举全集 */
export function buildMarkDashboardStatusSelectOptions(
  apiStatuses?: ExamStatusCode[],
): Array<{ label: string, value: ExamStatusCode }> {
  const codes = apiStatuses?.length ? apiStatuses : [...ALL_EXAM_STATUS_CODES]
  return codes.map((code) => {
    if (!ALL_EXAM_STATUS_CODES.includes(code)) {
      throw new Error(`未知考试状态: ${String(code)}`)
    }
    return { label: ExamStatusDescription[code], value: code }
  })
}
