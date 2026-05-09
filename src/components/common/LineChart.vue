<template>
  <a-card :bordered="bordered" class="line-chart-card" :loading="loading">
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
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import Chart from '@/components/Chart/index.vue'
import { useChartOption } from '@/hooks'

interface LineSeriesData {
  name: string // 系列名称
  data: number[] // 数据数组
  color?: string // 线条颜色
  smooth?: boolean // 是否平滑曲线
  areaStyle?: boolean | Record<string, unknown> // 是否显示区域填充或完整的区域样式配置
  type?: string // 系列类型
  itemStyle?: Record<string, unknown> // 图形样式
  lineStyle?: Record<string, unknown> // 线条样式
  [key: string]: unknown // 支持任意额外的 ECharts series 配置
}

interface Props {
  title: string // 图表标题
  xAxisData: string[] // X轴数据
  series: LineSeriesData[] // 系列数据
  icon?: Component // 标题图标
  loading?: boolean // 加载状态
  bordered?: boolean // 是否显示边框
  width?: string // 图表宽度
  height?: string // 图表高度
  autoResize?: boolean // 自动调整大小
  extra?: boolean // 是否有额外内容
  showLegend?: boolean // 是否显示图例
  yAxisName?: string // Y轴名称
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  bordered: false,
  width: '100%',
  height: '350px',
  autoResize: true,
  extra: false,
  showLegend: true,
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
        type: 'cross',
        label: {
          backgroundColor: 'var(--ant-color-fill-secondary)',
        },
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
      top: '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.xAxisData,
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
      type: 'value',
      name: props.yAxisName,
      nameTextStyle: {
        color: 'var(--ant-color-text-secondary)',
        padding: [0, 0, 0, 40],
      },
      nameGap: 10,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: 'var(--ant-color-text-secondary)',
      },
      splitLine: {
        lineStyle: {
          color: 'var(--ant-color-border-secondary)',
        },
      },
    },
    series: props.series.map((item, index) => {
      // 如果提供了完整的配置，使用提供的配置；否则使用默认配置
      const baseConfig: Record<string, unknown> = {
        name: item.name,
        type: (item.type || 'line') as 'line',
        smooth: item.smooth !== false,
        data: item.data,
        itemStyle: item.itemStyle || {
          color: item.color || defaultColors[index % defaultColors.length],
        },
        lineStyle: item.lineStyle || {
          width: 2,
        },
        areaStyle:
          typeof item.areaStyle === 'boolean'
            ? item.areaStyle
              ? { opacity: 0.2 }
              : undefined
            : item.areaStyle,
        emphasis: {
          focus: 'series',
        },
      }

      // 合并任意额外的配置
      const extraConfig: Record<string, unknown> = { ...item }
      delete extraConfig.name
      delete extraConfig.data
      delete extraConfig.color
      delete extraConfig.smooth
      delete extraConfig.type
      delete extraConfig.itemStyle
      delete extraConfig.lineStyle
      delete extraConfig.areaStyle
      return { ...baseConfig, ...extraConfig }
    }),
  }
})
</script>

<style lang="scss" scoped>
.line-chart-card {
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
