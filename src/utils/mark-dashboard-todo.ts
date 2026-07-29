import type { MarkTeacherDashboardPendingTodoItemVO } from '@/apis/mark/teacher-dashboard'
import type { UiSectionTabItem } from '@/components/ui-guide/ui/types'
import { MarkTeacherDashboardPendingTodoScopeCode } from '@/types/enums/mark-teacher-dashboard-pending-todo-scope-enum'
import {
  ALL_MARK_TEACHER_DASHBOARD_TODO_TYPE_CODES,
  MarkTeacherDashboardTodoTypeCode,
  MarkTeacherDashboardTodoTypeDescription
} from '@/types/enums/mark-teacher-dashboard-todo-type-enum'
import { formatAcademicYearSemester } from '@/types/enums/semester-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

/** 待办紧急度档位，前后端语义对齐。 */
export type MarkDashboardTodoUrgency = 'urgent' | 'attention' | 'info' | 'normal'

/** 概览待办 Tab 键：按处理优先级分组，避免同屏重复堆叠。 */
export type MarkDashboardPendingTodoTabKey = 'all' | 'urgent' | 'attention'

/** 后端 signalMetrics 待办行计数，与 TopN 列表解耦。 */
export interface MarkDashboardPendingTodoTotals {
  pendingTodoRowCount: number
  urgentTodoCount: number
  attentionTodoCount: number
}

/** 待办数量单位，与后端 count 语义一致。 */
export const MARK_DASHBOARD_TODO_COUNT_UNIT: Record<MarkTeacherDashboardTodoTypeCode, string> = {
  [MarkTeacherDashboardTodoTypeCode.SCAN_ATTENTION]: '份',
  [MarkTeacherDashboardTodoTypeCode.REVIEW_PENDING]: '份试卷',
  [MarkTeacherDashboardTodoTypeCode.GRADE_PENDING]: '题',
  [MarkTeacherDashboardTodoTypeCode.PROCESSING_OPEN]: '项',
  [MarkTeacherDashboardTodoTypeCode.SCORE_UNPUBLISHED]: '份',
  [MarkTeacherDashboardTodoTypeCode.SCORE_PENDING_PUBLISH_REVIEW]: '份',
  [MarkTeacherDashboardTodoTypeCode.CANDIDATE_UNBOUND]: '项',
  [MarkTeacherDashboardTodoTypeCode.ARBITRATION_PENDING]: '项',
  [MarkTeacherDashboardTodoTypeCode.SPOT_CHECK_PENDING]: '项',
  [MarkTeacherDashboardTodoTypeCode.EXPERIENCE_ASSIST_PENDING]: '项',
}

const URGENT_TYPES = new Set([
  'SCAN_ATTENTION',
  'REVIEW_PENDING',
  'ARBITRATION_PENDING',
])

const ATTENTION_TYPES = new Set([
  'GRADE_PENDING',
  'PROCESSING_OPEN',
  'SPOT_CHECK_PENDING',
  'EXPERIENCE_ASSIST_PENDING',
  'SCORE_PENDING_PUBLISH_REVIEW',
])

/** 期末周紧急：影响评阅公正或主链，今日应处理。 */
export function isUrgentTodo(todo: MarkTeacherDashboardPendingTodoItemVO): boolean {
  if (todo.blocking) return true
  return URGENT_TYPES.has(todo.todoType)
}

/** 期末周需关注：影响进度但不阻断发布链。 */
export function isAttentionTodo(todo: MarkTeacherDashboardPendingTodoItemVO): boolean {
  return ATTENTION_TYPES.has(todo.todoType)
}

export function resolveTodoUrgency(todo: MarkTeacherDashboardPendingTodoItemVO): MarkDashboardTodoUrgency {
  if (isUrgentTodo(todo)) return 'urgent'
  if (todo.todoType === 'SCORE_UNPUBLISHED' || todo.todoType === 'SCORE_PENDING_PUBLISH_REVIEW') return 'info'
  if (isAttentionTodo(todo)) return 'attention'
  return 'normal'
}

export function countUrgentTodos(todos: MarkTeacherDashboardPendingTodoItemVO[]): number {
  return todos.filter(isUrgentTodo).length
}

export function countAttentionTodos(todos: MarkTeacherDashboardPendingTodoItemVO[]): number {
  return todos.filter(isAttentionTodo).length
}

/** 概览待办面板视觉档位：有紧急项用红底，仅需关注用橙底，其余待办用轻橙底。 */
export type MarkDashboardPendingTodoFocusTone = 'urgent' | 'attention' | 'pending'

export function resolvePendingTodoFocusTone(
  todos: MarkTeacherDashboardPendingTodoItemVO[],
): MarkDashboardPendingTodoFocusTone | null {
  if (!todos.length) {
    return null
  }
  if (countUrgentTodos(todos) > 0) {
    return 'urgent'
  }
  if (countAttentionTodos(todos) > 0) {
    return 'attention'
  }
  return 'pending'
}

export function sumTodoCountByType(
  todos: MarkTeacherDashboardPendingTodoItemVO[],
  todoType: MarkTeacherDashboardPendingTodoItemVO['todoType'],
): number {
  return todos
    .filter((todo) => todo.todoType === todoType)
    .reduce((sum, todo) => sum + (todo.count ?? 0), 0)
}

/** 待办行操作按钮文案；只认后端 enterActionLabel 合同，禁止前端平行动词表。 */
export function resolveTodoActionLabel(todo: MarkTeacherDashboardPendingTodoItemVO): string {
  const todoType = todo.todoType
  if (!ALL_MARK_TEACHER_DASHBOARD_TODO_TYPE_CODES.includes(todoType)) {
    throw new Error(`未知待办类型: ${String(todoType)}`)
  }
  const label = todo.enterActionLabel?.trim()
  if (!label) {
    throw new Error(`待办缺少 enterActionLabel 合同字段: todoType=${todoType}`)
  }
  return label
}

