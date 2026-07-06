import type { LocationQuery, RouteLocationRaw } from 'vue-router'
import type { ExamStatusCode } from '@/apis/mark/exam'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { ALL_EXAM_STATUS_CODES } from '@/apis/mark/exam'
import { readPairedSemesterFromQuery } from '@/utils/academic-year-semester-query'

/** 考试列表 Tab 路由 query 键，与 exam-list.vue listTab 一致。 */
export type ExamListTabQueryKey = 'priority' | 'ongoing' | 'all'

/** 考试列表深链 query 合同。 */
export interface ExamListDeepLinkQuery {
  tab?: ExamListTabQueryKey
  academicYear?: string
  semester?: SemesterCode
  status?: ExamStatusCode
}

const ALL_EXAM_LIST_TAB_QUERY_KEYS: readonly ExamListTabQueryKey[] = ['priority', 'ongoing', 'all']

/** 解析 tab query 为考试列表 Tab 键。 */
export function parseExamListTabQueryKey(value: unknown): ExamListTabQueryKey | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  for (const key of ALL_EXAM_LIST_TAB_QUERY_KEYS) {
    if (value === key) {
      return key
    }
  }
  return undefined
}

/** 解析 tab query 为考试列表 Tab 键；无效返回 null（兼容旧调用）。 */
export function resolveExamListTabFromQuery(raw: LocationQuery['tab']): ExamListTabQueryKey | null {
  return parseExamListTabQueryKey(raw) ?? null
}

/** 从路由 query 读取考试列表深链参数。 */
export function readExamListDeepLinkQuery(query: LocationQuery): ExamListDeepLinkQuery {
  const result: ExamListDeepLinkQuery = {}
  const tab = parseExamListTabQueryKey(query.tab)
  if (tab) result.tab = tab
  if (typeof query.academicYear === 'string' && query.academicYear.trim()) {
    result.academicYear = query.academicYear.trim()
  }
  if (typeof query.semester === 'string') {
    result.semester = readPairedSemesterFromQuery(
      result.academicYear,
      query.semester,
    )
  }
  const status = ALL_EXAM_STATUS_CODES.find((code) => code === query.status)
  if (status) {
    result.status = status
  }
  return result
}

/** 构造考试列表路由，供概览待办等入口深链跳转。 */
export function buildExamListRoute(query: ExamListDeepLinkQuery = {}): RouteLocationRaw {
  const routeQuery: Record<string, string> = {}
  if (query.tab) routeQuery.tab = query.tab
  if (query.academicYear) routeQuery.academicYear = query.academicYear
  if (query.academicYear && query.semester) routeQuery.semester = query.semester
  if (query.status) routeQuery.status = query.status
  return { name: 'TeacherExamList', query: routeQuery }
}
