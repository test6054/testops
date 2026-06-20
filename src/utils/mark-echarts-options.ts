import type { EChartsCoreOption } from 'echarts/core'
import type { GridComponentOption } from 'echarts/components'
import type { CallbackDataParams } from 'echarts/types/dist/shared'
import type { BadgeTone, UiBarChartItem, UiDistributionSegment, UiScatterSeries, UiTrendPoint } from '@/components/ui-guide/ui/types'
import { DP_FONT_FAMILY_SANS } from '@/constants/typography'
import { SCATTER_ZONE_COLORS } from '@/utils/mark-statistics-chart'
import { prefersReducedMotion } from '@/utils/mark-chart-accessibility'

/** mark-vue ECharts 色板：与 --dp/--ant 主题对齐的十六进制真源 */
export const MARK_ECHARTS_PALETTE = {
  primary: '#2563eb',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
  purple: '#7c3aed',
  muted: '#94a3b8',
  axisLabel: '#64748b',
  axisLine: '#cbd5e1',
  splitLine: '#e2e8f0',
  text: '#0f172a',
} as const

/** ECharts 轴标签：与全局 sans + hint 字阶对齐 */
export const MARK_CHART_AXIS_LABEL_STYLE = {
  color: MARK_ECHARTS_PALETTE.axisLabel,
  fontSize: 12,
  lineHeight: 18,
  fontFamily: DP_FONT_FAMILY_SANS,
  fontWeight: 400,
} as const

const TONE_HEX: Record<BadgeTone, string> = {
  gray: MARK_ECHARTS_PALETTE.muted,
  blue: MARK_ECHARTS_PALETTE.primary,
  orange: MARK_ECHARTS_PALETTE.warning,
  green: MARK_ECHARTS_PALETTE.success,
  yellow: '#ca8a04',
  red: MARK_ECHARTS_PALETTE.danger,
  purple: MARK_ECHARTS_PALETTE.purple,
}

export function toneToChartColor(tone?: BadgeTone): string {
  return TONE_HEX[tone || 'blue']
}

export function resolveThemeColor(cssVarName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim()
  return value || fallback
}

export function emptyChartOption(message = '暂无数据'): EChartsCoreOption {
  return {
    title: {
      text: message,
      left: 'center',
      top: 'middle',
      textStyle: {
        color: MARK_ECHARTS_PALETTE.axisLabel,
        fontSize: 13,
        fontWeight: 400,
        fontFamily: DP_FONT_FAMILY_SANS,
      },
    },
  }
}

function baseGrid(extra?: GridComponentOption): GridComponentOption {
  return {
    left: 48,
    right: 20,
    top: 24,
    bottom: 36,
    containLabel: true,
    ...(extra ?? {}),
  }
}

export interface MarkTrendChartConfig {
  yAxisName?: string
  yMax?: number
  area?: boolean
  highlightKey?: string
  emptyText?: string
}

