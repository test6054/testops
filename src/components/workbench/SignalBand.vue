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
      }"
      @click="metric.clickable ? emit('metric-click', metric.key) : undefined"
    >
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
import type { SignalMetric, SignalMetricTrendPolarity } from '@/types/workbench'

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
  gap: var(--dp-space-4);
}

.signal-band--compact {
  gap: var(--dp-space-3);
}

/* panel：独立指标卡 + 真实间距，禁止 1px 连体条 */
.signal-band--panel {
  flex-wrap: nowrap;
  gap: var(--dp-space-4);
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  overflow-x: auto;
}

.signal-band--panel.signal-band--compact {
  gap: var(--dp-space-3);
}

.signal-band--panel.signal-band--compact .signal-band__item {
  padding: var(--dp-space-3);
}

.signal-band--panel .signal-band__item--active {
  background: color-mix(in srgb, var(--dp-primary) 6%, var(--dp-surface));
  border-color: color-mix(in srgb, var(--dp-primary) 28%, var(--dp-border));
  box-shadow: none;
  color: var(--dp-primary);
}




.signal-band__body {
  display: contents;
}

.signal-band--panel .signal-band__body {
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
  flex: 1 1 0;
  min-width: 120px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  min-height: 64px;
  padding: var(--dp-space-3) var(--dp-space-4);
  background: var(--dp-surface);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-control-inner);
  box-shadow: none;
  transition:
    background var(--dp-duration-normal) ease,
    border-color var(--dp-duration-normal) ease;
}

.signal-band--panel .signal-band__item--clickable:hover {
  background: var(--dp-surface);
  border-color: var(--dp-color-primary-border);
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
  color: var(--dp-color-primary);
}

.signal-band__label {
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-muted);
}

.signal-band__value {
  font-size: 18px;
  font-weight: var(--dp-font-weight-metric);
  color: var(--dp-text-primary);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.signal-band--compact .signal-band__value {
  font-size: 20px;
  line-height: 1.15;
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
  margin-top: 2px;
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
