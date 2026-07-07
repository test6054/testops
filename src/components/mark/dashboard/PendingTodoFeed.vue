<template>
  <div class="pending-todo-feed">
    <div v-if="!todos.length" class="pending-todo-feed__empty">
      <UiEmpty size="sm" :description="emptyDescription">
        <template v-if="emptyActionLabel" #action>
          <UiButton variant="outline" size="sm" @click="emit('empty-action')">
            {{ emptyActionLabel }}
          </UiButton>
        </template>
      </UiEmpty>
    </div>
    <ul v-else class="todo-feed">
      <li
        v-for="(todo, index) in todos"
        :key="`${todo.todoType}-${todo.examId}-${index}`"
        class="todo-feed__row"
      >
        <span
          class="todo-feed__dot"
          :class="`todo-feed__dot--${resolveTodoUrgency(todo)}`"
          aria-hidden="true"
        />
        <div class="todo-feed__content">
          <div class="todo-feed__title">{{ resolveRowTitle(todo) }}</div>
          <div class="todo-feed__meta">{{ resolveRowMeta(todo) }}</div>
        </div>
        <UiButton
          :variant="resolveTodoUrgency(todo) === 'urgent' ? 'primary' : 'outline'"
          size="sm"
          class="todo-feed__action"
          @click="emit('navigate', todo.workspacePath, todo.examId)"
        >
          {{ todoActionLabel(todo) }}
        </UiButton>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import type {
  MarkTeacherDashboardPendingTodoItemVO,
  MarkTeacherDashboardTodoTypeCode,
} from '@/apis/mark/teacher-dashboard'
import { MarkTeacherDashboardTodoTypeDescription } from '@/apis/mark/teacher-dashboard'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import {
  MARK_DASHBOARD_TODO_COUNT_UNIT,
  resolveTodoRowMeta,
  resolveTodoRowTitle,
  resolveTodoUrgency,
} from '@/utils/mark-dashboard-todo'

defineOptions({ name: 'PendingTodoFeed' })

const props = withDefaults(
  defineProps<{
    todos: MarkTeacherDashboardPendingTodoItemVO[]
    titleSource?: 'exam' | 'todo-type'
    emptyDescription?: string
    emptyActionLabel?: string
  }>(),
  {
    titleSource: 'exam',
    emptyDescription: '当前筛选下暂无待处理事项',
  },
)

const emit = defineEmits<{
  "navigate": [routeName: string | undefined, examId: string | undefined]
  'empty-action': []
}>()

function resolveRowTitle(todo: MarkTeacherDashboardPendingTodoItemVO): string {
  if (props.titleSource === 'todo-type') {
    return MarkTeacherDashboardTodoTypeDescription[todo.todoType]
  }
  return resolveTodoRowTitle(todo)
}

function resolveRowMeta(todo: MarkTeacherDashboardPendingTodoItemVO): string {
  if (props.titleSource !== 'todo-type') {
    return resolveTodoRowMeta(todo)
  }
  const parts: string[] = []
  if (todo.count > 0) {
    parts.push(
      `${todo.count.toLocaleString('zh-CN')} ${MARK_DASHBOARD_TODO_COUNT_UNIT[todo.todoType]}`,
    )
  }
  if (todo.blocking) {
    parts.push('阻断')
  }
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
    ARBITRATION_PENDING: '审核',
    SPOT_CHECK_PENDING: '处理',
    EXPERIENCE_ASSIST_PENDING: '定标',
  }
  if (todo.blocking) return '处理'
  return actionMap[todo.todoType] ?? '查看'
}
</script>

<style scoped>
.pending-todo-feed {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pending-todo-feed__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--dp-space-6) var(--dp-space-4);
  background: var(--dp-surface);
  min-height: 200px;
}
</style>