/** 折线/面积趋势图：多场考试得分率、历次成绩等 */
export function buildTrendLineChartOption(
  points: UiTrendPoint[],
  config: MarkTrendChartConfig = {},
): EChartsCoreOption {
  if (points.length === 0) {
    return emptyChartOption(config.emptyText || '暂无趋势数据')
  }
  const categories = points.map((point) => point.label)
  const values = points.map((point) => Number(point.value))
  const highlightIndex = config.highlightKey
    ? points.findIndex((point) => point.key === config.highlightKey)
    : -1
  const lineColor = resolveThemeColor('--ant-color-primary', MARK_ECHARTS_PALETTE.primary)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      formatter: (params: CallbackDataParams | CallbackDataParams[]) => {
        const list = Array.isArray(params) ? params : [params]
        const first = list[0]
        const index = first?.dataIndex ?? 0
        const point = points[index]
        if (!point) return ''
        const delta = index > 0 ? values[index] - values[index - 1] : null
        const deltaText = delta == null ? '' : `<br/>较上一场 ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`
        return `${point.label}<br/>${config.yAxisName || '数值'}：${values[index]?.toFixed?.(1) ?? values[index]}${deltaText}`
      },
    },
    grid: baseGrid({ bottom: 48 }),
    xAxis: {
      type: 'category',
      data: categories,
      boundaryGap: false,
      axisLabel: {
        ...MARK_CHART_AXIS_LABEL_STYLE,
        fontSize: 11,
        interval: 0,
        rotate: categories.length > 6 ? 30 : 0,
      },
      axisLine: { lineStyle: { color: MARK_ECHARTS_PALETTE.axisLine } },
    },
    yAxis: {
      type: 'value',
      name: config.yAxisName || '',
      max: config.yMax,
      axisLabel: { ...MARK_CHART_AXIS_LABEL_STYLE },
      splitLine: { lineStyle: { color: MARK_ECHARTS_PALETTE.splitLine } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 2, color: lineColor },
        itemStyle: { color: lineColor },
        areaStyle: config.area
          ? {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: `${lineColor}33` },
                  { offset: 1, color: `${lineColor}05` },
                ],
              },
            }
          : undefined,
        data: values.map((value, index) => ({
          value,
          itemStyle: highlightIndex === index
            ? {
                color: lineColor,
                borderColor: '#fff',
                borderWidth: 2,
                shadowBlur: 8,
                shadowColor: `${lineColor}55`,
              }
            : undefined,
          symbolSize: highlightIndex === index ? 10 : 8,
        })),
      },
    ],
  }
}

export interface MarkBarChartConfig {
  orientation?: 'vertical' | 'horizontal'
  maxValue?: number
  yAxisName?: string
  xAxisName?: string
  unit?: string
  dataZoom?: boolean
  markLines?: Array<{ value: number; name: string; color?: string }>
  emptyText?: string
}

/** 分类柱状/条形图：分数段、错因、规模、题号正确率等 */
export function buildCategoryBarChartOption(
  items: UiBarChartItem[],
  config: MarkBarChartConfig = {},
): EChartsCoreOption {
  if (items.length === 0) {
    return emptyChartOption(config.emptyText || '暂无数据')
  }
  const orientation = config.orientation || 'vertical'
  const maxValue = config.maxValue && config.maxValue > 0
    ? config.maxValue
    : Math.max(...items.map((item) => Number(item.value)), 0)
  const categories = items.map((item) => item.label)
  const values = items.map((item) => ({
    value: Number(item.value),
    itemStyle: { color: item.color || toneToChartColor(item.tone) },
  }))
  const unit = config.unit || ''
  const markLineData = (config.markLines || []).map((line) => ({
    name: line.name,
    yAxis: orientation === 'vertical' ? line.value : undefined,
    xAxis: orientation === 'horizontal' ? line.value : undefined,
    lineStyle: { color: line.color || MARK_ECHARTS_PALETTE.warning, type: 'dashed' as const },
    label: { formatter: line.name, color: MARK_ECHARTS_PALETTE.axisLabel, fontSize: 11 },
  }))

  const categoryAxis = {
    type: 'category' as const,
    data: categories,
    axisLabel: {
      ...MARK_CHART_AXIS_LABEL_STYLE,
      fontSize: 11,
      interval: 0,
      rotate: orientation === 'vertical' && categories.length > 8 ? 35 : 0,
    },
    axisLine: { lineStyle: { color: MARK_ECHARTS_PALETTE.axisLine } },
  }
  const valueAxis = {
    type: 'value' as const,
    max: maxValue > 0 ? maxValue : undefined,
    name: orientation === 'vertical' ? config.yAxisName : config.xAxisName,
    minInterval: maxValue <= 100 ? undefined : 1,
    axisLabel: { ...MARK_CHART_AXIS_LABEL_STYLE },
    splitLine: { lineStyle: { color: MARK_ECHARTS_PALETTE.splitLine } },
  }

  const option: EChartsCoreOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: CallbackDataParams | CallbackDataParams[]) => {
        const list = Array.isArray(params) ? params : [params]
        const first = list[0]
        const index = first?.dataIndex ?? 0
        const item = items[index]
        if (!item) return ''
        const helper = item.helper ? `<br/>${item.helper}` : ''
        return `${item.label}<br/>${item.value}${unit}${helper}`
      },
    },
    grid: baseGrid({
      left: orientation === 'horizontal' ? 96 : 48,
      bottom: orientation === 'vertical' && categories.length > 8 ? 56 : 36,
    }),
    xAxis: orientation === 'vertical' ? categoryAxis : valueAxis,
    yAxis: orientation === 'vertical' ? valueAxis : categoryAxis,
    series: [
      {
        type: 'bar',
        data: values,
        barMaxWidth: orientation === 'vertical' ? 32 : 22,
        itemStyle: { borderRadius: orientation === 'vertical' ? [4, 4, 0, 0] : [0, 4, 4, 0] },
        markLine: markLineData.length ? { symbol: 'none', data: markLineData, silent: true } : undefined,
      },
    ],
  }

  if (config.dataZoom && categories.length > 12) {
    option.dataZoom = [
      {
        type: 'slider',
        show: true,
        xAxisIndex: orientation === 'vertical' ? 0 : undefined,
        yAxisIndex: orientation === 'horizontal' ? 1 : undefined,
        height: 18,
        bottom: 4,
        borderColor: MARK_ECHARTS_PALETTE.splitLine,
        fillerColor: `${MARK_ECHARTS_PALETTE.primary}22`,
        handleSize: 12,
      },
    ]
    option.grid = baseGrid({ bottom: 72 })
  }

  return option
}

