<template>
  <section
    class="ui-description-grid"
    :class="{ 'ui-description-grid--compact': props.compact }"
    v-bind="$attrs"
  >
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

    <div class="ui-description-grid__grid" :style="gridStyle">
      <article
        v-for="(item, index) in props.items"
        :key="item.key || item.label || index"
        class="ui-description-grid__item"
        :class="{ 'ui-description-grid__item--column': item.direction === 'column' }"
        :style="getItemStyle(item)"
      >
        <div class="ui-description-grid__label">{{ item.label }}</div>

        <slot :name="item.key ? `item-${item.key}` : 'item'" :item="item">
          <div class="ui-description-grid__value-wrap">
            <div
              class="ui-description-grid__value"
              :class="item.valueTone ? `ui-description-grid__value--${item.valueTone}` : ''"
            >
              {{ getDisplayValue(item) }}
            </div>

            <UiBadge
              v-if="item.badgeLabel"
              :tone="item.badgeTone || 'gray'"
              variant="soft"
              size="sm"
            >
              {{ item.badgeLabel }}
            </UiBadge>
          </div>

          <p v-if="item.helper" class="ui-description-grid__helper">{{ item.helper }}</p>
        </slot>
      </article>
    </div>

    <footer v-if="$slots.footer" class="ui-description-grid__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script lang="ts" setup>
import type { UiDescriptionItem } from './types'
import { computed, useSlots } from 'vue'
import UiBadge from './Badge.vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiDescriptionGrid',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    eyebrow?: string
    items?: UiDescriptionItem[]
    columns?: 1 | 2 | 3 | 4
    compact?: boolean
    divided?: boolean
    emptyText?: string
  }>(),
  {
    title: '',
    description: '',
    eyebrow: '',
    items: () => [],
    columns: 2,
    compact: false,
    divided: true,
    emptyText: '--',
  },
)

const slots = useSlots()

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!props.eyebrow || !!slots.meta || !!slots.actions
})

const gridStyle = computed(() => {
  return {
    gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))`,
  }
})

const getItemStyle = (item: UiDescriptionItem) => {
  const span = Math.min(Math.max(item.span || 1, 1), props.columns)
  return {
    gridColumn: `span ${span}`,
  }
}

const getDisplayValue = (item: UiDescriptionItem) => {
  if (item.value === undefined || item.value === null || item.value === '')
    return item.emptyText || props.emptyText

  return item.value
}
</script>

<style scoped>
.ui-description-grid {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);
}

.ui-description-grid--compact {
  gap: var(--dp-space-component);
}

.ui-description-grid__grid {
  display: grid;
  gap: var(--dp-space-component);
}

.ui-description-grid__item {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
  min-width: 0;
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
}

.ui-description-grid--compact .ui-description-grid__item {
  gap: var(--dp-space-component-xs);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
}

.ui-description-grid__item--column {
  align-items: flex-start;
}

.ui-description-grid__label {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  font-weight: 700;
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.ui-description-grid__value-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}

.ui-description-grid__value {
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.6;
  color: var(--dp-text-primary);
  word-break: break-word;
}

.ui-description-grid__value--gray {
  color: var(--dp-text-secondary);
}

.ui-description-grid__value--blue {
  color: var(--dp-blue-700);
}

.ui-description-grid__value--orange {
  color: var(--dp-orange-700);
}

.ui-description-grid__value--green {
  color: var(--dp-green-700);
}

.ui-description-grid__value--yellow {
  color: var(--dp-yellow-700);
}

.ui-description-grid__value--red {
  color: var(--dp-red-700);
}

.ui-description-grid__value--purple {
  color: var(--dp-purple-700);
}

.ui-description-grid__helper {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
  color: var(--dp-text-muted);
}

.ui-description-grid__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--dp-space-component);
  padding-top: var(--dp-space-component);
  border-top: 1px solid var(--dp-border);
}

@media (max-width: 900px) {
  .ui-description-grid__grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .ui-description-grid__item {
    grid-column: span 1 !important;
  }
}
</style>
