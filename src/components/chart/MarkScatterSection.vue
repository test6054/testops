<template>
  <section v-if="visible" class="mark-scatter-section">
    <header v-if="title.trim()" class="mark-scatter-section__head">
      <strong class="mark-scatter-section__title">{{ title }}</strong>
      <span v-if="hint" class="mark-scatter-section__hint">{{ hint }}</span>
    </header>
    <MarkChart
      v-if="ready"
      :option="option"
      :height="height"
      :aria-label="resolvedAriaLabel"
      class="mark-scatter-section__canvas"
    />
    <div v-else class="mark-scatter-section__empty">
      <UiEmpty size="sm" :description="emptyDescription" />
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import { computed } from 'vue'
import MarkChart from './MarkChart.vue'
import { UiEmpty } from '@/components/ui-guide/ui'
import { MARK_CHART_EMPTY } from '@/utils/mark-chart-accessibility'

defineOptions({ name: 'MarkScatterSection' })

const props = withDefaults(defineProps<{
  title: string
  hint?: string
  pointCount: number
  option: EChartsCoreOption
  height?: string
  ariaLabel?: string
  emptyDescription?: string
  visible?: boolean
}>(), {
  hint: '',
  height: '300px',
  ariaLabel: '',
  emptyDescription: MARK_CHART_EMPTY.scatterNoData,
  visible: true,
})

const ready = computed(() => props.pointCount > 0)

const resolvedAriaLabel = computed(() => {
  if (props.ariaLabel.trim()) {
    return props.ariaLabel.trim()
  }
  return `${props.title}，${props.pointCount > 0 ? `共 ${props.pointCount} 题` : '暂无数据'}`
})
</script>
