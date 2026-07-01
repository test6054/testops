<template>
  <section
    class="ui-skeleton-state"
    :class="[
      `ui-skeleton-state--${props.variant}`,
      { 'ui-skeleton-state--compact': props.compact },
    ]"
    v-bind="$attrs"
  >
    <UiPanelHeader
      v-if="hasHeader"
      :title="props.title"
      :description="props.description"
      :eyebrow="props.eyebrow"
      :compact="props.compact"
    />

    <div
      v-if="props.variant === 'table'"
      class="ui-skeleton-state__table"
      :style="{ '--ui-skeleton-columns': String(props.columns) }"
    >
      <div class="ui-skeleton-state__table-row ui-skeleton-state__table-row--head">
        <span
          v-for="index in props.columns"
          :key="`head-${index}`"
          class="ui-skeleton-state__bar"
        />
      </div>
      <div v-for="row in props.rows" :key="`row-${row}`" class="ui-skeleton-state__table-row">
        <span
          v-for="index in props.columns"
          :key="`${row}-${index}`"
          class="ui-skeleton-state__bar"
        />
      </div>
    </div>

    <div v-else-if="props.variant === 'card'" class="ui-skeleton-state__cards">
      <article
        v-for="index in props.cardCount"
        :key="`card-${index}`"
        class="ui-skeleton-state__card"
      >
        <span class="ui-skeleton-state__bar ui-skeleton-state__bar--lg" />
        <span class="ui-skeleton-state__bar ui-skeleton-state__bar--md" />
        <span class="ui-skeleton-state__bar" />
        <span class="ui-skeleton-state__bar ui-skeleton-state__bar--sm" />
      </article>
    </div>

    <div v-else class="ui-skeleton-state__list">
      <article v-for="row in props.rows" :key="`item-${row}`" class="ui-skeleton-state__item">
        <span v-if="props.avatar" class="ui-skeleton-state__avatar" />
        <div class="ui-skeleton-state__content">
          <span class="ui-skeleton-state__bar ui-skeleton-state__bar--lg" />
          <span class="ui-skeleton-state__bar ui-skeleton-state__bar--md" />
          <span class="ui-skeleton-state__bar ui-skeleton-state__bar--sm" />
        </div>
      </article>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, useSlots } from 'vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiSkeletonState',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    eyebrow?: string
    variant?: 'list' | 'card' | 'table'
    rows?: number
    columns?: number
    cardCount?: number
    avatar?: boolean
    compact?: boolean
  }>(),
  {
    title: '',
    description: '',
    eyebrow: '',
    variant: 'list',
    rows: 4,
    columns: 4,
    cardCount: 3,
    avatar: false,
    compact: false,
  },
)

const slots = useSlots()

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!props.eyebrow || !!slots.default
})
</script>

<style scoped>
.ui-skeleton-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
}

.ui-skeleton-state--compact {
  gap: 12px;
  padding: 14px;
}

.ui-skeleton-state__list,
.ui-skeleton-state__cards {
  display: grid;
  gap: 12px;
}

.ui-skeleton-state__item,
.ui-skeleton-state__card {
  display: flex;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--dp-border, #eef2f7);
  border-radius: var(--dp-radius-control-inner, 4px);
  background: var(--dp-gray-50, #f8fafc);
}

.ui-skeleton-state__card {
  flex-direction: column;
}

.ui-skeleton-state__content {
  display: grid;
  gap: 8px;
  flex: 1;
}

.ui-skeleton-state__avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--dp-radius-control-inner, 4px);
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
  background-size: 400% 100%;
  animation: ui-skeleton-shimmer 1.6s ease infinite;
}

.ui-skeleton-state__bar {
  display: block;
  width: 100%;
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
  background-size: 400% 100%;
  animation: ui-skeleton-shimmer 1.6s ease infinite;
}

.ui-skeleton-state__bar--lg {
  width: 60%;
}
.ui-skeleton-state__bar--md {
  width: 82%;
}
.ui-skeleton-state__bar--sm {
  width: 38%;
}

.ui-skeleton-state__table {
  display: grid;
  gap: 10px;
}

.ui-skeleton-state__table-row {
  display: grid;
  grid-template-columns: repeat(var(--ui-skeleton-columns, 4), minmax(0, 1fr));
  gap: 12px;
}

.ui-skeleton-state__table-row--head .ui-skeleton-state__bar {
  height: 14px;
}

@keyframes ui-skeleton-shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-skeleton-state__bar,
  .ui-skeleton-state__avatar {
    animation: none !important;
  }
}

@media (max-width: 900px) {
  .ui-skeleton-state__cards {
    grid-template-columns: 1fr;
  }
}
</style>
