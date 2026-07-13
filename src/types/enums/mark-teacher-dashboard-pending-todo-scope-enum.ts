/** 教师阅卷概览待办 Tab 范围，与后端 MarkTeacherDashboardPendingTodoScopeEnum 一致。 */
export enum MarkTeacherDashboardPendingTodoScopeCode {
  ALL = 'ALL',
  URGENT = 'URGENT',
  ATTENTION = 'ATTENTION',
}

export const ALL_MARK_TEACHER_DASHBOARD_PENDING_TODO_SCOPE_CODES = [
  MarkTeacherDashboardPendingTodoScopeCode.ALL,
  MarkTeacherDashboardPendingTodoScopeCode.URGENT,
  MarkTeacherDashboardPendingTodoScopeCode.ATTENTION,
] as const

export const MarkTeacherDashboardPendingTodoScopeDescription: Record<
  MarkTeacherDashboardPendingTodoScopeCode,
  string
> = {
  [MarkTeacherDashboardPendingTodoScopeCode.ALL]: '全部',
  [MarkTeacherDashboardPendingTodoScopeCode.URGENT]: '紧急',
  [MarkTeacherDashboardPendingTodoScopeCode.ATTENTION]: '需关注',
}

/** 概览进行中考试默认每页条数。 */
export const MARK_DASHBOARD_ONGOING_EXAM_PAGE_SIZE = 4

/** 概览待处理事项默认每页条数。 */
export const MARK_DASHBOARD_PENDING_TODO_PAGE_SIZE = 5
