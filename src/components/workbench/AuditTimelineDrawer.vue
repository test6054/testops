<template>
  <UiDrawer
    :open="open"
    :title="title"
    :width="width"
    hide-footer
    @update:open="handleOpenChange"
    @close="handleClose"
  >
    <div v-if="loading" class="audit-timeline__loading">
      <UiSpin />
    </div>

    <div v-else-if="events.length === 0" class="audit-timeline__empty">
      <span class="audit-timeline__empty-text">{{ emptyText }}</span>
    </div>

    <ul v-else class="audit-timeline__list">
      <li v-for="event in events" :key="event.id" class="audit-timeline__item">
        <div class="audit-timeline__dot" />
        <div class="audit-timeline__content">
          <div class="audit-timeline__header">
            <span class="audit-timeline__operation">{{ event.operationLabel }}</span>
            <span v-if="event.time" class="audit-timeline__time">{{ event.time }}</span>
          </div>
          <div v-if="event.operatorName" class="audit-timeline__operator">
            <span>{{ event.operatorName }}</span>
            <span v-if="event.operatorRole" class="audit-timeline__role">{{
              event.operatorRole
            }}</span>
          </div>
          <div v-if="event.targetType || event.targetId" class="audit-timeline__target">
            <span v-if="event.targetType" class="audit-timeline__target-type">{{
              event.targetType
            }}</span>
            <span v-if="event.targetId" class="audit-timeline__target-id">{{
              event.targetId
            }}</span>
          </div>
          <div v-if="event.reason" class="audit-timeline__reason">
            {{ event.reason }}
          </div>
        </div>
      </li>
    </ul>
  </UiDrawer>
</template>

<script lang="ts" setup>
import type { AuditTimelineEvent } from '@/types/workbench'

import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'

defineOptions({
  name: 'AuditTimelineDrawer',
})

withDefaults(
  defineProps<{
    open: boolean
    title?: string
    width?: number | string
    events?: AuditTimelineEvent[]
    loading?: boolean
    emptyText?: string
  }>(),
  {
    title: '操作审计记录',
    width: 560,
    events: () => [],
    loading: false,
    emptyText: '暂无审计记录',
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'close'): void
}>()

function handleOpenChange(value: boolean) {
  emit('update:open', value)
}

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.audit-timeline__loading {
  display: flex;
  justify-content: center;
  padding: var(--dp-space-3, 12px) 0;
}

.audit-timeline__empty {
  padding: var(--dp-space-3, 12px) 0;
  text-align: center;
}

.audit-timeline__empty-text {
  font-size: 13px;
  color: var(--dp-text-muted);
}

.audit-timeline__list {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
}

.audit-timeline__list::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 12px;
  bottom: 12px;
  width: 2px;
  background: var(--dp-border);
}

.audit-timeline__item {
  display: flex;
  gap: var(--dp-space-3, 12px);
  padding: var(--dp-space-2, 8px) 0;
  position: relative;
}

.audit-timeline__item + .audit-timeline__item {
  border-top: none;
}

.audit-timeline__dot {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  border-radius: 50%;
  border: 2px solid var(--dp-color-primary);
  background: var(--dp-surface);
  position: relative;
  z-index: 1;
}

.audit-timeline__content {
  flex: 1;
  min-width: 0;
}

.audit-timeline__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.audit-timeline__operation {
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.audit-timeline__time {
  font-size: 11px;
  color: var(--dp-text-muted);
  flex-shrink: 0;
}

.audit-timeline__operator {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--dp-text-secondary);
}

.audit-timeline__role {
  padding: 0 6px;
  font-size: 11px;
  color: var(--dp-text-muted);
  background: var(--dp-gray-100);
  border-radius: 3px;
}

.audit-timeline__target {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--dp-text-muted);
}

.audit-timeline__target-type {
  font-weight: 500;
}

.audit-timeline__target-id {
  font-size: 11px;
}

.audit-timeline__reason {
  margin-top: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--dp-text-secondary);
  background: var(--dp-gray-50);
  border-radius: var(--dp-radius-control-inner);
  line-height: 1.5;
}
</style>
