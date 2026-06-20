<template>
  <div
    class="mark-gauge-block"
    :class="{ 'mark-gauge-block--stacked': layout === 'stacked' }"
  >
    <MarkChart
      :option="option"
      variant="gauge"
      :gauge-size="gaugeSize"
      :height="gaugeHeight"
      :width="gaugeWidth"
      :aria-label="ariaLabel"
      class="mark-gauge-block__chart"
    />
    <div v-if="$slots.default" class="mark-gauge-block__meta">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import MarkChart from './MarkChart.vue'

defineOptions({ name: 'MarkGaugeBlock' })

type MarkGaugeLayout = 'inline' | 'stacked'
type MarkGaugeSize = 'sm' | 'md' | 'lg'

withDefaults(defineProps<{
  option: EChartsCoreOption
  ariaLabel: string
  layout?: MarkGaugeLayout
  gaugeSize?: MarkGaugeSize
  gaugeHeight?: string
  gaugeWidth?: string
}>(), {
  layout: 'inline',
  gaugeSize: 'md',
  gaugeHeight: '160px',
  gaugeWidth: '160px',
})
</script>
