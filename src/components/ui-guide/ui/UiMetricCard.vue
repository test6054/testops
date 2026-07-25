<template>
  <article
    class="ui-metric-card"
    :class="[
      `ui-metric-card--${props.tone}`,
      {
        'ui-metric-card--clickable': props.clickable,
        'ui-metric-card--compact': props.compact,
        'ui-metric-card--with-icon': !!$slots.icon,
      },
    ]"
    v-bind="$attrs"
    @click="handleClick"
  >
    <div v-if="$slots.icon" class="ui-metric-card__icon">
      <slot name="icon" />
    </div>

    <div class="ui-metric-card__content">
      <div class="ui-metric-card__head">
        <div class="ui-metric-card__label">{{ props.label }}</div>
        <div v-if="$slots.extra" class="ui-metric-card__extra" @click.stop>
          <slot name="extra" />
        </div>
      </div>

      <div class="ui-metric-card__value-row">
        <span class="ui-metric-card__value">{{ props.value }}</span>
        <span v-if="props.unit" class="ui-metric-card__unit">{{ props.unit }}</span>
      </div>

      <div v-if="$slots.footer || props.helper || props.trend" class="ui-metric-card__footer">
        <slot name="footer">
          <span v-if="props.helper" class="ui-metric-card__helper">{{ props.helper }}</span>
          <span
            v-if="props.trend"
            class="ui-metric-card__trend"
            :class="`ui-metric-card__trend--${props.trendTone}`"
          >
            {{ props.trend }}
          </span>
        </slot>
      </div>
    </div>
  </article>
</template>

<script lang="ts" setup>
import type { BadgeTone } from './types'

defineOptions({
  name: 'UiMetricCard',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    unit?: string
    helper?: string
    trend?: string
    trendTone?: TrendTone
    tone?: BadgeTone
    clickable?: boolean
    compact?: boolean
  }>(),
  {
    unit: '',
    helper: '',
    trend: '',
    trendTone: 'default',
    tone: 'blue',
    clickable: false,
    compact: true,
  },
)

const emit = defineEmits<{
  (e: 'click', evt: MouseEvent): void
}>()

type TrendTone = 'default' | 'success' | 'warning' | 'danger'

const handleClick = (evt: MouseEvent) => {
  if (!props.clickable) return
  emit('click', evt)
}
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.ui-metric-card {
  --metric-border: color-mix(in srgb, var(--dp-text-muted) 20%, transparent);
  --metric-text: var(--dp-blue-500);
  --metric-icon-bg: var(--dp-blue-50);
  --metric-icon-border: color-mix(in srgb, var(--dp-blue-200) 90%, transparent);
  display: flex;
  align-items: flex-start;
  gap: var(--dp-space-3, 10px);
  min-width: 0;
  padding: var(--dp-space-3, 12px) var(--dp-space-4, 14px);
  border: 1px solid var(--metric-border);
  border-radius: var(--dp-radius-panel, 8px);
  background: var(--dp-fill-quaternary);
  box-shadow: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.ui-metric-card--clickable {
  cursor: pointer;
}

.ui-metric-card--clickable:hover {
  border-color: color-mix(in srgb, var(--metric-text) 20%, var(--dp-border));
  box-shadow: var(--dp-shadow-sm);
  transform: translateY(-1px);
}

@media (prefers-reduced-motion: reduce) {
  .ui-metric-card--clickable:hover {
    transform: none;
  }
}

.ui-metric-card--compact {
  gap: var(--dp-space-2, 8px);
  padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
}

.ui-metric-card__content {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-1, 6px);
}

.ui-metric-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
}

.ui-metric-card__icon {
  width: 32px;
  height: 32px;
  border-radius: var(--dp-radius-panel, 8px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--metric-text);
  background: var(--metric-icon-bg);
  border: 1px solid var(--metric-icon-border);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--dp-surface) 72%, transparent);
}

.ui-metric-card__icon :deep(.anticon),
.ui-metric-card__icon :deep(svg) {
  font-size: 15px;
}