export interface MarkScatterChartConfig {
  xLabel?: string
  yLabel?: string
  showIdealZone?: boolean
  emptyText?: string
}

/** 难度-区分度散点图 */
export function buildScatterChartOption(
  seriesList: UiScatterSeries[],
  config: MarkScatterChartConfig = {},
): EChartsCoreOption {
  const visibleSeries = seriesList.filter((series) => series.points.length > 0)
  if (visibleSeries.length === 0) {
    return emptyChartOption(config.emptyText || '暂无散点数据')
  }

  const scatterSeries = visibleSeries.map((series, index) => ({
    name: series.name,
    type: 'scatter' as const,
    symbolSize: (dataItem: { weight?: number }) => {
      const weight = dataItem?.weight
      if (weight == null) return 10
      return Math.min(22, Math.max(8, Math.sqrt(weight) * 2))
    },
    itemStyle: { color: series.color },
    data: series.points.map((point) => ({
      value: [point.x, point.y],
      label: point.label,
      helper: point.helper,
      weight: point.weight,
    })),
    markArea: config.showIdealZone && index === 0
      ? {
          silent: true,
          itemStyle: { color: `${SCATTER_ZONE_COLORS.ideal}22` },
          data: [[{ xAxis: 0.3, yAxis: 0.4 }, { xAxis: 0.8, yAxis: 1 }]],
        }
      : undefined,
  }))

  return {
    tooltip: {
      trigger: 'item',
      formatter: (param: CallbackDataParams) => {
        const data = param.data as { label?: string; helper?: string; value?: [number, number] }
        if (!data?.value) return ''
        const label = data.label || param.seriesName || ''
        return `${label}<br/>难度 ${data.value[0].toFixed(2)} · 区分度 ${data.value[1].toFixed(2)}${data.helper ? `<br/>${data.helper}` : ''}`
      },
    },
    legend: {
      top: 0,
      left: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: MARK_ECHARTS_PALETTE.axisLabel, fontSize: 12 },
    },
    grid: baseGrid({ top: 40 }),
    xAxis: {
      type: 'value',
      name: config.xLabel || '难度系数',
      min: 0,
      max: 1,
      nameTextStyle: { color: MARK_ECHARTS_PALETTE.axisLabel, fontSize: 11 },
      axisLabel: { ...MARK_CHART_AXIS_LABEL_STYLE },
      splitLine: { lineStyle: { color: MARK_ECHARTS_PALETTE.splitLine } },
    },
    yAxis: {
      type: 'value',
      name: config.yLabel || '区分度',
      min: 0,
      max: 1,
      nameTextStyle: { color: MARK_ECHARTS_PALETTE.axisLabel, fontSize: 11 },
      axisLabel: { ...MARK_CHART_AXIS_LABEL_STYLE },
      splitLine: { lineStyle: { color: MARK_ECHARTS_PALETTE.splitLine } },
    },
    series: scatterSeries,
  }
}

