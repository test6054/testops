import type { LocationQuery, RouteLocationRaw } from 'vue-router'
import type { ExamStatusCode } from '@/apis/mark/exam'
import type { ExamWorkbenchPriorityReasonCode } from '@/types/enums/exam-workbench-priority-reason-code-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { ALL_EXAM_STATUS_CODES } from '@/apis/mark/exam'
import { ALL_EXAM_WORKBENCH_PRIORITY_REASON_CODES } from '@/types/enums/exam-workbench-priority-reason-code-enum'
import { readPairedSemesterFromQuery, requireWorkbenchAcademicYearSemester } from '@/utils/academic-year-semester-query'

/** 考试列表 Tab 路由 query 键，与 exam-list.vue listTab 一致。 */
export type ExamListTabQueryKey = 'priority' | 'ongoing' | 'all'

/**
 * 考试列表深链 query 合同。
 * priorityReason 一旦出现，列表命中集合必须以服务端 workbench-page.priorityReasonCode 过滤为唯一真源；
 * 禁止前端本地再滤或静默丢弃非法原因。
 * 学年/学期须成对；status 缺省表示「全部状态」（与概览筛选清空状态对齐）。
 */
export interface ExamListDeepLinkQuery {
  tab?: ExamListTabQueryKey
  academicYear?: string
  semester?: SemesterCode
  status?: ExamStatusCode
  /** 优先推进原因；须与 tab=priority 同传，由服务端分页前过滤。 */
  priorityReason?: ExamWorkbenchPriorityReasonCode
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

/** 解析 tab query 为考试列表 Tab 键；无效返回 null。 */
export function resolveExamListTabFromQuery(raw: LocationQuery['tab']): ExamListTabQueryKey | null {
  return parseExamListTabQueryKey(raw) ?? null
}

/** 解析优先推进原因；非空非法值显式失败，禁止静默丢弃。 */
export function parseExamListPriorityReasonQuery(
  value: unknown,
): ExamWorkbenchPriorityReasonCode | undefined {
  if (value == null || value === '') {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new TypeError('考试列表 priorityReason 合同类型无效')
  }
  const reason = ALL_EXAM_WORKBENCH_PRIORITY_REASON_CODES.find((code) => code === value)
  if (!reason) {
    throw new Error(`未知考试列表优先推进原因：${value}`)
  }
  return reason
}

/** 路由 query 是否携带考试列表深链意图（菜单进入无 query 时为 false）。 */
export function hasExamListDeepLinkQuery(query: LocationQuery): boolean {
  if (parseExamListTabQueryKey(query.tab)) {
    return true
  }
  if (typeof query.academicYear === 'string' && query.academicYear.trim()) {
    return true
  }
  if (typeof query.semester === 'string' && query.semester.trim()) {
    return true
  }
  if (Object.prototype.hasOwnProperty.call(query, 'status')) {
    return true
  }
  if (query.priorityReason != null && query.priorityReason !== '') {
    return true
  }
  return false
}

/** 从路由 query 读取考试列表深链参数。 */
export function readExamListDeepLinkQuery(query: LocationQuery): ExamListDeepLinkQuery {
  const result: ExamListDeepLinkQuery = {}
  const tab = parseExamListTabQueryKey(query.tab)
  if (tab) {
    result.tab = tab
  }
  if (typeof query.academicYear === 'string' && query.academicYear.trim()) {
    result.academicYear = query.academicYear.trim()
  }
  if (typeof query.semester === 'string') {
    result.semester = readPairedSemesterFromQuery(result.academicYear, query.semester)
  }
  if (Object.prototype.hasOwnProperty.call(query, 'status')) {
    const rawStatus = query.status
    if (rawStatus == null || rawStatus === '') {
      // 显式空 status：全部状态
      result.status = undefined
    } else {
      const status = ALL_EXAM_STATUS_CODES.find((code) => code === rawStatus)
      if (!status) {
        throw new Error(`未知考试列表状态深链：${String(rawStatus)}`)
      }
      result.status = status
    }
  }
  const priorityReason = parseExamListPriorityReasonQuery(query.priorityReason)
  if (priorityReason) {
    if (result.tab !== 'priority') {
      throw new Error('priorityReason 仅允许与 tab=priority 同时使用')
    }
    result.priorityReason = priorityReason
  }
  // 学年学期单边出现：读时不成对则丢弃学期，学年保留由页面 ensure 回退本学期
  if (result.academicYear && !result.semester) {
    // keep year only — page will pair with current-season semester or preference
  }
  if (!result.academicYear && result.semester) {
    result.semester = undefined
  }
  return result
}

/**
 * 构造考试列表路由，供概览 KPI 等入口深链跳转。
 * 学年/学期须同时有或同时无；priorityReason 强制 tab=priority。
 */
export function buildExamListRoute(query: ExamListDeepLinkQuery = {}): RouteLocationRaw {
  if (query.priorityReason && query.tab !== 'priority') {
    throw new Error('priorityReason 深链必须使用 tab=priority')
  }
  const academicYear = query.academicYear?.trim() || undefined
  const semester = query.semester
  if ((academicYear && !semester) || (!academicYear && semester)) {
    throw new Error('考试列表深链学年学期须成对')
  }
  const routeQuery: Record<string, string> = {}
  if (query.tab) {
    routeQuery.tab = query.tab
  }
  if (academicYear && semester) {
    routeQuery.academicYear = academicYear
    routeQuery.semester = semester
  }
  if (query.status) {
    routeQuery.status = query.status
  }
  if (query.priorityReason) {
    routeQuery.priorityReason = query.priorityReason
  }
  return { name: 'TeacherExamList', query: routeQuery }
}

/**
 * 从阅卷概览当前筛选构造列表深链（KPI / 查看全部 / 优先推进共用）。
 * status 未选时不写 query，列表侧按「全部状态」同步。
 */
export function buildExamListRouteFromDashboardFilter(
  filter: {
    academicYear?: string
    semester?: SemesterCode
    status?: ExamStatusCode
  },
  extra: Omit<ExamListDeepLinkQuery, 'academicYear' | 'semester' | 'status'> = {},
): RouteLocationRaw {
  const term = requireWorkbenchAcademicYearSemester(filter.academicYear, filter.semester)
  return buildExamListRoute({
    academicYear: term.academicYear,
    semester: term.semester,
    status: filter.status,
    ...extra,
  })
}