/** 待办行主标题：以考试名区分同类型多条。 */
export function resolveTodoRowTitle(todo: MarkTeacherDashboardPendingTodoItemVO): string {
  const examName = todo.examName?.trim()
  if (examName) {
    return examName
  }
  return formatTodoTypeLabel(todo.todoType, todo.count)
}

/** 待办行任务文案：仅消费后端 label。 */
export function resolveTodoRowLabel(todo: MarkTeacherDashboardPendingTodoItemVO): string {
  const label = todo.label?.trim()
  if (label) {
    return label
  }
  if (todo.count > 0) {
    return `${todo.count.toLocaleString('zh-CN')} ${MARK_DASHBOARD_TODO_COUNT_UNIT[todo.todoType]}`
  }
  return formatTodoTypeLabel(todo.todoType, todo.count)
}

/** 将后端 labelTemplate（含 {n}）渲染为展示文案。 */
export function formatTodoTypeLabel(
  todoType: MarkTeacherDashboardTodoTypeCode,
  count: number | undefined,
): string {
  const template = strictEnumLabel(
    MarkTeacherDashboardTodoTypeDescription,
    todoType,
    '教师待办类型',
  )
  const n = count == null ? 0 : count
  return template.replaceAll('{n}', String(n))
}

/** 待办行考试上下文：标题已有考试名时只展示学年学期，避免编号重复。 */
export function resolveTodoRowContext(todo: MarkTeacherDashboardPendingTodoItemVO): string | undefined {
  const examName = todo.examName?.trim()
  const examNo = todo.examNo?.trim()
  const term = formatAcademicYearSemester(todo.academicYear, todo.semester)
  if (examName) {
    return term || undefined
  }
  const parts: string[] = []
  if (examNo) {
    parts.push(examNo)
  }
  if (term) {
    parts.push(term)
  }
  return parts.length > 0 ? parts.join(' · ') : undefined
}

export function resolvePendingTodoScopeByTab(
  tab: MarkDashboardPendingTodoTabKey,
): MarkTeacherDashboardPendingTodoScopeCode {
  if (tab === 'urgent') return MarkTeacherDashboardPendingTodoScopeCode.URGENT
  if (tab === 'attention') return MarkTeacherDashboardPendingTodoScopeCode.ATTENTION
  return MarkTeacherDashboardPendingTodoScopeCode.ALL
}

/** 将后端待办 scope 还原为概览 Tab；与 resolvePendingTodoScopeByTab 互逆。 */
export function resolvePendingTodoTabByScope(
  scope: MarkTeacherDashboardPendingTodoScopeCode,
): MarkDashboardPendingTodoTabKey {
  if (scope === MarkTeacherDashboardPendingTodoScopeCode.URGENT) return 'urgent'
  if (scope === MarkTeacherDashboardPendingTodoScopeCode.ATTENTION) return 'attention'
  return 'all'
}

/**
 * 首次进入或未选手动 Tab 时的默认档位。
 * 计数优先用 signalMetrics 全量 totals，禁止只用 TopN 列表推断优先级。
 */
export function resolveDefaultPendingTodoTab(
  totals?: MarkDashboardPendingTodoTotals,
  todos: MarkTeacherDashboardPendingTodoItemVO[] = [],
): MarkDashboardPendingTodoTabKey {
  const urgent = totals?.urgentTodoCount ?? countUrgentTodos(todos)
  if (urgent > 0) return 'urgent'
  const attention = totals?.attentionTodoCount
    ?? todos.filter((todo) => !isUrgentTodo(todo) && isAttentionTodo(todo)).length
  if (attention > 0) return 'attention'
  return 'all'
}

export function filterPendingTodosByTab(
  todos: MarkTeacherDashboardPendingTodoItemVO[],
  tab: MarkDashboardPendingTodoTabKey,
): MarkTeacherDashboardPendingTodoItemVO[] {
  if (tab === 'urgent') return todos.filter(isUrgentTodo)
  if (tab === 'attention') {
    return todos.filter((todo) => !isUrgentTodo(todo) && isAttentionTodo(todo))
  }
  return todos
}

/** 构建概览待办 Tab 项；计数优先消费 signalMetrics 全量行数，避免 TopN 与 KPI 漂移。 */
export function buildPendingTodoTabItems(
  todos: MarkTeacherDashboardPendingTodoItemVO[],
  totals?: MarkDashboardPendingTodoTotals,
): UiSectionTabItem[] {
  const urgentCount = totals?.urgentTodoCount ?? countUrgentTodos(todos)
  const attentionOnlyCount = totals?.attentionTodoCount
    ?? todos.filter((todo) => !isUrgentTodo(todo) && isAttentionTodo(todo)).length
  const allCount = totals?.pendingTodoRowCount ?? todos.length
  return [
    {
      key: 'urgent',
      label: '紧急',
      count: urgentCount,
      badgeTone: urgentCount > 0 ? 'red' : 'gray',
      disabled: urgentCount === 0,
      helper: urgentCount > 0 ? '含扫描异常、复核与仲裁等阻断项' : undefined,
    },
    {
      key: 'attention',
      label: '需关注',
      count: attentionOnlyCount,
      badgeTone: attentionOnlyCount > 0 ? 'orange' : 'gray',
      disabled: attentionOnlyCount === 0,
      helper: attentionOnlyCount > 0 ? '影响进度但不阻断发布链' : undefined,
    },
    {
      key: 'all',
      label: '全部',
      count: allCount,
    },
  ]
}