export interface MarkGaugeChartConfig {
  label?: string
  color?: string
  emptyText?: string
  size?: 'sm' | 'md' | 'lg'
  reduceMotion?: boolean
}

const GAUGE_SIZE_MAP = {
  sm: { detailFontSize: 20, axisLineWidth: 8, titleFontSize: 11 },
  md: { detailFontSize: 24, axisLineWidth: 10, titleFontSize: 12 },
  lg: { detailFontSize: 28, axisLineWidth: 12, titleFontSize: 13 },
} as const

/** 环形进度：已确认率、绑定率、出勤率等 */
export function buildGaugeChartOption(
  percent: number,
  config: MarkGaugeChartConfig = {},
): EChartsCoreOption {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)))
  const color = config.color || resolveThemeColor('--ant-color-primary', MARK_ECHARTS_PALETTE.primary)
  const sizeKey = config.size || 'md'
  const sizeSpec = GAUGE_SIZE_MAP[sizeKey]
  const animate = config.reduceMotion === false ? true : !prefersReducedMotion()
  return {
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        radius: '92%',
        pointer: { show: false },
        progress: {
          show: true,
          overlap: false,
          roundCap: true,
          clip: false,
          itemStyle: { color },
        },
        axisLine: {
          lineStyle: {
            width: sizeSpec.axisLineWidth,
            color: [[1, resolveThemeColor('--dp-border', MARK_ECHARTS_PALETTE.splitLine)]],
          },
        },
        splitLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        data: [{ value: safePercent, name: config.label || '' }],
        title: {
          offsetCenter: [0, '28%'],
          fontSize: sizeSpec.titleFontSize,
          color: resolveThemeColor('--dp-text-secondary', MARK_ECHARTS_PALETTE.axisLabel),
        },
        detail: {
          valueAnimation: animate,
          offsetCenter: [0, '-6%'],
          fontSize: sizeSpec.detailFontSize,
          fontWeight: 700,
          color: resolveThemeColor('--dp-text-primary', MARK_ECHARTS_PALETTE.text),
          formatter: '{value}%',
        },
      },
    ],
  }
}

/** 状态分布条：复核任务四态占比 */
export function buildDistributionBarChartOption(
  segments: UiDistributionSegment[],
  config: { emptyText?: string } = {},
): EChartsCoreOption {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0)
  if (total <= 0) {
    return emptyChartOption(config.emptyText || '暂无分布数据')
  }
  return {
    tooltip: {
      trigger: 'item',
      formatter: (param: CallbackDataParams) => {
        const value = Number(param.value)
        const percent = ((value * 100) / total).toFixed(0)
        return `${param.seriesName}<br/>${value} · ${percent}%`
      },
    },
    legend: {
      bottom: 0,
      left: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: MARK_ECHARTS_PALETTE.axisLabel, fontSize: 12 },
    },
    grid: { left: 0, right: 0, top: 8, bottom: 36 },
    xAxis: { type: 'value', show: false, max: total },
    yAxis: { type: 'category', show: false, data: [''] },
    series: segments.map((segment) => ({
      name: segment.label,
      type: 'bar',
      stack: 'total',
      barWidth: 14,
      emphasis: { focus: 'series' },
      itemStyle: {
        color: toneToChartColor(segment.tone),
        borderRadius: 4,
      },
      data: [segment.value],
    })),
  }
}

/** 热力图单元格：题号矩阵、答题卡网格等一维进度/得分展示 */
export interface MarkHeatmapCell {
  key: string | number
  label: string
  value: number
}

