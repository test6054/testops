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
    compact: false,
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

<style scoped>
.ui-metric-card {
  --metric-border: rgba(148, 163, 184, 0.2);
  --metric-text: #2563eb;
  --metric-icon-bg: #eff6ff;
  --metric-icon-border: rgba(191, 219, 254, 0.9);
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
  padding: 16px 18px;
  border: 1px solid var(--metric-border);
  border-radius: 8px;
  background: var(--ant-color-fill-quaternary);
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
  border-color: color-mix(in srgb, var(--metric-text) 20%, #dbe3ef);
}

.ui-metric-card--compact {
  gap: 12px;
  padding: 14px 16px;
}

.ui-metric-card__content {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ui-metric-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.ui-metric-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--metric-text);
  background: var(--metric-icon-bg);
  border: 1px solid var(--metric-icon-border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.ui-metric-card__icon :deep(.anticon),
.ui-metric-card__icon :deep(svg) {
  font-size: 18px;
}

.ui-metric-card__label {
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--dp-text-secondary, #6b7280);
}

.ui-metric-card__extra {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}

.ui-metric-card__value-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px;
}

.ui-metric-card__value {
  font-size: 24px;
  line-height: 1.25;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-metric-card__unit {
  font-size: 14px;
  font-weight: 700;
  color: var(--dp-text-muted, #6b7280);
}

.ui-metric-card__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-height: 20px;
}

.ui-metric-card__helper {
  min-width: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary, #6b7280);
}

.ui-metric-card__trend {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
}

.ui-metric-card__trend--default {
  color: var(--dp-text-secondary, #475569);
}

.ui-metric-card__trend--success {
  color: var(--dp-green-700, #15803d);
}

.ui-metric-card__trend--warning {
  color: var(--dp-orange-700, #c2410c);
}

.ui-metric-card__trend--danger {
  color: var(--dp-red-700, #b91c1c);
}

.ui-metric-card--gray {
  --metric-text: #475569;
  --metric-icon-bg: #f8fafc;
  --metric-icon-border: rgba(226, 232, 240, 0.9);
}

.ui-metric-card--blue {
  --metric-text: #2563eb;
  --metric-icon-bg: #eff6ff;
  --metric-icon-border: rgba(191, 219, 254, 0.9);
}

.ui-metric-card--orange {
  --metric-text: #ea580c;
  --metric-icon-bg: #fff7ed;
  --metric-icon-border: rgba(253, 186, 116, 0.82);
}

.ui-metric-card--green {
  --metric-text: #16a34a;
  --metric-icon-bg: #ecfdf3;
  --metric-icon-border: rgba(187, 247, 208, 0.9);
}

.ui-metric-card--yellow {
  --metric-text: #ca8a04;
  --metric-icon-bg: #fefce8;
  --metric-icon-border: rgba(253, 224, 71, 0.72);
}

.ui-metric-card--red {
  --metric-text: #dc2626;
  --metric-icon-bg: #fef2f2;
  --metric-icon-border: rgba(254, 202, 202, 0.88);
}

.ui-metric-card--purple {
  --metric-text: #7c3aed;
  --metric-icon-bg: #f5f3ff;
  --metric-icon-border: rgba(221, 214, 254, 0.9);
}

.ui-metric-card--compact .ui-metric-card__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
}

.ui-metric-card--compact .ui-metric-card__icon :deep(.anticon),
.ui-metric-card--compact .ui-metric-card__icon :deep(svg) {
  font-size: 16px;
}

.ui-metric-card--compact .ui-metric-card__value {
  font-size: 22px;
}

.ui-metric-card--compact .ui-metric-card__unit {
  font-size: 13px;
}

.ui-metric-card--compact .ui-metric-card__helper {
  font-size: 12px;
}

@media (max-width: 768px) {
  .ui-metric-card {
    padding: 14px 16px;
  }
}
</style>
