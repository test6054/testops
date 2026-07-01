<template>
  <UiEmpty v-if="!todos.length" :description="emptyDescription">
    <template v-if="emptyActionLabel" #action>
      <UiButton variant="outline" size="sm" @click="emit('empty-action')">
        {{ emptyActionLabel }}
      </UiButton>
    </template>
  </UiEmpty>
  <ul v-else class="pending-todo-feed">
    <li
      v-for="(todo, index) in todos"
      :key="`${todo.todoType}-${todo.examId}-${index}`"
      class="pending-todo-feed__row"
    >
      <span
        class="pending-todo-feed__dot"
        :class="`pending-todo-feed__dot--${resolveTodoUrgency(todo)}`"
        aria-hidden="true"
      />
      <div class="pending-todo-feed__content">
        <div class="pending-todo-feed__title">{{ todo.label }}</div>
        <div v-if="todoMeta(todo)" class="pending-todo-feed__meta">{{ todoMeta(todo) }}</div>
      </div>
      <UiButton
        variant="outline"
        size="sm"
        class="pending-todo-feed__action"
        @click="emit('navigate', todo.workspacePath, todo.examId)"
      >
        {{ todoActionLabel(todo) }}
      </UiButton>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import type {
  MarkTeacherDashboardPendingTodoItemVO,
  MarkTeacherDashboardTodoTypeCode,
} from '@/apis/mark/teacher-dashboard'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'

defineOptions({ name: 'PendingTodoFeed' })

withDefaults(
  defineProps<{
    todos: MarkTeacherDashboardPendingTodoItemVO[]
    /** 空态说明，默认面向教师待处理语义。 */
    emptyDescription?: string
    /** 空态主操作文案；传入时在空态展示跳转按钮。 */
    emptyActionLabel?: string
  }>(),
  {
    emptyDescription: '当前筛选下暂无待处理事项',
  },
)

const emit = defineEmits<{
  navigate: [routeName: string | undefined, examId: string | undefined]
  'empty-action': []
}>()

type TodoUrgency = 'urgent' | 'normal' | 'info'

const TODO_COUNT_UNIT: Record<MarkTeacherDashboardTodoTypeCode, string> = {
  SCAN_ATTENTION: '份',
  REVIEW_PENDING: '份试卷',
  GRADE_PENDING: '题',
  PROCESSING_OPEN: '项',
  SCORE_UNPUBLISHED: '份',
  CANDIDATE_UNBOUND: '项',
}

function resolveTodoUrgency(todo: MarkTeacherDashboardPendingTodoItemVO): TodoUrgency {
  if (todo.blocking) return 'urgent'
  if (todo.todoType === 'SCAN_ATTENTION' || todo.todoType === 'REVIEW_PENDING') return 'urgent'
  if (todo.todoType === 'SCORE_UNPUBLISHED') return 'info'
  return 'normal'
}

function todoMeta(todo: MarkTeacherDashboardPendingTodoItemVO): string {
  const parts: string[] = []
  if (todo.count > 0) {
    parts.push(`${todo.count.toLocaleString('zh-CN')} ${TODO_COUNT_UNIT[todo.todoType]}`)
  }
  if (todo.examName) parts.push(todo.examName)
  return parts.join(' · ')
}

function todoActionLabel(todo: MarkTeacherDashboardPendingTodoItemVO): string {
  const actionMap: Partial<Record<MarkTeacherDashboardTodoTypeCode, string>> = {
    SCAN_ATTENTION: '查看',
    REVIEW_PENDING: '处理',
    GRADE_PENDING: '处理',
    PROCESSING_OPEN: '查看',
    SCORE_UNPUBLISHED: '发布',
    CANDIDATE_UNBOUND: '处理',
  }
  if (todo.blocking) return '处理'
  return actionMap[todo.todoType] ?? '查看'
}
</script>

<style scoped>
.pending-todo-feed {
  margin: 0;
  padding: 0;
  list-style: none;
}

.pending-todo-feed__row {
  display: flex;
  align-items: center;
  gap: var(--dp-space-3);
  padding: var(--dp-space-3) var(--dp-space-4);
  border-bottom: 1px solid var(--dp-border);
  transition: background var(--dp-duration-fast) ease;
}

.pending-todo-feed__row:last-child {
  border-bottom: none;
}

.pending-todo-feed__row:hover {
  background: var(--dp-gray-50);
}

.pending-todo-feed__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--dp-radius-full);
  flex-shrink: 0;
}

.pending-todo-feed__dot--urgent {
  background: var(--dp-red-500);
}

.pending-todo-feed__dot--normal {
  background: var(--dp-orange-500);
}

.pending-todo-feed__dot--info {
  background: var(--dp-blue-500);
}

.pending-todo-feed__content {
  flex: 1;
  min-width: 0;
}

.pending-todo-feed__title {
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: var(--dp-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-todo-feed__meta {
  margin-top: 1px;
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-todo-feed__action {
  flex-shrink: 0;
}
</style>