.ui-metric-card__label {
  min-width: 0;
  font-size: var(--dp-type-hint-size);
  font-weight: var(--dp-type-table-head-weight);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-secondary);
}

.ui-metric-card__extra {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
  flex-shrink: 0;
}

.ui-metric-card__value-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--dp-space-1, 4px);
}

.ui-metric-card__value {
  font-size: var(--dp-font-size-2xl);
  line-height: 1.25;
  font-weight: var(--dp-font-weight-metric);
  color: var(--dp-text-primary);
  font-variant-numeric: tabular-nums;
}

.ui-metric-card__unit {
  font-size: var(--dp-type-table-body-size);
  font-weight: var(--dp-type-sidebar-weight-active);
  color: var(--dp-text-muted);
  font-variant-numeric: tabular-nums;
}

.ui-metric-card__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
  min-height: 20px;
}

.ui-metric-card__helper {
  min-width: 0;
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.ui-metric-card__trend {
  flex-shrink: 0;
  font-size: var(--dp-font-size-xs);
  font-weight: 700;
}

.ui-metric-card__trend--default {
  color: var(--dp-text-secondary);
}

.ui-metric-card__trend--success {
  color: var(--dp-green-700);
}

.ui-metric-card__trend--warning {
  color: var(--dp-orange-700);
}

.ui-metric-card__trend--danger {
  color: var(--dp-red-700);
}

.ui-metric-card--gray {
  --metric-text: var(--dp-text-secondary);
  --metric-icon-bg: var(--dp-surface-subtle);
  --metric-icon-border: color-mix(in srgb, var(--dp-border) 90%, transparent);
}

.ui-metric-card--blue {
  --metric-text: var(--dp-blue-500);
  --metric-icon-bg: var(--dp-blue-50);
  --metric-icon-border: color-mix(in srgb, var(--dp-blue-200) 90%, transparent);
}

.ui-metric-card--orange {
  --metric-text: var(--dp-orange-600);
  --metric-icon-bg: var(--dp-orange-50);
  --metric-icon-border: color-mix(in srgb, var(--dp-orange-200) 82%, transparent);
}

.ui-metric-card--green {
  --metric-text: var(--dp-green-600);
  --metric-icon-bg: var(--dp-green-50);
  --metric-icon-border: color-mix(in srgb, var(--dp-green-200) 90%, transparent);
}

.ui-metric-card--yellow {
  --metric-text: var(--dp-orange-600);
  --metric-icon-bg: var(--dp-warning-bg);
  --metric-icon-border: color-mix(in srgb, var(--dp-warning) 35%, transparent);
}

.ui-metric-card--red {
  --metric-text: var(--dp-red-600);
  --metric-icon-bg: var(--dp-red-50);
  --metric-icon-border: color-mix(in srgb, var(--dp-red-200) 88%, transparent);
}

.ui-metric-card--purple {
  --metric-text: var(--dp-purple-500);
  --metric-icon-bg: var(--dp-purple-50);
  --metric-icon-border: color-mix(in srgb, var(--dp-purple-200) 90%, transparent);
}

.ui-metric-card--compact .ui-metric-card__icon {
  width: 32px;
  height: 32px;
  border-radius: var(--dp-radius-control, 8px);
}

.ui-metric-card--compact .ui-metric-card__icon :deep(.anticon),
.ui-metric-card--compact .ui-metric-card__icon :deep(svg) {
  font-size: var(--dp-font-size-lg);
}

.ui-metric-card--compact .ui-metric-card__value {
  font-size: var(--dp-font-size-xl);
}

.ui-metric-card--compact .ui-metric-card__unit {
  font-size: var(--dp-font-size-sm);
}

.ui-metric-card--compact .ui-metric-card__helper {
  font-size: var(--dp-font-size-xs);
}

@media (max-width: bp.$layout-mobile-max) {
  .ui-metric-card {
    padding: var(--dp-space-3, 14px) var(--dp-space-4, 16px);
  }
}
</style>
