import type { RadarSeriesOption } from 'echarts/charts'
import type { EChartsCoreOption } from 'echarts/core'
import type {
  PortfolioPortraitCohortDisplayMode,
  PortfolioTeacherPortraitCohortCompareVO,
  PortfolioTeacherPortraitTrendPointVO,
  PortfolioTeacherPortraitVO,
} from '@/apis/portfolio/types'
import {
  buildTrendLineChartOption,
  emptyChartOption,
  MARK_CHART_AXIS_LABEL_STYLE,
  MARK_ECHARTS_PALETTE,
  resolveThemeColor,
} from '@/utils/mark-echarts-options'

const PORTRAIT_SCORE_MAX = 100

function formatPortraitTrendLabel(computedAt: string): string {
  const normalized = computedAt.replace('T', ' ')
  if (normalized.length >= 16) {
    return normalized.slice(0, 16)
  }
  return normalized
}

/** 一核心四能力雷达图：个人得分，可选叠加群体中位 */
export function buildPortraitRadarChartOption(
  portrait: PortfolioTeacherPortraitVO,
  cohort?: PortfolioTeacherPortraitCohortCompareVO | null,
): EChartsCoreOption {
  const dimensions = portrait.dimensions
  if (dimensions.length === 0) {
    return emptyChartOption('暂无维度数据')
  }
  const indicators = dimensions.map(item => ({
    name: item.dimensionLabel,
    max: PORTRAIT_SCORE_MAX,
  }))
  const personalValues = dimensions.map(item => Number(item.score))
  const series: RadarSeriesOption[] = [
    {
      type: 'radar',
      name: '个人',
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2, color: MARK_ECHARTS_PALETTE.primary },
      itemStyle: { color: MARK_ECHARTS_PALETTE.primary },
      areaStyle: { color: 'rgba(37, 99, 235, 0.12)' },
      data: [{ value: personalValues, name: '个人' }],
    },
  ]
  const showCohortMedian = cohort
    && cohort.displayMode !== 'INSUFFICIENT'
    && cohort.dimensions.some(item => item.cohortMedian != null)
  if (showCohortMedian) {
    const cohortMedianValues = dimensions.map((item) => {
      const cohortRow = cohort.dimensions.find(row => row.dimensionCode === item.dimensionCode)
      return cohortRow?.cohortMedian != null ? Number(cohortRow.cohortMedian) : 0
    })
    series.push({
      type: 'radar',
      name: '群体中位',
      symbol: 'diamond',
      symbolSize: 5,
      lineStyle: { width: 2, type: 'dashed', color: MARK_ECHARTS_PALETTE.warning },
      itemStyle: { color: MARK_ECHARTS_PALETTE.warning },
      areaStyle: { color: 'rgba(245, 158, 11, 0.08)' },
      data: [{ value: cohortMedianValues, name: '群体中位' }],
    })
  }
  return {
    color: [MARK_ECHARTS_PALETTE.primary, MARK_ECHARTS_PALETTE.warning],
    legend: showCohortMedian
      ? {
          bottom: 0,
          textStyle: { ...MARK_CHART_AXIS_LABEL_STYLE, fontSize: 12 },
        }
      : undefined,
    tooltip: { trigger: 'item' },
    radar: {
      center: ['50%', showCohortMedian ? '46%' : '50%'],
      radius: '62%',
      indicator: indicators,
      axisName: {
        color: MARK_ECHARTS_PALETTE.axisLabel,
        fontSize: 12,
      },
      splitLine: { lineStyle: { color: MARK_ECHARTS_PALETTE.splitLine } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: MARK_ECHARTS_PALETTE.axisLine } },
    },
    series,
  }
}

