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
        <div class="todo-feed__body">
          <div class="todo-feed__title">{{ resolveRowTitle(todo) }}</div>
          <div class="todo-feed__meta">
            <span class="todo-feed__label">{{ resolveRowLabel(todo) }}</span>
            <UiTag v-if="todo.blocking" tone="red" size="sm">阻断</UiTag>
          </div>
          <div v-if="resolveRowContext(todo)" class="todo-feed__context">
            {{ resolveRowContext(todo) }}
          </div>
        </div>
        <button
          type="button"
          class="todo-feed__action-link"
          @click="emit('navigate', todo.workspacePath, todo.examId)"
        >
          {{ resolveTodoActionLabel(todo) }}
        </button>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import type { MarkTeacherDashboardPendingTodoItemVO } from '@/apis/mark/teacher-dashboard'
import { MarkTeacherDashboardTodoTypeDescription } from '@/apis/mark/teacher-dashboard'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import {
  MARK_DASHBOARD_TODO_COUNT_UNIT,
  resolveTodoActionLabel,
  resolveTodoRowContext,
  resolveTodoRowLabel,
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
  navigate: [routeName: string | undefined, examId: string | undefined]
  'empty-action': []
}>()

function resolveRowTitle(todo: MarkTeacherDashboardPendingTodoItemVO): string {
  if (props.titleSource === 'todo-type') {
    return MarkTeacherDashboardTodoTypeDescription[todo.todoType]
  }
  return resolveTodoRowTitle(todo)
}

function resolveRowLabel(todo: MarkTeacherDashboardPendingTodoItemVO): string {
  if (props.titleSource === 'todo-type') {
    const label = todo.label?.trim()
    if (label) {
      return label
    }
    if (todo.count > 0) {
      return `${todo.count.toLocaleString('zh-CN')} ${MARK_DASHBOARD_TODO_COUNT_UNIT[todo.todoType]}`
    }
    return MarkTeacherDashboardTodoTypeDescription[todo.todoType]
  }
  return resolveTodoRowLabel(todo)
}

function resolveRowContext(todo: MarkTeacherDashboardPendingTodoItemVO): string | undefined {
  if (props.titleSource === 'todo-type') {
    return undefined
  }
  return resolveTodoRowContext(todo)
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

.todo-feed {
  margin: 0;
  padding: 0;
  list-style: none;
}

.todo-feed__row {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  column-gap: var(--dp-space-2);
  align-items: start;
  padding: var(--dp-space-3) var(--dp-space-4);
  border-bottom: 1px solid var(--dp-border);
  transition: background var(--dp-duration-fast) ease;
}

.todo-feed__row:last-child {
  border-bottom: none;
}

.todo-feed__row:hover {
  background: var(--dp-gray-50);
}

.todo-feed__dot {
  width: 8px;
  height: 8px;
  margin-top: 7px;
  border-radius: var(--dp-radius-full);
  grid-column: 1;
  grid-row: 1;
}

.todo-feed__dot--urgent {
  background: var(--dp-red-500);
}

.todo-feed__dot--attention {
  background: var(--dp-orange-500);
}

.todo-feed__dot--normal {
  background: var(--dp-gray-400);
}

.todo-feed__dot--info {
  background: var(--ant-color-primary);
}

.todo-feed__body {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
}

.todo-feed__title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--dp-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-feed__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-1);
  margin-top: var(--dp-space-1);
}

.todo-feed__label {
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.todo-feed__context {
  margin-top: var(--dp-space-1);
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-feed__action-link {
  grid-column: 3;
  grid-row: 1;
  align-self: start;
  margin-top: 1px;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--ant-color-primary);
  white-space: nowrap;
  cursor: pointer;
  transition: color var(--dp-duration-fast) ease;
}

.todo-feed__action-link:hover {
  color: var(--dp-blue-600);
}

.todo-feed__action-link:focus-visible {
  outline: 2px solid var(--dp-focus-ring);
  outline-offset: 2px;
  border-radius: var(--dp-radius-control);
}
</style>
