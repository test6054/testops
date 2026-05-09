<template>
  <a-card :bordered="bordered" class="heatmap-chart-card" :loading="loading">
    <template #title>
      <div class="chart-header">
        <component v-if="icon" :is="icon" class="header-icon" />
        <span class="header-title">{{ title }}</span>
      </div>
    </template>

    <template v-if="extra" #extra>
      <slot name="extra"></slot>
    </template>

    <div class="chart-container">
      <Chart
        :option="chartOption"
        :width="width"
        :height="height"
        :auto-resize="autoResize"
      />
    </div>
  </a-card>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import Chart from '@/components/Chart/index.vue'
import { useChartOption } from '@/hooks'

interface HeatmapData {
  xIndex: number // X轴索引
  yIndex: number // Y轴索引
  value: number // 数值
}

interface Props {
  title: string // 图表标题
  xAxisData: string[] // X轴数据
  yAxisData: string[] // Y轴数据
  data: HeatmapData[] // 热力图数据
  icon?: Component // 标题图标
  loading?: boolean // 加载状态
  bordered?: boolean // 是否显示边框
  width?: string // 图表宽度
  height?: string // 图表高度
  autoResize?: boolean // 自动调整大小
  extra?: boolean // 是否有额外内容
  min?: number | null // 最小值
  max?: number | null // 最大值
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  bordered: false,
  width: '100%',
  height: '400px',
  autoResize: true,
  extra: false,
  min: null,
  max: null,
})

// 计算最小值和最大值
const minValue = computed(() => {
  return props.min !== null ? props.min : Math.min(...props.data.map(d => d.value))
})

const maxValue = computed(() => {
  return props.max !== null ? props.max : Math.max(...props.data.map(d => d.value))
})

// 使用useChartOption hook支持主题切换
const { chartOption } = useChartOption(() => {
  return {
    tooltip: {
      position: 'top',
      backgroundColor: 'var(--ant-color-bg-container)',
      borderColor: 'var(--ant-color-border)',
      textStyle: {
        color: 'var(--ant-color-text)',
      },
      formatter: (params: Record<string, unknown>) => {
        const d = params.data as number[]
        return `${props.yAxisData[d[1]]}<br/>${props.xAxisData[d[0]]}: <strong>${d[2]}</strong>`
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: props.xAxisData,
      splitArea: {
        show: true,
      },
      axisLine: {
        lineStyle: {
          color: 'var(--ant-color-border)',
        },
      },
      axisLabel: {
        color: 'var(--ant-color-text-secondary)',
      },
    },
    yAxis: {
      type: 'category',
      data: props.yAxisData,
      splitArea: {
        show: true,
      },
      axisLine: {
        lineStyle: {
          color: 'var(--ant-color-border)',
        },
      },
      axisLabel: {
        color: 'var(--ant-color-text-secondary)',
      },
    },
    visualMap: {
      min: minValue.value,
      max: maxValue.value,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0',
      inRange: {
        color: [
          'var(--ant-color-primary-bg)',
          'var(--ant-color-warning)',
          'var(--ant-color-error)',
        ],
      },
      textStyle: {
        color: 'var(--ant-color-text-secondary)',
      },
    },
    series: [
      {
        name: props.title,
        type: 'heatmap',
        data: props.data.map(d => [d.xIndex, d.yIndex, d.value]),
        label: {
          show: true,
          color: 'var(--ant-color-text)',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'var(--ant-color-text-quaternary)',
          },
        },
      },
    ],
  }
})
</script>

<style lang="scss" scoped>
.heatmap-chart-card {
  border-radius: var(--dp-radius-md);

  :deep(.ant-card-header) {
    padding: 16px 20px;
    border-bottom: 1px solid var(--ant-color-border-secondary);
  }

  :deep(.ant-card-body) {
    padding: 20px;
  }
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 8px;

  .header-icon {
    font-size: 18px;
    color: var(--ant-color-primary);
  }

  .header-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--ant-color-text);
  }
}

.chart-container {
  width: 100%;
}
</style>