/** 同群体 P25–P75 区间对比：仅展示分布区间，不展示名次 */
export function buildPortraitCohortRangeChartOption(
  cohort: PortfolioTeacherPortraitCohortCompareVO,
): EChartsCoreOption {
  if (cohort.displayMode === 'INSUFFICIENT') {
    return emptyChartOption('同院系样本不足，暂不展示群体区间')
  }
  const rows = cohort.dimensions.filter(item =>
    item.cohortPercentileLow != null && item.cohortPercentileHigh != null,
  )
  if (rows.length === 0) {
    return emptyChartOption('暂无群体分布数据')
  }
  const categories = rows.map(item => item.dimensionLabel)
  const lowValues = rows.map(item => Number(item.cohortPercentileLow))
  const bandValues = rows.map(item =>
    Number(item.cohortPercentileHigh) - Number(item.cohortPercentileLow),
  )
  const personalValues = rows.map(item => Number(item.personalScore))
  const medianValues = rows.map(item => Number(item.cohortMedian ?? item.cohortAverage ?? 0))
  const bandColor = resolveThemeColor('--ant-color-warning-bg', 'rgba(245, 158, 11, 0.28)')
  const medianColor = MARK_ECHARTS_PALETTE.warning

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const list = Array.isArray(params) ? params : [params]
        const index = (list[0] as { dataIndex?: number })?.dataIndex ?? 0
        const row = rows[index]
        if (!row) {
          return ''
        }
        return [
          row.dimensionLabel,
          `个人 ${row.personalScore}`,
          `P25 ${row.cohortPercentileLow}`,
          `中位 ${row.cohortMedian ?? '-'}`,
          `P75 ${row.cohortPercentileHigh}`,
        ].join('<br/>')
      },
    },
    legend: {
      bottom: 0,
      data: ['P25–P75 区间', '群体中位', '个人得分'],
      textStyle: { ...MARK_CHART_AXIS_LABEL_STYLE, fontSize: 12 },
    },
    grid: { left: 96, right: 24, top: 16, bottom: 48 },
    xAxis: {
      type: 'value',
      min: 0,
      max: PORTRAIT_SCORE_MAX,
      axisLabel: { ...MARK_CHART_AXIS_LABEL_STYLE },
      splitLine: { lineStyle: { color: MARK_ECHARTS_PALETTE.splitLine } },
    },
    yAxis: {
      type: 'category',
      data: categories,
      axisLabel: { ...MARK_CHART_AXIS_LABEL_STYLE },
      axisLine: { lineStyle: { color: MARK_ECHARTS_PALETTE.axisLine } },
    },
    series: [
      {
        name: 'P25 基线',
        type: 'bar',
        stack: 'range',
        itemStyle: { color: 'transparent' },
        emphasis: { disabled: true },
        data: lowValues,
      },
      {
        name: 'P25–P75 区间',
        type: 'bar',
        stack: 'range',
        itemStyle: { color: bandColor, borderRadius: [0, 4, 4, 0] },
        data: bandValues,
      },
      {
        name: '群体中位',
        type: 'scatter',
        symbol: 'diamond',
        symbolSize: 10,
        itemStyle: { color: medianColor },
        data: medianValues.map((value, index) => [value, index]),
      },
      {
        name: '个人得分',
        type: 'scatter',
        symbol: 'circle',
        symbolSize: 12,
        itemStyle: { color: MARK_ECHARTS_PALETTE.primary },
        data: personalValues.map((value, index) => [value, index]),
      },
    ],
  }
}

export function buildPortraitCompositeTrendChartOption(
  points: PortfolioTeacherPortraitTrendPointVO[],
): EChartsCoreOption {
  const trendPoints = points.map((point, index) => ({
    key: String(index),
    label: formatPortraitTrendLabel(point.computedAt),
    value: Number(point.compositeScore),
  }))
  return buildTrendLineChartOption(trendPoints, {
    yAxisName: '综合画像分',
    yMax: PORTRAIT_SCORE_MAX,
    area: true,
    emptyText: '暂无历史快照，画像重算后将自动记录趋势',
  })
}

export function resolveCohortHint(
  displayMode: PortfolioPortraitCohortDisplayMode,
  sampleSize: number,
  cohortLabel?: string,
): string {
  const label = cohortLabel ? `「${cohortLabel}」` : '同院系'
  const sampleText = `已有画像快照的同院系教师 ${sampleSize} 人`
  if (displayMode === 'INSUFFICIENT') {
    return `${label}${sampleText}，少于 5 人时不展示群体分位（§8.55）`
  }
  if (displayMode === 'LIMITED') {
    return `${label}${sampleText}，区间仅供参考（5–14 人有限样本）`
  }
  return `${label}${sampleText}，展示 P25–P75 区间与群体中位`
}
