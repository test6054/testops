/**
 * ECharts 全局配置
 * 注册必要的渲染器和组件，确保所有页面的图表都能正常渲染
 */

import {
  BarChart,
  EffectScatterChart,
  FunnelChart,
  GaugeChart,
  LineChart,
  PieChart,
  RadarChart,
  ScatterChart,
} from 'echarts/charts'
import {
  CalendarComponent,
  DatasetComponent,
  DataZoomComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  TimelineComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  TransformComponent,
  VisualMapComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'

/**
 * 初始化ECharts
 * 注册所有需要的渲染器、图表类型和组件
 */
export function setupECharts() {
  use([
    // 渲染器
    CanvasRenderer,
    SVGRenderer,

    // 图表类型
    PieChart,
    LineChart,
    BarChart,
    RadarChart,
    ScatterChart,
    EffectScatterChart,
    GaugeChart,
    FunnelChart,

    // 组件
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    ToolboxComponent,
    DataZoomComponent,
    VisualMapComponent,
    TimelineComponent,
    CalendarComponent,
    GraphicComponent,
    MarkPointComponent,
    MarkLineComponent,
    MarkAreaComponent,
    DatasetComponent,
    TransformComponent,

    // 功能
    LabelLayout,
    UniversalTransition,
  ])
}

