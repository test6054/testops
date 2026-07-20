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
        <UiButton
          variant="outline"
          size="sm"
          class="todo-feed__action"
          @click="emit('navigate', todo.workspacePath, todo.examId)"
        >
          {{ resolveTodoActionLabel(todo) }}
        </UiButton>
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
import { strictEnumLabel } from '@/utils/strict-enum'

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
    return strictEnumLabel(MarkTeacherDashboardTodoTypeDescription, todo.todoType, '教师待办类型')
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
    return strictEnumLabel(MarkTeacherDashboardTodoTypeDescription, todo.todoType, '教师待办类型')
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
  padding: var(--dp-space-3) var(--dp-space-4);
  background: var(--dp-surface);
  min-height: 120px;
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
  align-items: center;
  padding: var(--dp-space-3) var(--dp-space-4);
  border-bottom: 1px solid var(--dp-border);
  transition: background var(--dp-duration-fast) ease;
}

.todo-feed__row:last-child {
  border-bottom: none;
}

.todo-feed__row:hover {
  background: color-mix(in srgb, var(--dp-color-primary) 4%, var(--dp-surface));
}

.todo-feed__dot {
  width: 8px;
  height: 8px;
  margin-top: 0;
  border-radius: var(--dp-radius-full);
  grid-column: 1;
  grid-row: 1;
  align-self: center;
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
  background: var(--dp-color-primary);
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
  color: var(--dp-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-feed__action {
  flex-shrink: 0;
  align-self: center;
  min-width: 72px;
  justify-content: center;
}
</style>