export interface MarkHeatmapChartConfig {
  rowLabel?: string
  min?: number
  max?: number
  emptyText?: string
  valueSuffix?: string
  /** 当前选中单元格 key，用于高亮边框 */
  highlightKey?: string
}

/** 解析热力图单元格 value（兼容 highlight 时的 { value, itemStyle } 包装） */
export function resolveHeatmapDataValue(raw: unknown): number[] | null {
  if (Array.isArray(raw)) {
    return raw as number[]
  }
  if (raw && typeof raw === 'object' && 'value' in raw) {
    const nested = (raw as { value: unknown }).value
    if (Array.isArray(nested)) {
      return nested as number[]
    }
  }
  return null
}

/** 热力图：按题号展示确认率或得分密度，支持点击选中 */
export function buildHeatmapChartOption(
  cells: MarkHeatmapCell[],
  config: MarkHeatmapChartConfig = {},
): EChartsCoreOption {
  if (cells.length === 0) {
    return emptyChartOption(config.emptyText || '暂无数据')
  }
  const min = config.min ?? 0
  const max = config.max ?? 100
  const rowLabel = config.rowLabel || '进度'
  const suffix = config.valueSuffix ?? '%'
  const labels = cells.map((cell) => cell.label)
  const highlightIndex = config.highlightKey
    ? cells.findIndex((cell) => cell.key === config.highlightKey)
    : -1
  const data = cells.map((cell, index) => [index, 0, cell.value])
  const rotateLabels = labels.length > 12
  const seriesData = highlightIndex >= 0
    ? data.map((entry, index) => {
      if (index !== highlightIndex) {
        return entry
      }
      return {
        value: entry,
        itemStyle: {
          borderColor: resolveThemeColor('--ant-color-primary', MARK_ECHARTS_PALETTE.primary),
          borderWidth: 2,
          shadowBlur: 8,
          shadowColor: 'rgba(22, 119, 255, 0.2)',
        },
      }
    })
    : data
  return {
    tooltip: {
      position: 'top',
      formatter: (param: CallbackDataParams) => {
        const raw = resolveHeatmapDataValue(param.value)
        if (!raw) return ''
        const index = Number(raw[0])
        const cell = cells[index]
        if (!cell) return ''
        return `${cell.label}<br/>${Math.round(cell.value)}${suffix}`
      },
    },
    grid: {
      left: 40,
      right: 16,
      top: 12,
      bottom: rotateLabels ? 72 : 56,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: labels,
      splitArea: { show: true },
      axisLabel: {
        ...MARK_CHART_AXIS_LABEL_STYLE,
        fontSize: 11,
        interval: 0,
        rotate: rotateLabels ? 45 : 0,
      },
      axisLine: { lineStyle: { color: MARK_ECHARTS_PALETTE.axisLine } },
    },
    yAxis: {
      type: 'category',
      data: [rowLabel],
      show: false,
    },
    visualMap: {
      min,
      max,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 4,
      itemWidth: 12,
      itemHeight: 64,
      text: [`${max}${suffix}`, `${min}${suffix}`],
      inRange: {
        color: [
          resolveThemeColor('--dp-border', MARK_ECHARTS_PALETTE.splitLine),
          MARK_ECHARTS_PALETTE.warning,
          MARK_ECHARTS_PALETTE.success,
        ],
      },
      textStyle: { color: MARK_ECHARTS_PALETTE.axisLabel, fontSize: 11 },
    },
    series: [
      {
        name: rowLabel,
        type: 'heatmap',
        data: seriesData,
        label: {
          show: labels.length <= 30,
          formatter: (param: CallbackDataParams) => {
            const raw = resolveHeatmapDataValue(param.value)
            if (!raw) return ''
            const index = Number(raw[0])
            return String(Math.round(cells[index]?.value ?? 0))
          },
          fontSize: 10,
          color: MARK_ECHARTS_PALETTE.text,
        },
        itemStyle: {
          borderColor: 'transparent',
          borderWidth: 2,
        },
        emphasis: {
          itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0, 0, 0, 0.12)' },
        },
      },
    ],
  }
}
