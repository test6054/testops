<template>
  <figure class="mark-chart-host" :class="hostSizeClass">
    <VChart
      ref="vChartRef"
      class="mark-chart"
      :class="chartVariantClass"
      :style="chartStyle"
      :theme="MARK_ECHARTS_THEME"
      :option="option"
      :autoresize="autoResize"
      :loading="loading"
      :loading-options="loadingOptions"
      role="img"
      :aria-label="resolvedAriaLabel"
      tabindex="0"
      @click="handleChartClick"
      @brush-selected="handleBrushSelected"
    />
    <figcaption class="mark-chart-host__sr">
      {{ resolvedAriaLabel }}
    </figcaption>
  </figure>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import { MARK_ECHARTS_THEME } from '@/config/mark-echarts-theme'

defineOptions({ name: 'MarkChart' })

const props = withDefaults(
  defineProps<{
    option: EChartsCoreOption
    autoResize?: boolean
    loading?: boolean
    width?: string
    height?: string
    ariaLabel?: string
    variant?: MarkChartVariant
    gaugeSize?: MarkChartGaugeSize
  }>(),
  {
    autoResize: true,
    loading: false,
    width: '100%',
    height: '300px',
    ariaLabel: '',
    variant: 'default',
    gaugeSize: 'md',
  },
)
const emit = defineEmits<{
  (e: 'chart-click', params: unknown): void
  (e: 'brush-selected', params: unknown): void
}>()
type MarkChartVariant = 'default' | 'gauge' | 'distribution' | 'compact'
type MarkChartGaugeSize = 'sm' | 'md' | 'lg'

const vChartRef = ref<InstanceType<typeof VChart> | null>(null)

function handleChartClick(params: unknown): void {
  emit('chart-click', params)
}

function handleBrushSelected(params: unknown): void {
  emit('brush-selected', params)
}

const loadingOptions = {
  text: '加载中',
  color: 'var(--ant-color-primary, #1677ff)',
  textColor: 'var(--dp-text-secondary, #64748b)',
  maskColor: 'rgba(255, 255, 255, 0.72)',
  fontSize: 12,
  showSpinner: true,
  spinnerRadius: 8,
  lineWidth: 2,
}

const resolvedAriaLabel = computed(() => {
  const label = props.ariaLabel.trim()
  if (label) {
    return label
  }
  const titleText = props.option.title
  if (typeof titleText === 'object' && titleText && 'text' in titleText && titleText.text) {
    return String(titleText.text)
  }
  return '统计图表'
})

const hostSizeClass = computed(() => {
  if (props.variant !== 'gauge') {
    return undefined
  }
  return `mark-chart-host--gauge-${props.gaugeSize}`
})

const chartVariantClass = computed(() => {
  if (props.variant === 'default') {
    return undefined
  }
  return `mark-chart--${props.variant}`
})

const chartStyle = computed(() => ({
  width: props.variant === 'gauge' ? '100%' : props.width,
  height: props.height,
}))

defineExpose({
  getInstance: () => vChartRef.value?.chart,
  resize: () => vChartRef.value?.resize(),
})
</script>
