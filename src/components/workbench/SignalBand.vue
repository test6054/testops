<template>
  <div
    class="signal-band"
    :class="{
      'signal-band--compact': compact,
      'signal-band--panel': variant === 'panel',
      'signal-band--tiles': variant === 'tiles',
    }"
  >
    <component
      :is="metric.clickable ? 'button' : 'div'"
      v-for="metric in metrics"
      :key="metric.key"
      :type="metric.clickable ? 'button' : undefined"
      class="signal-band__item"
      :class="{
        'signal-band__item--clickable': metric.clickable,
        'signal-band__item--active': metric.active,
      }"
      @click="metric.clickable ? emit('metric-click', metric.key) : undefined"
    >
      <span
        v-if="variant === 'tiles'"
        class="signal-band__dot"
        :class="dotClass(metric.tone)"
      />
      <div class="signal-band__body">
        <span class="signal-band__label">{{ metric.label }}</span>
        <div class="signal-band__value-row">
          <span class="signal-band__value" :class="toneClass(metric.tone)">
            {{ metric.value }}
            <span v-if="metric.unit" class="signal-band__unit">{{ metric.unit }}</span>
          </span>
          <span
            v-if="metric.trend !== undefined && metric.trend !== 0"
            class="signal-band__trend"
            :class="trendClass(metric)"
          >
            {{ metric.trend > 0 ? '↑' : '↓' }}{{ Math.abs(metric.trend) }}%
          </span>
        </div>
        <span v-if="metric.helper" class="signal-band__helper">{{ metric.helper }}</span>
      </div>
    </component>
  </div>
</template>

<script lang="ts" setup>
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric, SignalMetricTrendPolarity } from '@/types/workbench'

defineOptions({
  name: 'SignalBand',
})

const props = withDefaults(
  defineProps<{
    metrics?: SignalMetric[]
    compact?: boolean
    variant?: 'inline' | 'panel' | 'tiles'
    trendPolarity?: SignalMetricTrendPolarity
  }>(),
  {
    metrics: () => [],
    compact: false,
    variant: 'panel',
    trendPolarity: 'negative',
  },
)

const emit = defineEmits<{
  'metric-click': [key: string]
}>()

function toneClass(tone?: BadgeTone): string {
  return tone ? `signal-band__value--${tone}` : ''
}

function dotClass(tone?: BadgeTone): string {
  return tone ? `signal-band__dot--${tone}` : 'signal-band__dot--gray'
}

function trendClass(metric: SignalMetric): string {
  const trend = metric.trend
  if (!trend) return ''
  const polarity = metric.trendPolarity ?? props.trendPolarity
  if (polarity === 'neutral') {
    return 'signal-band__trend--neutral'
  }
  const isUp = trend > 0
  const isAdverse = polarity === 'negative' ? isUp : !isUp
  return isAdverse ? 'signal-band__trend--adverse' : 'signal-band__trend--favorable'
}
</script>

<style scoped>
.signal-band {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-6);
}

.signal-band--compact {
  gap: var(--dp-space-4);
}

.signal-band--panel {
  flex-wrap: nowrap;
  gap: 1px;
  padding: 0;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-border);
  overflow-x: auto;
}

.signal-band--panel.signal-band--compact .signal-band__item {
  padding: var(--dp-space-3) var(--dp-space-4);
}

.signal-band--tiles {
  flex-wrap: nowrap;
  gap: var(--dp-space-2);
  overflow-x: auto;
  scrollbar-width: none;
}

.signal-band--tiles::-webkit-scrollbar {
  display: none;
}

.signal-band--tiles .signal-band__item {
  display: flex;
  align-items: center;
  gap: var(--dp-space-3);
  flex: 1;
  min-width: 120px;
  padding: var(--dp-space-3) var(--dp-space-4);
  background: var(--dp-surface-subtle);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  transition:
    border-color var(--dp-duration-fast) ease,
    box-shadow var(--dp-duration-fast) ease;
}

