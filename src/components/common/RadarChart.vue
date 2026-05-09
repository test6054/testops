<template>
  <a-card v-if="card" :bordered="bordered" class="radar-chart-card" :loading="loading">
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

  <div v-else class="radar-chart-plain">
    <div class="chart-container">
      <Chart :option="chartOption" :width="width" :height="height" :auto-resize="autoResize" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EChartsCoreOption } from 'echarts/core'
import type { Component } from 'vue'
import Chart from '@/components/Chart/index.vue'
import { useChartOption } from '@/hooks'

interface RadarIndicator {
  name: string // 指标名称
  max: number // 最大值
}

interface RadarSeriesData {
  name: string // 系列名称
  value: Array<number | null> // 数据值数组
  color?: string // 颜色
  areaStyle?: boolean // 是否显示区域填充
}

interface Props {
  title: string // 图表标题
  indicators: RadarIndicator[] // 雷达图指标
  series: RadarSeriesData[] // 系列数据
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
  shape?: 'polygon' | 'circle' // 雷达图形状
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  card: true,
  bordered: false,
  width: '100%',
  height: '400px',
  autoResize: true,
  extra: false,
  showLegend: true,
  shape: 'polygon',
})

const resolveThemeColor = (value: string, fallback: string) => {
  if (!value.startsWith('var(') || typeof window === 'undefined') {
    return value || fallback
  }
  const tokenName = value.replace(/^var\((.+)\)$/, '$1').trim()
  const resolved = window.getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim()
  return resolved || fallback
}

// 使用useChartOption hook支持主题切换
const { chartOption } = useChartOption(() => {
  const primaryColor = resolveThemeColor('var(--ant-color-primary)', '#1677ff')
  const textColor = resolveThemeColor('var(--ant-color-text)', '#111827')
  const textSecondaryColor = resolveThemeColor('var(--ant-color-text-secondary)', '#6b7280')
  const borderColor = resolveThemeColor('var(--ant-color-border)', '#d9d9d9')
  const borderSecondaryColor = resolveThemeColor('var(--ant-color-border-secondary)', '#e5e7eb')
  const fillQuaternaryColor = resolveThemeColor('var(--ant-color-fill-quaternary)', '#f5f5f5')
  const fillSecondaryColor = resolveThemeColor('var(--ant-color-fill-secondary)', '#fafafa')
  const bgContainerColor = resolveThemeColor('var(--ant-color-bg-container)', '#ffffff')

  const defaultColors = [
    primaryColor,
    '#52c41a',
    '#faad14',
    '#13c2c2',
    '#ff4d4f',
  ]

  // 验证数据完整性
  if (
    !props.indicators
    || props.indicators.length === 0
    || !props.series
    || props.series.length === 0
  ) {
    return {
      title: {
        text: '暂无数据',
        left: 'center',
        top: 'middle',
        textStyle: {
          color: textSecondaryColor,
          fontSize: 14,
        },
      },
    } as EChartsCoreOption
  }

  // 检查每个系列的值数组长度是否与indicators一致
  const hasInvalidSeries = props.series.some(
    (series) => !series.value || series.value.length !== props.indicators.length,
  )

  if (hasInvalidSeries) {
    return {
      title: {
        text: '数据格式错误',
        left: 'center',
        top: 'middle',
        textStyle: {
          color: textSecondaryColor,
          fontSize: 14,
        },
      },
    } as EChartsCoreOption
  }

  return {
    color: defaultColors,
    tooltip: {
      trigger: 'item',
      backgroundColor: bgContainerColor,
      borderColor,
      textStyle: {
        color: textColor,
      },
    },
    legend: {
      show: props.showLegend,
      data: props.series.map((s) => s.name),
      bottom: 0,
      textStyle: {
        color: textSecondaryColor,
      },
    },
    radar: {
      indicator: props.indicators.map((ind) => ({
        name: ind.name,
        max: ind.max,
      })),
      shape: props.shape,
      splitNumber: 5,
      axisName: {
        color: textSecondaryColor,
      },
      splitLine: {
        lineStyle: {
          color: borderSecondaryColor,
        },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: [fillQuaternaryColor, fillSecondaryColor],
        },
      },
      axisLine: {
        lineStyle: {
          color: borderColor,
        },
      },
    },
    series: [
      {
        type: 'radar',
        data: props.series.map((item, index) => ({
          name: item.name,
          value: item.value,
          itemStyle: {
            color: item.color ? resolveThemeColor(item.color, defaultColors[index % defaultColors.length]) : defaultColors[index % defaultColors.length],
          },
          lineStyle: {
            width: 2.5,
          },
          areaStyle: item.areaStyle !== false
            ? {
                color: item.color
                  ? resolveThemeColor(item.color, defaultColors[index % defaultColors.length])
                  : defaultColors[index % defaultColors.length],
                opacity: 0.26,
              }
            : undefined,
        })),
      },
    ],
  } as EChartsCoreOption
})
</script>

<style lang="scss" scoped>
.radar-chart-card {
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

.radar-chart-plain {
  width: 100%;
}
</style>
