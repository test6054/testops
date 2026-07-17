<template>
  <section v-if="visible" class="mark-bar-section">
    <header v-if="title.trim()" class="mark-bar-section__head">
      <strong class="mark-bar-section__title">{{ title }}</strong>
      <span v-if="hint" class="mark-bar-section__hint">{{ hint }}</span>
    </header>
    <MarkChart
      :option="resolvedOption"
      :height="height"
      :aria-label="resolvedAriaLabel"
      class="mark-bar-section__canvas"
    />
  </section>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import { computed } from 'vue'
import { MARK_CHART_EMPTY } from '@/utils/mark-chart-accessibility'
import { resolveMarkChartSectionOption } from '@/utils/mark-echarts-options'
import MarkChart from './MarkChart.vue'

defineOptions({ name: 'MarkBarSection' })

const props = withDefaults(
  defineProps<{
    title: string
    hint?: string
    itemCount: number
    option: EChartsCoreOption
    height?: string
    ariaLabel?: string
    emptyDescription?: string
    visible?: boolean
    /** 横向条形图空壳与纵向柱状图轴布局不同 */
    orientation?: 'vertical' | 'horizontal'
  }>(),
  {
    hint: '',
    height: '280px',
    ariaLabel: '',
    emptyDescription: MARK_CHART_EMPTY.barNoData,
    visible: true,
    orientation: 'vertical',
  },
)

const ready = computed(() => props.itemCount > 0)

const shellKind = computed(() =>
  props.orientation === 'horizontal' ? 'bar-horizontal' : 'bar',
)

const resolvedOption = computed(() =>
  resolveMarkChartSectionOption(
    ready.value,
    props.option,
    shellKind.value,
    props.emptyDescription,
  ),
)

const resolvedAriaLabel = computed(() => {
  if (props.ariaLabel.trim()) {
    return props.ariaLabel.trim()
  }
  return `${props.title}，${props.itemCount > 0 ? `共 ${props.itemCount} 项` : '暂无数据'}`
})
</script>
