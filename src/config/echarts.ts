/**
 * ECharts 按需注册：mark-vue 统计与分析图表统一入口。
 */

import {
  BarChart,
  GaugeChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  ScatterChart,
} from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  RadarComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

let registered = false

/** 注册 mark-vue 图表所需的 ECharts 模块，重复调用安全。 */
export function setupECharts(): void {
  if (registered) return
  registered = true
  use([
    CanvasRenderer,
    BarChart,
    LineChart,
    ScatterChart,
    GaugeChart,
    PieChart,
    HeatmapChart,
    RadarChart,
    GridComponent,
    TooltipComponent,
    LegendComponent,
    DataZoomComponent,
    MarkLineComponent,
    MarkAreaComponent,
    VisualMapComponent,
    RadarComponent,
    LabelLayout,
    UniversalTransition,
  ])
}
