<template>
  <div
    class="signal-band"
    :class="{
      'signal-band--compact': compact,
      'signal-band--panel': variant === 'panel',
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
        [`signal-band__item--tone-${metric.tone ?? 'gray'}`]: variant === 'panel',
      }"
      @click="metric.clickable ? emit('metric-click', metric.key) : undefined"
    >
      <span
        v-if="variant === 'panel'"
        class="signal-band__icon"
        :class="iconToneClass(metric)"
        aria-hidden="true"
      >
        <slot :name="`icon-${metric.key}`">
          <span class="signal-band__icon-dot" />
        </slot>
      </span>
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
        <span
          v-if="sparkPolyline(metric)"
          class="signal-band__spark"
          aria-hidden="true"
        >
          <svg viewBox="0 0 80 18" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              :points="sparkPolyline(metric)"
            />
          </svg>
        </span>
      </div>
    </component>
  </div>
</template>

<script lang="ts" setup>
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric, SignalMetricIconTone, SignalMetricTrendPolarity } from '@/types/workbench'

defineOptions({
  name: 'SignalBand',
})

const props = withDefaults(
  defineProps<{
    metrics?: SignalMetric[]
    compact?: boolean
    variant?: 'inline' | 'panel'
    trendPolarity?: SignalMetricTrendPolarity
  }>(),
  {
    metrics: () => [],
    compact: false,
    /* 列表页默认 inline，避免 KPI 再叠一层白卡；驾驶舱可显式 panel */
    variant: 'inline',
    trendPolarity: 'negative',
  },
)

const emit = defineEmits<{
  'metric-click': [key: string]
}>()

function toneClass(tone?: BadgeTone): string {
  return tone ? `signal-band__value--${tone}` : ''
}

function resolveIconTone(metric: SignalMetric): SignalMetricIconTone {
  if (metric.iconTone) return metric.iconTone
  const tone = metric.tone
  if (tone === 'green') return 'green'
  if (tone === 'red') return 'red'
  if (tone === 'orange') return 'orange'
  if (tone === 'blue') return 'blue'
  if (tone === 'purple') return 'purple'
  return 'gray'
}

function iconToneClass(metric: SignalMetric): string {
  return `signal-band__icon--${resolveIconTone(metric)}`
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

/** 仅渲染 Live sparkValues，不编造序列 */
function sparkPolyline(metric: SignalMetric): string {
  const values = metric.sparkValues
  if (!values?.length) return ''
  if (!values.some((value) => value > 0)) return ''
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)
  const n = values.length
  return values
    .map((value, index) => {
      const x = n === 1 ? 40 : (index / (n - 1)) * 80
      const y = 16 - ((value - min) / range) * 14
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
</script>

<style scoped>
@use '@/styles/breakpoints' as bp;

.signal-band {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: var(--dp-space-4);
  padding: var(--dp-space-3) var(--dp-space-4);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-xs);
}

.signal-band--compact {
  gap: var(--dp-space-3);
  padding: var(--dp-space-2) var(--dp-space-3);
}

/* panel：独立指标卡 + 图标区 + 副文案 */
.signal-band--panel {
  flex-wrap: nowrap;
  gap: var(--dp-space-3);
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow-x: auto;
}

.signal-band--panel.signal-band--compact {
  gap: var(--dp-space-3);
}

.signal-band--panel.signal-band--compact .signal-band__item {
  padding: var(--dp-space-3);
}

.signal-band--panel .signal-band__item--active {
  background: color-mix(in srgb, var(--dp-primary) 8%, var(--dp-surface));
  border-color: color-mix(in srgb, var(--dp-primary) 32%, var(--dp-border));
  box-shadow: var(--dp-shadow-sm);
  color: var(--dp-primary);
}

.signal-band__body {
  display: contents;
}

.signal-band--panel .signal-band__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.signal-band__item {
  display: flex;
  align-items: baseline;
  gap: var(--dp-space-2);
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
  gap: var(--dp-space-2);
}

.signal-band--panel .signal-band__item {
  flex: 1 1 0;
  min-width: 140px;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  gap: var(--dp-space-3);
  min-height: 88px;
  padding: var(--dp-space-4);
  padding-top: calc(var(--dp-space-4) + 3px);
  background: var(--dp-surface);
  border: 1px solid var(--dp-border-subtle);
  border-top: 3px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  box-shadow: var(--dp-shadow-xs);
  transition:
    background var(--dp-duration-normal) ease,
    border-color var(--dp-duration-normal) ease,
    box-shadow var(--dp-duration-normal) ease,
    transform var(--dp-duration-fast) ease;
}

.signal-band--panel .signal-band__item:hover {
  box-shadow: var(--dp-shadow-sm);
  transform: translateY(-1px);
}

.signal-band--panel .signal-band__item--clickable:hover {
  background: color-mix(in srgb, var(--dp-primary) 4%, var(--dp-surface));
  border-color: var(--dp-color-primary-border);
}

@media (prefers-reduced-motion: reduce) {
  .signal-band--panel .signal-band__item {
    transition: none;
  }

  .signal-band--panel .signal-band__item:hover,
  .signal-band--panel .signal-band__item--clickable:hover {
    transform: none;
  }
}

.signal-band__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--dp-radius-control);
}

