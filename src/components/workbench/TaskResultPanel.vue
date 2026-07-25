<template>
  <div class="task-result-panel">
    <header v-if="title || $slots.header" class="task-result-panel__header">
      <slot name="header">
        <h4 class="task-result-panel__title">{{ title }}</h4>
      </slot>
    </header>

    <div v-if="items.length === 0" class="task-result-panel__empty">
      <slot name="empty">
        <span class="task-result-panel__empty-text">{{ emptyText }}</span>
      </slot>
    </div>

    <ul v-else class="task-result-panel__list">
      <li v-for="item in items" :key="item.id" class="task-result-panel__item">
        <button
          type="button"
          class="task-result-panel__item-trigger"
          @click="handleItemClick(item)"
        >
          <div class="task-result-panel__item-main">
            <span class="task-result-panel__item-title">{{ item.title }}</span>
            <span
              class="task-result-panel__item-badge"
              :class="`task-result-panel__item-badge--${item.statusTone}`"
            >{{ item.statusLabel }}</span>
          </div>
          <div v-if="item.description" class="task-result-panel__item-desc">
            {{ item.description }}
          </div>
          <div class="task-result-panel__item-meta">
            <span v-if="item.time" class="task-result-panel__item-time">{{ item.time }}</span>
            <span v-if="item.meta" class="task-result-panel__item-extra">{{ item.meta }}</span>
          </div>
        </button>
        <div v-if="item.actions && item.actions.length" class="task-result-panel__item-actions">
          <button
            v-for="action in item.actions"
            :key="action.key"
            type="button"
            class="task-result-panel__action"
            :class="{ 'task-result-panel__action--danger': action.danger }"
            :disabled="action.disabled"
            @click.stop="handleAction(item, action)"
          >
            {{ action.label }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import type { TaskResultAction, TaskResultItem } from '@/types/workbench'

defineOptions({
  name: 'TaskResultPanel',
})

withDefaults(
  defineProps<{
    title?: string
    items?: TaskResultItem[]
    emptyText?: string
  }>(),
  {
    title: '',
    items: () => [],
    emptyText: '暂无任务结果',
  },
)

const emit = defineEmits<{
  (e: 'item-click', item: TaskResultItem): void
  (e: 'action', actionEvent: { item: TaskResultItem, action: TaskResultAction }): void
}>()

function handleItemClick(item: TaskResultItem) {
  emit('item-click', item)
}

function handleAction(item: TaskResultItem, action: TaskResultAction) {
  emit('action', { item, action })
}
</script>

<style scoped>
.task-result-panel {
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
}

.task-result-panel__header {
  padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px) 0;
}

.task-result-panel__title {
  margin: 0;
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.task-result-panel__empty {
  padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px);
  text-align: center;
}

.task-result-panel__empty-text {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-muted);
}

.task-result-panel__list {
  list-style: none;
  margin: 0;
  padding: var(--dp-space-2, 8px) 0;
}

.task-result-panel__item {
  padding: 0;
}

.task-result-panel__item-trigger {
  display: block;
  width: 100%;
  margin: 0;
  padding: 10px var(--dp-space-4, 16px);
  border: none;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.task-result-panel__item-trigger:hover {
  background: var(--dp-hover-bg);
}

.task-result-panel__item-trigger:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--dp-focus-ring);
}

.task-result-panel__item + .task-result-panel__item {
  border-top: 1px solid var(--dp-border-light);
}

.task-result-panel__item-main {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2, 8px);
}

.task-result-panel__item-title {
  font-size: var(--dp-font-size-sm);
  font-weight: 500;
  color: var(--dp-text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-result-panel__item-badge {
  flex-shrink: 0;
  padding: 1px var(--dp-space-2, 8px);
  font-size: var(--dp-font-size-xxs);
  font-weight: 500;
  border-radius: 10px;
  line-height: 1.6;
}

.task-result-panel__item-badge--green {
  color: var(--dp-green-700);
  background: var(--dp-green-50);
}

.task-result-panel__item-badge--blue {
  color: var(--dp-color-primary-active);
  background: var(--dp-blue-50);
}

.task-result-panel__item-badge--orange {
  color: var(--dp-orange-700);
  background: var(--dp-orange-50);
}

.task-result-panel__item-badge--red {
  color: var(--dp-danger);
  background: var(--dp-error-bg);
}

.task-result-panel__item-badge--gray {
  color: var(--dp-text-secondary);
  background: var(--dp-surface-subtle);
}

.task-result-panel__item-badge--yellow {
  color: var(--dp-yellow-700);
  background: var(--dp-yellow-50);
}

.task-result-panel__item-badge--purple {
  color: var(--dp-purple-700);
  background: var(--dp-purple-50);
}

.task-result-panel__item-desc {
  margin-top: 4px;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
  line-height: 1.5;
}

.task-result-panel__item-meta {
  display: flex;
  gap: var(--dp-space-2, 8px);
  margin-top: 4px;
}

.task-result-panel__item-time,
.task-result-panel__item-extra {
  font-size: var(--dp-font-size-xxs);
  color: var(--dp-text-muted);
}

.task-result-panel__item-actions {
  display: flex;
  gap: var(--dp-space-2, 8px);
  margin-top: 0;
  padding: 0 var(--dp-space-3, 12px) 10px;
}

.task-result-panel__action {
  padding: 2px 10px;
  font-size: var(--dp-font-size-xs);
  font-weight: 500;
  color: var(--dp-color-primary);
  background: transparent;
  border: 1px solid var(--dp-color-primary);
  border-radius: var(--dp-radius-control-inner);
  cursor: pointer;
  transition: all 0.15s ease;
}

.task-result-panel__action:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
}

.task-result-panel__action:hover:not(:disabled) {
  background: var(--dp-color-primary);
  color: var(--dp-text-inverse);
}

.task-result-panel__action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.task-result-panel__action--danger {
  color: var(--dp-danger);
  border-color: var(--dp-danger);
}

.task-result-panel__action--danger:hover:not(:disabled) {
  background: var(--dp-danger);
  color: var(--dp-text-inverse);
}
</style>
