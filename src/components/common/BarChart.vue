<template>
  <a-card v-if="card" :bordered="bordered" class="bar-chart-card" :loading="loading">
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
      <Chart :option="chartOption" :width="width" :height="height" :auto-resize="autoResize" />
    </div>
  </a-card>

  <div v-else class="bar-chart-plain">
    <div class="chart-container">
      <Chart :option="chartOption" :width="width" :height="height" :auto-resize="autoResize" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import Chart from '@/components/Chart/index.vue'
import { useChartOption } from '@/hooks'

interface BarSeriesData {
  name: string // 系列名称
  data: number[] // 数据数组
  color?: string // 柱条颜色
  stack?: string // 堆叠分组
}

interface Props {
  title: string // 图表标题
  xAxisData: string[] // X轴数据
  series: BarSeriesData[] // 系列数据
  icon?: Component // 标题图标
  loading?: boolean // 加载状态
  /** 是否使用内置卡片容器（需要外层自定义卡片时可关闭，避免卡片嵌套） */
  card?: boolean
  bordered?: boolean // 是否显示边框
  width?: string // 图表宽度
  height?: string // 图表高度
  autoResize?: boolean // 自动调整大小
  extra?: boolean // 是否有额外内容
  showLegend?: boolean // 是否显示图例
  yAxisName?: string // Y轴名称
  horizontal?: boolean // 是否横向柱状图
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  card: true,
  bordered: false,
  width: '100%',
  height: '350px',
  autoResize: true,
  extra: false,
  showLegend: true,
  horizontal: false,
})

// 默认颜色方案
const defaultColors = [
  'var(--ant-color-primary)',
  'var(--ant-color-success-hover)',
  'var(--ant-color-warning)',
  'var(--ant-color-success)',
  'var(--ant-color-error)',
  'var(--ant-color-primary-hover)',
]

// 使用 useChartOption hook 生成图表配置
const { chartOption } = useChartOption(() => {
  const axisConfig = {
    axisLine: {
      lineStyle: {
        color: 'var(--ant-color-border)',
      },
    },
    axisLabel: {
      color: 'var(--ant-color-text-secondary)',
    },
    splitLine: {
      lineStyle: {
        color: 'var(--ant-color-border-secondary)',
      },
    },
  }

  return {
    color: defaultColors,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--ant-color-bg-container)',
      borderColor: 'var(--ant-color-border)',
      textStyle: {
        color: 'var(--ant-color-text)',
      },
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      show: props.showLegend,
      data: props.series.map((s) => s.name),
      bottom: 0,
      textStyle: {
        color: 'var(--ant-color-text-secondary)',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: props.showLegend ? '12%' : '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: props.horizontal
      ? {
          type: 'value',
          name: props.yAxisName,
          nameTextStyle: {
            color: 'var(--ant-color-text-secondary)',
          },
          ...axisConfig,
        }
      : {
          type: 'category',
          data: props.xAxisData,
          ...axisConfig,
        },
    yAxis: props.horizontal
      ? {
          type: 'category',
          data: props.xAxisData,
          ...axisConfig,
        }
      : {
          type: 'value',
          name: props.yAxisName,
          nameTextStyle: {
            color: 'var(--ant-color-text-secondary)',
          },
          min: 0,
          max: (value: { max: number }) => Math.max(value.max || 0, 5),
          minInterval: 1,
          ...axisConfig,
        },
    series: props.series.map((item, index) => ({
      name: item.name,
      type: 'bar',
      stack: item.stack,
      data: item.data,
      itemStyle: {
        color: item.color || defaultColors[index % defaultColors.length],
        borderRadius: props.horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
      },
      emphasis: {
        focus: 'series',
      },
      barMaxWidth: 40,
    })),
  }
})
</script>

<style lang="scss" scoped>
.bar-chart-card {
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

.bar-chart-plain {
  width: 100%;
}
</style>
