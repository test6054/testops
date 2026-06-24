<template>
  <UiEmpty v-if="!todos.length" description="暂无待办" />
  <ul v-else class="pending-todo-feed">
    <li v-for="(todo, index) in todos" :key="`${todo.todoType}-${todo.examId}-${index}`">
      <button
        type="button"
        class="pending-todo-feed__item"
        @click="emit('navigate', todo.workspacePath, todo.examId)"
      >
        <span class="pending-todo-feed__icon" aria-hidden="true">待</span>
        <span class="pending-todo-feed__label">{{ todo.label }}</span>
        <span v-if="todo.examName" class="pending-todo-feed__exam">{{ todo.examName }}</span>
        <UiTag v-if="todo.blocking" tone="red" size="sm">阻断</UiTag>
        <span v-else-if="todo.count > 1" class="pending-todo-feed__count">×{{ todo.count }}</span>
      </button>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import type { MarkTeacherDashboardPendingTodoItemVO } from '@/apis/mark/teacher-dashboard'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'

defineOptions({ name: 'PendingTodoFeed' })

defineProps<{
  todos: MarkTeacherDashboardPendingTodoItemVO[]
}>()

const emit = defineEmits<{
  navigate: [routeName: string | undefined, examId: string | undefined]
}>()
</script>

<style scoped>
.pending-todo-feed {
  margin: 0;
  padding: 0;
  list-style: none;
}

.pending-todo-feed__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 0;
  border: none;
  border-bottom: 1px solid var(--ant-color-border-secondary);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.pending-todo-feed__item:hover .pending-todo-feed__label {
  color: var(--ant-color-primary);
}

.pending-todo-feed__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: var(--ant-color-primary-bg);
  color: var(--ant-color-primary);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.pending-todo-feed__label {
  flex: 1;
  min-width: 0;
  font-size: 14px;
}

.pending-todo-feed__exam {
  flex-shrink: 0;
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}

.pending-todo-feed__count {
  font-size: 12px;
  color: var(--ant-color-text-secondary);
  font-variant-numeric: tabular-nums;
}
</style>
