<template>
  <figure class="mark-chart-host" :class="hostSizeClass" :style="hostStyle">
    <div v-if="!engineReady || empty || error || engineError" class="mark-chart-host__state" role="status">
      <UiEmpty
        v-if="empty || error || engineError"
        size="sm"
        :title="error || engineError ? '图表加载失败' : undefined"
        :description="stateDescription"
      />
      <div v-else class="mark-chart-host__boot" aria-live="polite">图表引擎加载中</div>
    </div>
    <VChart
      v-else
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
    <figcaption
      class="mark-chart-host__caption"
      :class="{ 'mark-chart-host__caption--sr': !showCaption }"
    >
      {{ resolvedCaption }}
    </figcaption>
  </figure>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import { computed, onMounted, provide, ref } from 'vue'
import VChart, { UPDATE_OPTIONS_KEY } from 'vue-echarts'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { MARK_ECHARTS_THEME } from '@/config/mark-echarts-theme-name'
import { ensureVueECharts } from '@/plugins/vue-echarts'

defineOptions({ name: 'MarkChart' })

const props = withDefaults(
  defineProps<{
    option: EChartsCoreOption
    autoResize?: boolean
    loading?: boolean
    /** 无数据时展示紧凑空态，不渲染 ECharts 实例 */
    empty?: boolean
    emptyDescription?: string
    /** 失败态：展示错误说明，保留可访问摘要 */
    error?: boolean
    errorDescription?: string
    width?: string
    height?: string
    ariaLabel?: string
    /** 可见文本摘要；默认仅供读屏 */
    caption?: string
    showCaption?: boolean
    variant?: MarkChartVariant
    gaugeSize?: MarkChartGaugeSize
  }>(),
  {
    autoResize: true,
    loading: false,
    empty: false,
    emptyDescription: '暂无图表数据',
    error: false,
    errorDescription: '请稍后重试或检查数据源',
    width: '100%',
    height: '240px',
    ariaLabel: '',
    caption: '',
    showCaption: false,
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
const engineReady = ref(false)
const engineError = ref(false)

// 图表级 update 策略：notMerge 避免 option 局部残留
provide(UPDATE_OPTIONS_KEY, { notMerge: true })

onMounted(() => {
  ensureVueECharts()
    .then(() => {
      engineReady.value = true
    })
    .catch(() => {
      engineError.value = true
    })
})

function handleChartClick(params: unknown): void {
  emit('chart-click', params)
}

function handleBrushSelected(params: unknown): void {
  emit('brush-selected', params)
}

const loadingOptions = {
  text: '加载中',
  color: 'var(--dp-color-primary)',
  textColor: 'var(--dp-text-secondary)',
  maskColor: 'color-mix(in srgb, var(--dp-surface) 72%, transparent)',
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
  const titleText = props.option?.title
  if (typeof titleText === 'object' && titleText && 'text' in titleText && titleText.text) {
    return String(titleText.text)
  }
  return '统计图表'
})

const resolvedCaption = computed(() => {
  const caption = props.caption.trim()
  if (caption) {
    return caption
  }
  if (props.error || engineError.value) {
    return props.errorDescription.trim() || '图表加载失败'
  }
  if (props.empty) {
    return props.emptyDescription.trim() || '暂无图表数据'
  }
  return resolvedAriaLabel.value
})

const stateDescription = computed(() => {
  if (props.error || engineError.value) {
    return props.errorDescription.trim() || '请稍后重试或检查数据源'
  }
  return props.emptyDescription.trim() || '暂无图表数据'
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

const hostStyle = computed(() => ({
  width: props.width,
  minHeight: !engineReady.value || props.empty || props.error || engineError.value
    ? props.height
    : undefined,
}))

defineExpose({
  getInstance: () => vChartRef.value?.chart,
  resize: () => vChartRef.value?.resize(),
})
</script>

<style scoped lang="scss">
.mark-chart-host {
  margin: 0;
  width: 100%;
  min-width: 0;
}

.mark-chart-host__state {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: inherit;
  padding: var(--dp-space-component) 0;
}

.mark-chart-host__boot {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.mark-chart-host__caption {
  margin-top: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  line-height: 1.4;
  color: var(--dp-text-secondary);
}

.mark-chart-host__caption--sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.mark-chart {
  width: 100%;
  min-width: 0;
}

.mark-chart-host--gauge-sm,
.mark-chart-host--gauge-md,
.mark-chart-host--gauge-lg {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
