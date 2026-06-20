<template>
  <section v-if="visible" class="mark-trend-section">
    <header v-if="title.trim()" class="mark-trend-section__head">
      <strong class="mark-trend-section__title">{{ title }}</strong>
      <span v-if="hint" class="mark-trend-section__hint">{{ hint }}</span>
    </header>
    <MarkChart
      v-if="ready"
      :option="option"
      :height="height"
      :aria-label="resolvedAriaLabel"
      class="mark-trend-section__canvas"
    />
    <div v-else class="mark-trend-section__empty">
      <UiEmpty size="sm" :description="emptyMessage" />
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import { computed } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import {
  formatTrendAriaLabel,
  MARK_CHART_EMPTY,
  MARK_TREND_MIN_POINTS,
} from '@/utils/mark-chart-accessibility'
import MarkChart from './MarkChart.vue'

defineOptions({ name: 'MarkTrendSection' })

const props = withDefaults(defineProps<{
  title: string
  hint?: string
  pointCount: number
  minPoints?: number
  option: EChartsCoreOption
  height?: string
  ariaLabel?: string
  emptyDescription?: string
  singlePointDescription?: string
  visible?: boolean
  lastValue?: number | null
  valueUnit?: string
}>(), {
  hint: '',
  minPoints: MARK_TREND_MIN_POINTS,
  height: '280px',
  ariaLabel: '',
  emptyDescription: MARK_CHART_EMPTY.trendNeedMoreExams,
  singlePointDescription: MARK_CHART_EMPTY.trendNeedMoreExams,
  visible: true,
  lastValue: null,
  valueUnit: '',
})

const ready = computed(() => props.pointCount >= props.minPoints)

const emptyMessage = computed(() => {
  if (props.pointCount === 1) {
    return props.singlePointDescription
  }
  if (props.pointCount <= 0) {
    return props.emptyDescription
  }
  return props.emptyDescription
})

const resolvedAriaLabel = computed(() => {
  if (props.ariaLabel.trim()) {
    return props.ariaLabel.trim()
  }
  return formatTrendAriaLabel(props.title, props.pointCount, props.lastValue, props.valueUnit)
})
</script>
