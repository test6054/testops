<template>
  <a-card v-if="card" :bordered="bordered" class="pie-chart-card" :loading="loading">
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
      <!-- 图例说明 - 左侧垂直排列 -->
      <div v-if="showLegend && dataSource && dataSource.length > 0" class="chart-legend">
        <div
          v-for="(item, index) in dataSource"
          :key="index"
          class="legend-item"
        >
          <span class="legend-color" :style="{ backgroundColor: item.color || defaultColors[index % defaultColors.length] }"></span>
          <div class="legend-content">
            <div class="legend-name">{{ item.name }}</div>
            <div class="legend-value">{{ formatValue(item.value) }}</div>
          </div>
        </div>
      </div>

      <!-- 图表 -->
      <div class="chart-wrapper">
        <Chart
          :option="chartOption"
          :width="width"
          :height="height"
          :auto-resize="autoResize"
        />
      </div>
    </div>
  </a-card>

  <div v-else class="pie-chart-plain">
    <div class="chart-container">
      <!-- 图例说明 - 左侧垂直排列 -->
      <div v-if="showLegend && dataSource && dataSource.length > 0" class="chart-legend">
        <div
          v-for="(item, index) in dataSource"
          :key="index"
          class="legend-item"
        >
          <span class="legend-color" :style="{ backgroundColor: item.color || defaultColors[index % defaultColors.length] }"></span>
          <div class="legend-content">
            <div class="legend-name">{{ item.name }}</div>
            <div class="legend-value">{{ formatValue(item.value) }}</div>
          </div>
        </div>
      </div>

      <!-- 图表 -->
      <div class="chart-wrapper">
        <Chart
          :option="chartOption"
          :width="width"
          :height="height"
          :auto-resize="autoResize"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import Chart from '@/components/Chart/index.vue'
import { useChartOption } from '@/hooks'

interface PieDataItem {
  name: string
  value: number
  color?: string
}

interface Props {
  title: string // 图表标题
  dataSource: PieDataItem[] // 饼图数据
  icon?: Component // 标题图标
  loading?: boolean // 加载状态
  /** 是否使用内置卡片容器（需要外层自定义卡片时可关闭，避免卡片嵌套） */
  card?: boolean
  bordered?: boolean // 是否显示边框
  showLegend?: boolean // 是否显示图例
  width?: string // 图表宽度
  height?: string // 图表高度
  autoResize?: boolean // 自动调整大小
  extra?: boolean // 是否有额外内容
  radius?: [string, string] // 饼图半径 ['内半径', '外半径']
  center?: [string, string] // 饼图中心位置 ['x', 'y']
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  card: true,
  bordered: true,
  showLegend: true,
  width: '100%',
  height: '300px',
  autoResize: true,
  extra: false,
  radius: () => ['40%', '70%'],
  center: () => ['50%', '50%'],
})

// 默认颜色方案
const defaultColors = [
  'var(--ant-color-primary)',
  'var(--ant-color-success-hover)',
  'var(--ant-color-warning)',
  'var(--ant-color-error)',
  'var(--ant-color-success)',
  'var(--ant-color-primary-hover)',
  'var(--ant-color-warning-hover)',
  'var(--ant-color-primary-border)',
]

// 使用useChartOption hook支持主题切换
const { chartOption } = useChartOption(() => {
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
      backgroundColor: 'var(--ant-color-bg-container)',
      borderColor: 'var(--ant-color-border)',
      textStyle: {
        color: 'var(--ant-color-text)',
      },
    },
    legend: {
      show: false, // 使用自定义图例
    },
    series: [
      {
        name: props.title,
        type: 'pie',
        radius: props.radius,
        center: props.center,
        data: props.dataSource.map((item, index) => ({
          name: item.name,
          value: item.value,
          itemStyle: {
            color: item.color || defaultColors[index % defaultColors.length],
          },
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'var(--ant-color-text-quaternary)',
          },
        },
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
      },
    ],
  }
})

const formatValue = (value: number) => {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}万`
  }
  return value.toString()
}
</script>

<style lang="scss" scoped>
.pie-chart-card {
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
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: center;
}

.chart-legend {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 80px;
  flex-shrink: 0;
  padding: 8px 0;

  .legend-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: var(--dp-radius-xs);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .legend-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;

      .legend-name {
        color: var(--ant-color-text-secondary);
        font-size: 12px;
        line-height: 1.4;
        word-break: break-all;
      }

      .legend-value {
        font-weight: 600;
        color: var(--ant-color-text);
        font-size: 18px;
        line-height: 1.2;
      }
    }
  }
}

.chart-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.pie-chart-plain {
  width: 100%;
}

// 响应式优化
@media (max-width: 768px) {
  .chart-legend {
    grid-template-columns: 1fr;
  }
}
</style>
