<template>
  <section
    class="ui-statistic-summary-grid"
    :class="[
      `ui-statistic-summary-grid--${props.columns}col`,
      { 'ui-statistic-summary-grid--compact': props.compact },
    ]"
    v-bind="$attrs"
  >
    <UiPanelHeader
      v-if="hasHeader"
      :title="props.title"
      :description="props.description"
      :eyebrow="props.eyebrow"
      :compact="props.compact"
    >
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </UiPanelHeader>

    <div class="ui-statistic-summary-grid__list">
      <article
        v-for="item in props.items"
        :key="item.key || item.label"
        class="ui-statistic-summary-grid__item"
      >
        <div class="ui-statistic-summary-grid__head">
          <div class="ui-statistic-summary-grid__label">{{ item.label }}</div>
          <span
            class="ui-statistic-summary-grid__dot"
            :class="`ui-statistic-summary-grid__dot--${item.tone || 'gray'}`"
          />
        </div>

        <div class="ui-statistic-summary-grid__value-row">
          <span class="ui-statistic-summary-grid__value">{{ item.value }}</span>
          <span v-if="item.unit" class="ui-statistic-summary-grid__unit">{{ item.unit }}</span>
        </div>

        <div
          v-if="item.helper || item.trend"
          class="ui-statistic-summary-grid__footer"
        >
          <span v-if="item.helper" class="ui-statistic-summary-grid__helper">
            {{ item.helper }}
          </span>
          <span
            v-if="item.trend"
            class="ui-statistic-summary-grid__trend"
            :class="`ui-statistic-summary-grid__trend--${item.tone || 'gray'}`"
          >
            {{ item.trend }}
          </span>
        </div>
      </article>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { UiStatisticSummaryItem } from './types'
import { computed, useSlots } from 'vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiStatisticSummaryGrid',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  eyebrow?: string
  items?: UiStatisticSummaryItem[]
  columns?: 2 | 3 | 4
  compact?: boolean
}>(), {
  title: '',
  description: '',
  eyebrow: '',
  items: () => [],
  columns: 4,
  compact: false,
})

const slots = useSlots()

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!props.eyebrow || !!slots.actions
})
</script>

<style scoped>
.ui-statistic-summary-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ui-statistic-summary-grid--compact {
  gap: 12px;
}

.ui-statistic-summary-grid__list {
  display: grid;
  gap: 12px;
}

.ui-statistic-summary-grid--2col .ui-statistic-summary-grid__list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ui-statistic-summary-grid--3col .ui-statistic-summary-grid__list {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.ui-statistic-summary-grid--4col .ui-statistic-summary-grid__list {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.ui-statistic-summary-grid__item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
}

.ui-statistic-summary-grid--compact .ui-statistic-summary-grid__item {
  gap: 8px;
  padding: 14px;
}

.ui-statistic-summary-grid__head,
.ui-statistic-summary-grid__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ui-statistic-summary-grid__label {
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--dp-text-secondary, #475569);
}

.ui-statistic-summary-grid__dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 999px;
}

.ui-statistic-summary-grid__dot--gray { background: #94a3b8; }
.ui-statistic-summary-grid__dot--blue { background: #2563eb; }
.ui-statistic-summary-grid__dot--orange { background: #ea580c; }
.ui-statistic-summary-grid__dot--green { background: #16a34a; }
.ui-statistic-summary-grid__dot--yellow { background: #ca8a04; }
.ui-statistic-summary-grid__dot--red { background: #dc2626; }
.ui-statistic-summary-grid__dot--purple { background: #7c3aed; }

.ui-statistic-summary-grid__value-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
}

.ui-statistic-summary-grid__value {
  font-size: 28px;
  line-height: 1.1;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-statistic-summary-grid__unit {
  font-size: 13px;
  font-weight: 700;
  color: var(--dp-text-muted, #6b7280);
}

.ui-statistic-summary-grid__helper,
.ui-statistic-summary-grid__trend {
  font-size: 12px;
  line-height: 1.6;
}

.ui-statistic-summary-grid__helper {
  color: var(--dp-text-secondary, #475569);
}

.ui-statistic-summary-grid__trend--gray { color: #64748b; }
.ui-statistic-summary-grid__trend--blue { color: #1d4ed8; }
.ui-statistic-summary-grid__trend--orange { color: #c2410c; }
.ui-statistic-summary-grid__trend--green { color: #15803d; }
.ui-statistic-summary-grid__trend--yellow { color: #a16207; }
.ui-statistic-summary-grid__trend--red { color: #b91c1c; }
.ui-statistic-summary-grid__trend--purple { color: #6d28d9; }

@media (max-width: 1200px) {
  .ui-statistic-summary-grid__list {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 768px) {
  .ui-statistic-summary-grid__list {
    grid-template-columns: 1fr !important;
  }
}
</style>
