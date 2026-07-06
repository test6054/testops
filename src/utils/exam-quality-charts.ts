import type { RadarSeriesOption } from 'echarts/charts'
import type { EChartsCoreOption } from 'echarts/core'
import type { ExamWorkbenchQualityDimensionItemResponse } from '@/apis/mark/exam-progress'
import {
  emptyChartOption,
  finalizeMarkChartOption,
  MARK_ECHARTS_PALETTE,
} from '@/utils/mark-echarts-options'

const QUALITY_RADAR_MAX = 100

/** 考试质量雷达图：维度得分由后端 qualityDimensionItems 真源提供 */
export function buildExamQualityRadarChartOption(
  dimensions: ExamWorkbenchQualityDimensionItemResponse[],
): EChartsCoreOption {
  const scored = dimensions.filter(item => item.score != null)
  if (scored.length === 0) {
    return emptyChartOption('暂无质量维度数据')
  }
  const indicators = dimensions.map(item => ({
    name: item.dimensionLabel,
    max: QUALITY_RADAR_MAX,
  }))
  const values = dimensions.map(item => (item.score != null ? Number(item.score) : 0))
  const series: RadarSeriesOption[] = [
    {
      type: 'radar',
      name: '考试质量',
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2, color: MARK_ECHARTS_PALETTE.primary },
      itemStyle: { color: MARK_ECHARTS_PALETTE.primary },
      areaStyle: { color: 'rgba(37, 99, 235, 0.12)' },
      data: [{ value: values, name: '考试质量' }],
    },
  ]
  return finalizeMarkChartOption({
    color: [MARK_ECHARTS_PALETTE.primary],
    tooltip: { trigger: 'item' },
    radar: {
      center: ['50%', '50%'],
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
  })
}
