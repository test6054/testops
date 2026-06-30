import type { LocationQuery, RouteLocationRaw } from 'vue-router'
import type { ExamStatusCode } from '@/apis/mark/exam'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { SemesterOptions } from '@/types/enums/semester-enum'

/** 考试列表 Tab 路由 query 键，与 exam-list.vue listTab 一致。 */
export type ExamListTabQueryKey = 'priority' | 'ongoing' | 'all'

/** 考试列表深链 query 合同。 */
export interface ExamListDeepLinkQuery {
  tab?: ExamListTabQueryKey
  academicYear?: string
  semester?: SemesterCode
  status?: ExamStatusCode
}

const EXAM_LIST_TAB_KEYS: ExamListTabQueryKey[] = ['priority', 'ongoing', 'all']

const SEMESTER_CODES = new Set<SemesterCode>(SemesterOptions.map(item => item.value))

const EXAM_STATUS_CODES = new Set<ExamStatusCode>(['ACTIVE', 'CLOSED'])

/** 解析 tab query 为考试列表 Tab 键。 */
export function resolveExamListTabFromQuery(raw: LocationQuery['tab']): ExamListTabQueryKey | null {
  if (typeof raw !== 'string') return null
  if (EXAM_LIST_TAB_KEYS.includes(raw as ExamListTabQueryKey)) {
    return raw as ExamListTabQueryKey
  }
  return null
}

/** 从路由 query 读取考试列表深链参数。 */
export function readExamListDeepLinkQuery(query: LocationQuery): ExamListDeepLinkQuery {
  const result: ExamListDeepLinkQuery = {}
  const tab = resolveExamListTabFromQuery(query.tab)
  if (tab) result.tab = tab
  if (typeof query.academicYear === 'string' && query.academicYear.trim()) {
    result.academicYear = query.academicYear.trim()
  }
  if (typeof query.semester === 'string' && SEMESTER_CODES.has(query.semester as SemesterCode)) {
    result.semester = query.semester as SemesterCode
  }
  if (typeof query.status === 'string' && EXAM_STATUS_CODES.has(query.status as ExamStatusCode)) {
    result.status = query.status as ExamStatusCode
  }
  return result
}

/** 构造考试列表路由，供概览待办等入口深链跳转。 */
export function buildExamListRoute(query: ExamListDeepLinkQuery = {}): RouteLocationRaw {
  const routeQuery: Record<string, string> = {}
  if (query.tab) routeQuery.tab = query.tab
  if (query.academicYear) routeQuery.academicYear = query.academicYear
  if (query.semester) routeQuery.semester = query.semester
  if (query.status) routeQuery.status = query.status
  return { name: 'TeacherExamList', query: routeQuery }
}
