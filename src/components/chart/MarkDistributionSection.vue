<template>
  <section v-if="visible" class="mark-distribution-section">
    <header v-if="title.trim()" class="mark-distribution-section__head">
      <strong class="mark-distribution-section__title">{{ title }}</strong>
      <span v-if="hint" class="mark-distribution-section__hint">{{ hint }}</span>
    </header>
    <MarkChart
      :option="resolvedOption"
      variant="distribution"
      :height="height"
      :aria-label="resolvedAriaLabel"
      class="mark-distribution-section__canvas"
    />
  </section>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import { computed } from 'vue'
import { MARK_CHART_EMPTY } from '@/utils/mark-chart-accessibility'
import { resolveMarkChartSectionOption } from '@/utils/mark-echarts-options'
import MarkChart from './MarkChart.vue'

defineOptions({ name: 'MarkDistributionSection' })

const props = withDefaults(
  defineProps<{
    title: string
    hint?: string
    total: number
    option: EChartsCoreOption
    height?: string
    ariaLabel?: string
    emptyDescription?: string
    visible?: boolean
  }>(),
  {
    hint: '',
    height: '72px',
    ariaLabel: '',
    emptyDescription: MARK_CHART_EMPTY.distributionNoData,
    visible: true,
  },
)

const ready = computed(() => props.total > 0)

const resolvedOption = computed(() =>
  resolveMarkChartSectionOption(
    ready.value,
    props.option,
    'distribution',
    props.emptyDescription,
  ),
)

const resolvedAriaLabel = computed(() => {
  if (props.ariaLabel.trim()) {
    return props.ariaLabel.trim()
  }
  return `${props.title}，${props.total > 0 ? `共 ${props.total} 项` : '暂无数据'}`
})
</script>
