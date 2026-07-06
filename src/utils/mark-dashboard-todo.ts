import type { MarkTeacherDashboardPendingTodoItemVO } from '@/apis/mark/teacher-dashboard'

/** 待办紧急度档位，前后端语义对齐。 */
export type MarkDashboardTodoUrgency = 'urgent' | 'attention' | 'info' | 'normal'

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
