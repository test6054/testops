<template>
  <section
    class="ui-stat-panel"
    :class="[
      `ui-stat-panel--${props.variant}`,
      `ui-stat-panel--${props.columns}col`,
      { 'ui-stat-panel--compact': props.compact },
    ]"
    v-bind="$attrs"
  >
    <UiPanelHeader
      v-if="hasHeader"
      :title="props.title"
      :description="props.description"
      :eyebrow="props.eyebrow"
      :compact="props.compact"
      class="ui-stat-panel__header"
    >
      <template v-if="$slots.meta" #meta>
        <slot name="meta" />
      </template>

      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </UiPanelHeader>

    <div class="ui-stat-panel__list">
      <slot>
        <UiMetricCard
          v-for="item in props.items"
          :key="item.key || item.label"
          :label="item.label"
          :value="item.value"
          :unit="item.unit"
          :helper="item.helper || item.subText"
          :trend="item.trend"
          :trend-tone="item.trendTone"
          :tone="item.tone"
          :compact="props.variant !== 'grid' || props.compact || item.compact"
          :clickable="item.clickable || !!item.onClick"
          @click="item.onClick?.()"
        >
          <template v-if="item.icon" #icon>
            <component :is="item.icon" />
          </template>
        </UiMetricCard>
      </slot>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { Component } from 'vue'
import type { BadgeTone } from './types'
import { computed, useSlots } from 'vue'
import UiMetricCard from './UiMetricCard.vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiStatPanel',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  eyebrow?: string
  items?: UiStatPanelItem[]
  variant?: Variant
  columns?: 2 | 3 | 4
  compact?: boolean
}>(), {
  title: '',
  description: '',
  eyebrow: '',
  items: () => [],
  variant: 'grid',
  columns: 4,
  compact: false,
})
type TrendTone = 'default' | 'success' | 'warning' | 'danger'
type Variant = 'grid' | 'strip' | 'compact'

interface UiStatPanelItem {
  key?: string | number
  label: string
  value: string | number
  unit?: string
  helper?: string
  subText?: string
  trend?: string
  trendTone?: TrendTone
  tone?: BadgeTone
  icon?: Component
  clickable?: boolean
  compact?: boolean
  onClick?: () => void
}

const slots = useSlots()

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!props.eyebrow || !!slots.meta || !!slots.actions
})
</script>

<style scoped>
.ui-stat-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ui-stat-panel--compact {
  gap: 12px;
}

.ui-stat-panel__list {
  display: grid;
  gap: 12px;
}

.ui-stat-panel--grid.ui-stat-panel--2col .ui-stat-panel__list,
.ui-stat-panel--compact.ui-stat-panel--2col .ui-stat-panel__list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ui-stat-panel--grid.ui-stat-panel--3col .ui-stat-panel__list,
.ui-stat-panel--compact.ui-stat-panel--3col .ui-stat-panel__list {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.ui-stat-panel--grid.ui-stat-panel--4col .ui-stat-panel__list,
.ui-stat-panel--compact.ui-stat-panel--4col .ui-stat-panel__list {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.ui-stat-panel--strip .ui-stat-panel__list {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.ui-stat-panel--compact .ui-stat-panel__list {
  gap: 10px;
}

@media (max-width: 1200px) {
  .ui-stat-panel--grid .ui-stat-panel__list,
  .ui-stat-panel--compact .ui-stat-panel__list,
  .ui-stat-panel--strip .ui-stat-panel__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .ui-stat-panel--grid .ui-stat-panel__list,
  .ui-stat-panel--compact .ui-stat-panel__list,
  .ui-stat-panel--strip .ui-stat-panel__list {
    grid-template-columns: 1fr;
  }
}
</style>
