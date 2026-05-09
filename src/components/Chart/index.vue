<template>
  <div ref="chartContainer" :style="{ width, height }"></div>
</template>

<script lang="ts" setup>
import type {EChartsCoreOption} from 'echarts/core'
import * as echarts from 'echarts/core'
import {nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'

const props = defineProps({
  option: {
    type: Object as () => EChartsCoreOption,
    default() {
      return {}
    },
  },
  autoResize: {
    type: Boolean,
    default: true,
  },
  width: {
    type: String,
    default: '100%',
  },
  height: {
    type: String,
    default: '100%',
  },
})

const chartContainer = ref<HTMLDivElement | null>(null)
let chartInstance: ReturnType<typeof echarts.init> | null = null
let resizeObserver: ResizeObserver | null = null

// 初始化图表
const initChart = () => {
  if (!chartContainer.value) return
  chartInstance = echarts.init(chartContainer.value)
  chartInstance.setOption(props.option)
}

// 监听 option 变化
watch(() => props.option, (newOption) => {
  if (chartInstance && newOption) {
    chartInstance.setOption(newOption, true)
    scheduleResize()
  }
}, {deep: true})

// 容器大小变化时调整图表大小
const handleResize = () => {
  chartInstance?.resize()
}

const scheduleResize = () => {
  nextTick(() => {
    requestAnimationFrame(() => {
      handleResize()
    })
  })
}

onMounted(() => {
  initChart()
  if (props.autoResize) {
    window.addEventListener('resize', handleResize)
    if (chartContainer.value) {
      resizeObserver = new ResizeObserver(() => {
        handleResize()
      })
      resizeObserver.observe(chartContainer.value)
    }
  }
  scheduleResize()
})

// 组件卸载前清理 ECharts 实例
onBeforeUnmount(() => {
  if (props.autoResize) {
    window.removeEventListener('resize', handleResize)
    resizeObserver?.disconnect()
    resizeObserver = null
  }
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})

defineExpose({
  chart: chartInstance,
})
</script>

<style lang="scss" scoped></style>