.signal-band--panel .signal-band__icon {
  width: 40px;
  height: 40px;
  border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
  box-shadow: inset 0 1px 2px color-mix(in srgb, currentColor 8%, transparent);
}

.signal-band__icon-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--dp-radius-full);
  background: currentColor;
  opacity: 0.9;
}

.signal-band--panel .signal-band__icon-dot {
  width: 12px;
  height: 12px;
  box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 15%, transparent);
}

.signal-band__icon--blue {
  color: var(--dp-blue-500);
  background: var(--dp-blue-50);
}

.signal-band__icon--green {
  color: var(--dp-green-600);
  background: var(--dp-green-50);
}

.signal-band__icon--orange {
  color: var(--dp-orange-600);
  background: var(--dp-orange-50);
}

.signal-band__icon--red {
  color: var(--dp-red-600);
  background: var(--dp-red-50);
}

.signal-band__icon--gray {
  color: var(--dp-gray-600);
  background: var(--dp-gray-100);
}

.signal-band__icon--purple {
  color: var(--dp-purple-700);
  background: var(--dp-purple-50);
}

/* panel 卡片顶部色调条 */
.signal-band--panel .signal-band__item--tone-green {
  border-top-color: var(--dp-green-500, var(--dp-success));
}

.signal-band--panel .signal-band__item--tone-blue {
  border-top-color: var(--dp-blue-500, var(--dp-color-primary));
}

.signal-band--panel .signal-band__item--tone-orange {
  border-top-color: var(--dp-orange-500, var(--dp-warning));
}

.signal-band--panel .signal-band__item--tone-red {
  border-top-color: var(--dp-red-500, var(--dp-error));
}

.signal-band--panel .signal-band__item--tone-purple {
  border-top-color: var(--dp-purple-500);
}

.signal-band--panel .signal-band__item--tone-gray {
  border-top-color: var(--dp-gray-400, var(--dp-border));
}

.signal-band--panel .signal-band__item--tone-yellow {
  border-top-color: var(--dp-yellow-600, var(--dp-warning));
}

.signal-band--panel .signal-band__value-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}

.signal-band--panel .signal-band__label {
  font-weight: var(--dp-type-label-weight);
}

.signal-band--panel .signal-band__helper {
  margin-top: var(--dp-space-1);
}

.signal-band__item--clickable {
  cursor: pointer;
}

.signal-band__item--clickable:hover .signal-band__value {
  color: var(--dp-color-primary);
}

.signal-band__label {
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  font-weight: 500;
  color: var(--dp-text-secondary);
  letter-spacing: 0.01em;
}

.signal-band__value {
  font-size: var(--dp-font-size-xl);
  font-weight: var(--dp-font-weight-metric);
  color: var(--dp-text-primary);
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.signal-band--compact .signal-band__value {
  font-size: var(--dp-type-metric-size);
  line-height: var(--dp-type-metric-line-height);
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
  color: var(--dp-error);
}

.signal-band__trend--favorable {
  color: var(--dp-success);
}

.signal-band__trend--neutral {
  color: var(--dp-color-primary);
}

.signal-band__helper {
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-muted);
}

.signal-band__value--green {
  color: var(--dp-success);
}

.signal-band__value--red {
  color: var(--dp-error);
}

.signal-band__value--orange {
  color: var(--dp-warning);
}

.signal-band__value--blue {
  color: var(--dp-color-primary);
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

.signal-band__spark {
  display: block;
  width: 100%;
  max-width: 88px;
  height: 16px;
  margin-top: var(--dp-space-1);
  color: var(--dp-color-primary);
}

.signal-band__spark svg {
  display: block;
  width: 100%;
  height: 100%;
}

.signal-band__item--active .signal-band__spark,
.signal-band__value--blue + * .signal-band__spark {
  color: var(--dp-color-primary);
}

@media (max-width: bp.$layout-mobile-max) {
  .signal-band--panel {
    flex-wrap: wrap;
    overflow-x: visible;
  }

  .signal-band--panel .signal-band__item {
    flex: 1 1 calc(50% - var(--dp-space-3));
    min-width: 0;
  }
}
</style>
