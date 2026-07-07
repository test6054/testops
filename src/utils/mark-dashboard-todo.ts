import type { MarkTeacherDashboardPendingTodoItemVO } from '@/apis/mark/teacher-dashboard'
import type { UiSectionTabItem } from '@/components/ui-guide/ui/types'
import {
  MarkTeacherDashboardTodoTypeCode,
  MarkTeacherDashboardTodoTypeDescription
} from '@/types/enums/mark-teacher-dashboard-todo-type-enum'

/** 待办紧急度档位，前后端语义对齐。 */
export type MarkDashboardTodoUrgency = 'urgent' | 'attention' | 'info' | 'normal'

/** 概览待办 Tab 键：按处理优先级分组，避免同屏重复堆叠。 */
export type MarkDashboardPendingTodoTabKey = 'all' | 'urgent' | 'attention'

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
export function buildPendingTodoHint(todos: MarkTeacherDashboardPendingTodoItemVO[]): string {
  if (!todos.length) return '暂无待处理事项'
  const urgent = todos.filter(isUrgentTodo).length
  if (urgent > 0) return `共 ${todos.length} 项待处理，${urgent} 项紧急（含仲裁）`
  const attention = todos.filter(isAttentionTodo).length
  if (attention > 0) return `共 ${todos.length} 项待处理，${attention} 项需关注`
  return `共 ${todos.length} 项待处理`
}

export function countUrgentTodos(todos: MarkTeacherDashboardPendingTodoItemVO[]): number {
  return todos.filter(isUrgentTodo).length
}

export function countAttentionTodos(todos: MarkTeacherDashboardPendingTodoItemVO[]): number {
  return todos.filter(isAttentionTodo).length
}

export function sumTodoCountByType(
  todos: MarkTeacherDashboardPendingTodoItemVO[],
  todoType: MarkTeacherDashboardPendingTodoItemVO['todoType'],
): number {
  return todos
    .filter((todo) => todo.todoType === todoType)
    .reduce((sum, todo) => sum + (todo.count ?? 0), 0)
}

/** 待办行主标题：以考试名区分同类型多条，避免重复 label 像 demo。 */
export function resolveTodoRowTitle(todo: MarkTeacherDashboardPendingTodoItemVO): string {
  const examName = todo.examName?.trim()
  if (examName) return examName
  return MarkTeacherDashboardTodoTypeDescription[todo.todoType]
}

/** 待办行副文案：类型 + 数量 + 阻断标记。 */
export function resolveTodoRowMeta(todo: MarkTeacherDashboardPendingTodoItemVO): string {
  const parts: string[] = [MarkTeacherDashboardTodoTypeDescription[todo.todoType]]
  if (todo.count > 0) {
    parts.push(
      `${todo.count.toLocaleString('zh-CN')} ${MARK_DASHBOARD_TODO_COUNT_UNIT[todo.todoType]}`,
    )
  }
  if (todo.blocking) parts.push('阻断')
  return parts.join(' · ')
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

/** 构建概览待办 Tab 项；计数来自完整待办列表，不用分页推导。 */
export function buildPendingTodoTabItems(
  todos: MarkTeacherDashboardPendingTodoItemVO[],
): UiSectionTabItem[] {
  const urgentCount = countUrgentTodos(todos)
  const attentionOnlyCount = todos.filter(
    (todo) => !isUrgentTodo(todo) && isAttentionTodo(todo),
  ).length
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
      count: todos.length,
    },
  ]
}
