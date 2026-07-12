<template>
  <section v-if="visible" class="mark-heatmap-section">
    <header v-if="title.trim()" class="mark-heatmap-section__head">
      <strong class="mark-heatmap-section__title">{{ title }}</strong>
      <span v-if="hint" class="mark-heatmap-section__hint">{{ hint }}</span>
    </header>
    <MarkChart
      v-if="ready"
      :option="option"
      :height="height"
      :aria-label="resolvedAriaLabel"
      class="mark-heatmap-section__canvas"
      @chart-click="handleChartClick"
    />
    <div v-else class="mark-heatmap-section__empty">
      <UiEmpty size="sm" :description="emptyDescription" />
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import { computed } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { MARK_CHART_EMPTY } from '@/utils/mark-chart-accessibility'
import { resolveHeatmapDataValue } from '@/utils/mark-echarts-options'
import MarkChart from './MarkChart.vue'

defineOptions({ name: 'MarkHeatmapSection' })

const props = withDefaults(
  defineProps<{
    title: string
    hint?: string
    cellCount: number
    option: EChartsCoreOption
    height?: string
    ariaLabel?: string
    emptyDescription?: string
    visible?: boolean
  }>(),
  {
    hint: '',
    height: '120px',
    ariaLabel: '',
    emptyDescription: MARK_CHART_EMPTY.heatmapNoData,
    visible: true,
  },
)

const emit = defineEmits<{
  (e: 'cell-click', index: number): void
}>()

const ready = computed(() => props.cellCount > 0)

const resolvedAriaLabel = computed(() => {
  if (props.ariaLabel.trim()) {
    return props.ariaLabel.trim()
  }
  return `${props.title}，${props.cellCount > 0 ? `共 ${props.cellCount} 格` : '当前没有可展示的内容'}`
})

/** 将 ECharts 热力图点击映射为单元格下标，供页面选中题目。 */
function handleChartClick(params: unknown): void {
  if (!params || typeof params !== 'object') return
  const value = resolveHeatmapDataValue((params as { value?: unknown }).value)
  if (!value || value.length < 1) return
  const index = Number(value[0])
  if (!Number.isFinite(index) || index < 0) return
  emit('cell-click', index)
}
</script>
