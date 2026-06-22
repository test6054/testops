<template>
  <section class="ui-quota-panel" v-bind="$attrs">
    <UiPanelHeader
      v-if="hasHeader"
      :title="props.title"
      :description="props.description"
      :eyebrow="props.eyebrow"
      :divided="props.divided"
      :compact="props.compact"
    >
      <template v-if="$slots.meta" #meta>
        <slot name="meta" />
      </template>

      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </UiPanelHeader>

    <a-spin :spinning="props.loading" style="width: 100%;">
      <div
        v-if="props.items.length"
        class="ui-quota-panel__grid"
        :class="`ui-quota-panel__grid--${props.columns}`"
      >
        <article
          v-for="item in props.items"
          :key="item.key || item.label"
          class="ui-quota-panel__item"
        >
          <div class="ui-quota-panel__item-head">
            <div class="ui-quota-panel__label-wrap">
              <div class="ui-quota-panel__label">{{ item.label }}</div>
              <div v-if="item.helper" class="ui-quota-panel__helper">{{ item.helper }}</div>
            </div>

            <div class="ui-quota-panel__value">{{ item.valueText }}</div>
          </div>

          <UiProgressBar
            :percent="normalizePercent(item.percent)"
            size="small"
            :show-text="false"
            :color="getProgressColor(item)"
          />

          <div class="ui-quota-panel__item-footer">
            <UiTag
              v-if="item.statusLabel"
              :tone="item.statusTone || getItemTone(item)"
              size="sm"
            >
              {{ item.statusLabel }}
            </UiTag>

            <span class="ui-quota-panel__percent">
              {{ normalizePercent(item.percent) }}%
            </span>
          </div>
        </article>
      </div>

      <UiEmpty
        size="sm"
        title="暂无配额数据"
        :description="props.emptyText"
      />
    </a-spin>

    <footer v-if="$slots.footer" class="ui-quota-panel__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiQuotaItem } from './types'
import { computed, useSlots } from 'vue'
import UiEmpty from './Empty.vue'
import UiProgressBar from './ProgressBar.vue'
import UiTag from './Tag.vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiQuotaPanel',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  eyebrow?: string
  items?: UiQuotaItem[]
  loading?: boolean
  emptyText?: string
  divided?: boolean
  compact?: boolean
  columns?: 1 | 2 | 3
}>(), {
  title: '',
  description: '',
  eyebrow: '',
  items: () => [],
  loading: false,
  emptyText: '请传入 `items` 配置',
  divided: true,
  compact: false,
  columns: 2,
})

const slots = useSlots()

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!props.eyebrow || !!slots.meta || !!slots.actions
})

const normalizePercent = (value: number) => {
  return Math.max(0, Math.min(100, Math.round(value || 0)))
}

const getItemTone = (item: UiQuotaItem): BadgeTone => {
  if (item.tone)
    return item.tone

  const percent = normalizePercent(item.percent)
  if (percent >= 90) return 'red'
  if (percent >= 70) return 'orange'
  if (percent >= 50) return 'blue'
  return 'green'
}

const getProgressColor = (item: UiQuotaItem) => {
  switch (getItemTone(item)) {
    case 'green':
      return '#16a34a'
    case 'orange':
      return '#ea580c'
    case 'red':
      return '#dc2626'
    case 'purple':
      return '#7c3aed'
    case 'yellow':
      return '#ca8a04'
    case 'gray':
      return '#64748b'
    case 'blue':
    default:
      return '#2563eb'
  }
}
</script>

<style scoped>
.ui-quota-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
  box-shadow: var(--dp-shadow-card, 0 10px 30px rgba(15, 23, 42, 0.06));
}

.ui-quota-panel__grid {
  display: grid;
  gap: 14px;
}

.ui-quota-panel__grid--1 {
  grid-template-columns: minmax(0, 1fr);
}

.ui-quota-panel__grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ui-quota-panel__grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.ui-quota-panel__item {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: #fff;
}

.ui-quota-panel__item-head,
.ui-quota-panel__item-footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.ui-quota-panel__label-wrap {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.ui-quota-panel__label {
  font-size: 14px;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-quota-panel__helper,
.ui-quota-panel__percent {
  font-size: 12px;
  color: var(--dp-text-secondary, #475569);
}

.ui-quota-panel__value {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-quota-panel__footer {
  padding-top: 14px;
  border-top: 1px solid var(--dp-border, #e5e7eb);
}

@media (max-width: 1080px) {
  .ui-quota-panel__grid--2,
  .ui-quota-panel__grid--3 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
