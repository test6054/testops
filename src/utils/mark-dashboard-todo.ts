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
  if (todo.todoType === 'SCORE_UNPUBLISHED') return 'info'
  if (isAttentionTodo(todo)) return 'attention'
  return 'normal'
}

/** 概览待办区副标题文案。 */
export function buildPendingTodoHint(
  todos: MarkTeacherDashboardPendingTodoItemVO[],
  totals?: MarkDashboardPendingTodoTotals,
): string {
  const total = totals?.pendingTodoRowCount ?? todos.length
  if (total <= 0) return '暂无待处理事项'
  const urgent = totals?.urgentTodoCount ?? countUrgentTodos(todos)
  if (urgent > 0) return `共 ${total} 项待处理，${urgent} 项紧急（含仲裁）`
  const attention = totals?.attentionTodoCount
    ?? todos.filter((todo) => !isUrgentTodo(todo) && isAttentionTodo(todo)).length
  if (attention > 0) return `共 ${total} 项待处理，${attention} 项需关注`
  return `共 ${total} 项待处理`
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

/** 待办行操作按钮：按业务类型精确动词，与高校阅卷主链动作一致。 */
export const MARK_DASHBOARD_TODO_ACTION_LABEL: Record<MarkTeacherDashboardTodoTypeCode, string> = {
  [MarkTeacherDashboardTodoTypeCode.SCAN_ATTENTION]: '查异常',
  [MarkTeacherDashboardTodoTypeCode.PROCESSING_OPEN]: '查进度',
  [MarkTeacherDashboardTodoTypeCode.GRADE_PENDING]: '去评阅',
  [MarkTeacherDashboardTodoTypeCode.REVIEW_PENDING]: '去复核',
  [MarkTeacherDashboardTodoTypeCode.SCORE_UNPUBLISHED]: '去发布',
  [MarkTeacherDashboardTodoTypeCode.CANDIDATE_UNBOUND]: '去绑定',
  [MarkTeacherDashboardTodoTypeCode.ARBITRATION_PENDING]: '去仲裁',
  [MarkTeacherDashboardTodoTypeCode.SPOT_CHECK_PENDING]: '去抽检',
  [MarkTeacherDashboardTodoTypeCode.EXPERIENCE_ASSIST_PENDING]: '去定标',
}

/** 待办行操作按钮文案；阻断项仍按类型语义，不泛化为「处理」。 */
export function resolveTodoActionLabel(todo: MarkTeacherDashboardPendingTodoItemVO): string {
  const todoType = todo.todoType
  if (!ALL_MARK_TEACHER_DASHBOARD_TODO_TYPE_CODES.includes(todoType)) {
    throw new Error(`未知待办类型: ${String(todoType)}`)
  }
  return MARK_DASHBOARD_TODO_ACTION_LABEL[todoType]
}

/** 待办行主标题：以考试名区分同类型多条。 */
export function resolveTodoRowTitle(todo: MarkTeacherDashboardPendingTodoItemVO): string {
  const examName = todo.examName?.trim()
  if (examName) {
    return examName
  }
  return strictEnumLabel(MarkTeacherDashboardTodoTypeDescription, todo.todoType, '教师待办类型')
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
  return strictEnumLabel(MarkTeacherDashboardTodoTypeDescription, todo.todoType, '教师待办类型')
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

export function resolveDefaultPendingTodoTab(
  todos: MarkTeacherDashboardPendingTodoItemVO[],
): MarkDashboardPendingTodoTabKey {
  if (countUrgentTodos(todos) > 0) return 'urgent'
  if (countAttentionTodos(todos) > 0) return 'attention'
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
