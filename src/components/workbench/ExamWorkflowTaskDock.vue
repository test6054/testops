<template>
  <div
    v-if="task"
    class="exam-workflow-task-dock"
    role="status"
    aria-live="polite"
    :aria-label="task.title"
  >
    <span class="exam-workflow-task-dock__dot" aria-hidden="true" />
    <div class="exam-workflow-task-dock__body">
      <div class="exam-workflow-task-dock__title-row">
        <span class="exam-workflow-task-dock__title">{{ task.title }}</span>
        <span v-if="task.badge" class="exam-workflow-task-dock__badge">{{ task.badge }}</span>
      </div>
      <p class="exam-workflow-task-dock__description">
        <span>{{ task.description }}</span>
        <span v-if="task.overflowHint" class="exam-workflow-task-dock__overflow">
          {{ task.overflowHint }}
        </span>
      </p>
    </div>
    <div class="exam-workflow-task-dock__actions">
      <UiButton variant="ghost" size="sm" @click="emit('dismiss')">稍后</UiButton>
      <UiButton variant="primary" size="sm" @click="emit('action')">
        {{ task.actionLabel }}
      </UiButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ExamWorkflowTaskDockView } from '@/types/exam-workflow-task-dock'
import UiButton from '@/components/ui-guide/ui/Button.vue'

defineOptions({ name: 'ExamWorkflowTaskDock' })

defineProps<{
  task: ExamWorkflowTaskDockView | null
}>()

const emit = defineEmits<{
  dismiss: []
  action: []
}>()
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.exam-workflow-task-dock {
  position: sticky;
  top: 0;
  z-index: var(--dp-z-sticky);
  display: flex;
  align-items: center;
  gap: var(--dp-space-3);
  padding: var(--dp-space-3) var(--dp-space-4);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-xs);
}

.exam-workflow-task-dock__dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: var(--dp-radius-full);
  background: var(--dp-orange-500);
}

.exam-workflow-task-dock__body {
  flex: 1;
  min-width: 0;
}

.exam-workflow-task-dock__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}

.exam-workflow-task-dock__title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--dp-text-primary);
}

.exam-workflow-task-dock__badge {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--dp-text-secondary);
  font-variant-numeric: tabular-nums;
}

.exam-workflow-task-dock__description {
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.exam-workflow-task-dock__overflow {
  margin-left: var(--dp-space-1);
  color: var(--dp-text-muted);
}

.exam-workflow-task-dock__actions {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--dp-space-2);
}

@media (max-width: bp.$layout-mobile-max) {
  .exam-workflow-task-dock {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .exam-workflow-task-dock__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
