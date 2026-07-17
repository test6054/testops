<template>
  <section v-if="visible" class="mark-scatter-section">
    <header v-if="title.trim()" class="mark-scatter-section__head">
      <strong class="mark-scatter-section__title">{{ title }}</strong>
      <span v-if="hint" class="mark-scatter-section__hint">{{ hint }}</span>
    </header>
    <MarkChart
      ref="markChartRef"
      :option="resolvedOption"
      :height="height"
      :aria-label="resolvedAriaLabel"
      class="mark-scatter-section__canvas"
      @brush-selected="(params) => emit('brush-selected', params)"
    />
  </section>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import { computed, ref } from 'vue'
import { MARK_CHART_EMPTY } from '@/utils/mark-chart-accessibility'
import { resolveMarkChartSectionOption } from '@/utils/mark-echarts-options'
import MarkChart from './MarkChart.vue'

defineOptions({ name: 'MarkScatterSection' })

const props = withDefaults(
  defineProps<{
    title: string
    hint?: string
    pointCount: number
    option: EChartsCoreOption
    height?: string
    ariaLabel?: string
    emptyDescription?: string
    visible?: boolean
  }>(),
  {
    hint: '',
    height: '300px',
    ariaLabel: '',
    emptyDescription: MARK_CHART_EMPTY.scatterNoData,
    visible: true,
  },
)

const emit = defineEmits<{
  (e: 'brush-selected', params: unknown): void
}>()

const markChartRef = ref<InstanceType<typeof MarkChart> | null>(null)

const ready = computed(() => props.pointCount > 0)

const resolvedOption = computed(() =>
  resolveMarkChartSectionOption(ready.value, props.option, 'scatter', props.emptyDescription),
)

const resolvedAriaLabel = computed(() => {
  if (props.ariaLabel.trim()) {
    return props.ariaLabel.trim()
  }
  return `${props.title}，${props.pointCount > 0 ? `共 ${props.pointCount} 题` : '暂无数据'}`
})

/** 清除 ECharts brush 选区，与下方题目清单联动 */
function clearBrush(): void {
  markChartRef.value?.getInstance()?.dispatchAction({ type: 'brush', command: 'clear', areas: [] })
}

defineExpose({ clearBrush })
</script>
