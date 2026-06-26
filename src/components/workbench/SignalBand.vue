<template>
  <div class="signal-band" :class="{ 'signal-band--compact': compact }">
    <div
      v-for="metric in metrics"
      :key="metric.key"
      class="signal-band__item"
      :class="{ 'signal-band__item--clickable': metric.clickable }"
      @click="metric.clickable ? emit('metric-click', metric.key) : undefined"
    >
      <span class="signal-band__label">{{ metric.label }}</span>
      <span class="signal-band__value" :class="toneClass(metric.tone)">
        {{ metric.value }}
        <span v-if="metric.unit" class="signal-band__unit">{{ metric.unit }}</span>
      </span>
      <span
        v-if="metric.trend !== undefined && metric.trend !== 0"
        class="signal-band__trend"
        :class="trendClass(metric.trend)"
      >
        {{ metric.trend > 0 ? '↑' : '↓' }}{{ Math.abs(metric.trend) }}%
      </span>
      <span v-if="metric.helper" class="signal-band__helper">{{ metric.helper }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'

defineOptions({
  name: 'SignalBand',
})

withDefaults(
  defineProps<{
    metrics?: SignalMetric[]
    compact?: boolean
  }>(),
  {
    metrics: () => [],
    compact: false,
  },
)

const emit = defineEmits<{
  'metric-click': [key: string]
}>()

function toneClass(tone?: BadgeTone): string {
  return tone ? `signal-band__value--${tone}` : ''
}

function trendClass(trend?: number): string {
  if (!trend) return ''
  return trend > 0 ? 'signal-band__trend--up' : 'signal-band__trend--down'
}
</script>

<style scoped>
.signal-band {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.signal-band--compact {
  gap: 16px;
}

.signal-band__item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.signal-band__item--clickable {
  cursor: pointer;
}

.signal-band__item--clickable:hover .signal-band__value {
  color: var(--ant-color-primary, #1677ff);
}

.signal-band__label {
  font-size: var(--dp-type-hint-size, 12px);
  line-height: var(--dp-type-hint-line-height, 18px);
  color: var(--dp-text-muted, #64748b);
}

.signal-band__value {
  font-size: 20px;
  font-weight: var(--dp-font-weight-metric, 600);
  color: var(--dp-text-primary, #0f172a);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.signal-band--compact .signal-band__value {
  font-size: 16px;
}

.signal-band__unit {
  font-size: 12px;
  font-weight: 400;
  color: var(--dp-text-muted, #64748b);
}

.signal-band__trend {
  font-size: var(--dp-type-hint-size, 12px);
  font-weight: var(--dp-type-sidebar-weight-active, 600);
  font-variant-numeric: tabular-nums;
}

.signal-band__trend--up {
  color: var(--ant-color-error, #ef4444);
}

.signal-band__trend--down {
  color: var(--ant-color-success, #22c55e);
}

.signal-band__helper {
  font-size: var(--dp-type-hint-size, 12px);
  line-height: var(--dp-type-hint-line-height, 18px);
  color: var(--dp-text-muted, #94a3b8);
}

/* Tone 色调 */
.signal-band__value--green {
  color: var(--ant-color-success, #16a34a);
}

.signal-band__value--red {
  color: var(--ant-color-error, #dc2626);
}

.signal-band__value--orange {
  color: var(--ant-color-warning, #ea580c);
}

.signal-band__value--blue {
  color: var(--ant-color-primary, #2563eb);
}

.signal-band__value--purple {
  color: #7c3aed;
}

.signal-band__value--yellow {
  color: #ca8a04;
}

.signal-band__value--gray {
  color: var(--dp-text-secondary, #64748b);
}
</style>
