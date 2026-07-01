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
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
}

.task-result-panel__header {
  padding: 12px 16px 0;
}

.task-result-panel__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
}

.task-result-panel__empty {
  padding: 32px 16px;
  text-align: center;
}

.task-result-panel__empty-text {
  font-size: 13px;
  color: var(--dp-text-muted, #94a3b8);
}

.task-result-panel__list {
  list-style: none;
  margin: 0;
  padding: 8px 0;
}

.task-result-panel__item {
  padding: 0;
}

.task-result-panel__item-trigger {
  display: block;
  width: 100%;
  margin: 0;
  padding: 10px 16px;
  border: none;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.task-result-panel__item-trigger:hover {
  background: var(--dp-hover-bg, #f8fafc);
}

.task-result-panel__item-trigger:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--dp-focus-ring, rgba(22, 119, 255, 0.18));
}

.task-result-panel__item + .task-result-panel__item {
  border-top: 1px solid var(--dp-border-light, #f1f5f9);
}

.task-result-panel__item-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-result-panel__item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--dp-text-primary, #0f172a);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-result-panel__item-badge {
  flex-shrink: 0;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 10px;
  line-height: 1.6;
}

.task-result-panel__item-badge--green {
  color: #15803d;
  background: #f0fdf4;
}

.task-result-panel__item-badge--blue {
  color: #1d4ed8;
  background: #eff6ff;
}

.task-result-panel__item-badge--orange {
  color: #c2410c;
  background: #fff7ed;
}

.task-result-panel__item-badge--red {
  color: #b91c1c;
  background: #fef2f2;
}

.task-result-panel__item-badge--gray {
  color: #475569;
  background: #f1f5f9;
}

.task-result-panel__item-badge--yellow {
  color: #a16207;
  background: #fefce8;
}

.task-result-panel__item-badge--purple {
  color: #6d28d9;
  background: #f5f3ff;
}

.task-result-panel__item-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--dp-text-secondary, #475569);
  line-height: 1.5;
}

.task-result-panel__item-meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.task-result-panel__item-time,
.task-result-panel__item-extra {
  font-size: 11px;
  color: var(--dp-text-muted, #94a3b8);
}

.task-result-panel__item-actions {
  display: flex;
  gap: 8px;
  margin-top: 0;
  padding: 0 16px 10px;
}

.task-result-panel__action {
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--ant-color-primary, #2563eb);
  background: transparent;
  border: 1px solid var(--ant-color-primary, #2563eb);
  border-radius: var(--dp-radius-control-inner, 4px);
  cursor: pointer;
  transition: all 0.15s ease;
}

.task-result-panel__action:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dp-focus-ring, rgba(22, 119, 255, 0.18));
}

.task-result-panel__action:hover:not(:disabled) {
  background: var(--ant-color-primary, #2563eb);
  color: #fff;
}

.task-result-panel__action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.task-result-panel__action--danger {
  color: var(--ant-color-error, #dc2626);
  border-color: var(--ant-color-error, #dc2626);
}

.task-result-panel__action--danger:hover:not(:disabled) {
  background: var(--ant-color-error, #dc2626);
  color: #fff;
}
</style>
