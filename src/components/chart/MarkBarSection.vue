<template>
  <section v-if="visible" class="mark-bar-section">
    <header v-if="title.trim()" class="mark-bar-section__head">
      <strong class="mark-bar-section__title">{{ title }}</strong>
      <span v-if="hint" class="mark-bar-section__hint">{{ hint }}</span>
    </header>
    <MarkChart
      v-if="ready"
      :option="option"
      :height="height"
      :aria-label="resolvedAriaLabel"
      class="mark-bar-section__canvas"
    />
    <div v-else class="mark-bar-section__empty">
      <UiEmpty size="sm" :description="emptyDescription" />
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import { computed } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { MARK_CHART_EMPTY } from '@/utils/mark-chart-accessibility'
import MarkChart from './MarkChart.vue'

defineOptions({ name: 'MarkBarSection' })

const props = withDefaults(defineProps<{
  title: string
  hint?: string
  itemCount: number
  option: EChartsCoreOption
  height?: string
  ariaLabel?: string
  emptyDescription?: string
  visible?: boolean
}>(), {
  hint: '',
  height: '280px',
  ariaLabel: '',
  emptyDescription: MARK_CHART_EMPTY.barNoData,
  visible: true,
})

const ready = computed(() => props.itemCount > 0)

const resolvedAriaLabel = computed(() => {
  if (props.ariaLabel.trim()) {
    return props.ariaLabel.trim()
  }
  return `${props.title}，${props.itemCount > 0 ? `共 ${props.itemCount} 项` : '暂无数据'}`
})
</script>