.signal-band--tiles .signal-band__item--clickable:hover {
  border-color: var(--dp-border-strong);
  box-shadow: var(--dp-shadow-xs);
}

.signal-band--tiles .signal-band__item--active {
  border-color: var(--dp-primary-light, #93c5fd);
  background: color-mix(in srgb, var(--dp-primary, #2563eb) 6%, var(--dp-surface-subtle));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dp-primary, #2563eb) 12%, transparent);
}

.signal-band--panel .signal-band__item--active {
  background: color-mix(in srgb, var(--dp-primary, #2563eb) 6%, var(--dp-surface-subtle));
}

.signal-band--tiles .signal-band__body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.signal-band--tiles .signal-band__value {
  font-size: var(--dp-font-size-md);
}

.signal-band__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--dp-radius-full);
  flex-shrink: 0;
}

.signal-band__dot--blue {
  background: var(--ant-color-primary);
  box-shadow: 0 0 0 2px rgb(22 119 255 / 12%);
}

.signal-band__dot--green {
  background: var(--ant-color-success);
  box-shadow: 0 0 0 2px rgb(82 196 26 / 12%);
}

.signal-band__dot--orange {
  background: var(--ant-color-warning);
  box-shadow: 0 0 0 2px rgb(250 173 20 / 12%);
}

.signal-band__dot--red {
  background: var(--ant-color-error);
  box-shadow: 0 0 0 2px rgb(255 77 79 / 12%);
}

.signal-band__dot--gray {
  background: var(--dp-border-strong);
}

.signal-band__body {
  display: contents;
}

.signal-band--panel .signal-band__body,
.signal-band--tiles .signal-band__body {
  display: flex;
  flex-direction: column;
}

.signal-band__item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  border: none;
  background: transparent;
  font: inherit;
  text-align: left;
  padding: 0;
}

.signal-band__item--clickable:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
  border-radius: var(--dp-radius-control-inner);
}

.signal-band__value-row {
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
}

.signal-band--panel .signal-band__item {
  flex: 1;
  min-width: 120px;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: var(--dp-space-4) var(--dp-space-5);
  background: var(--dp-surface);
  transition: background var(--dp-duration-normal) ease;
}

.signal-band--panel .signal-band__item--clickable:hover {
  background: var(--dp-gray-50);
}

.signal-band--panel .signal-band__value-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
}

.signal-band--panel .signal-band__label {
  font-weight: var(--dp-type-label-weight);
}

.signal-band--panel .signal-band__helper {
  margin-top: 2px;
}

.signal-band__item--clickable {
  cursor: pointer;
}

.signal-band__item--clickable:hover .signal-band__value {
  color: var(--ant-color-primary);
}

.signal-band__label {
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-muted);
}

.signal-band__value {
  font-size: 20px;
  font-weight: var(--dp-font-weight-metric);
  color: var(--dp-text-primary);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.signal-band--compact .signal-band__value {
  font-size: var(--dp-font-size-lg);
}

.signal-band__unit {
  font-size: var(--dp-font-size-xs);
  font-weight: var(--dp-font-weight-body);
  color: var(--dp-text-muted);
}

.signal-band__trend {
  font-size: var(--dp-type-hint-size);
  font-weight: var(--dp-type-sidebar-weight-active);
  font-variant-numeric: tabular-nums;
}

.signal-band__trend--adverse {
  color: var(--ant-color-error);
}

.signal-band__trend--favorable {
  color: var(--ant-color-success);
}

.signal-band__trend--neutral {
  color: var(--ant-color-primary);
}

.signal-band__helper {
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-muted);
}

.signal-band__value--green {
  color: var(--ant-color-success);
}

.signal-band__value--red {
  color: var(--ant-color-error);
}

.signal-band__value--orange {
  color: var(--ant-color-warning);
}

.signal-band__value--blue {
  color: var(--ant-color-primary);
}

.signal-band__value--purple {
  color: var(--dp-purple-500);
}

.signal-band__value--yellow {
  color: var(--dp-yellow-700);
}

.signal-band__value--gray {
  color: var(--dp-text-secondary);
}
</style>
