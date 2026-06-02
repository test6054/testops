import type { EChartsCoreOption } from 'echarts/core'
import type {
  CourseAchievementItemVO,
  ExamStatSnapshotVO,
  SemesterGrowthItemVO,
} from '@/apis/mark/cross-exam-analysis'
import type { ErrorCauseClusterItemVO } from '@/apis/mark/error-cause-cluster'
import type { ReviewQuestionProgressItemVO } from '@/apis/mark/exam'
import type { ExamQuestionAnalysisRecordVO } from '@/apis/mark/question-analysis'
import { COURSE_OBJECTIVE_DIMENSION_LABEL } from '@/apis/mark/cross-exam-analysis'
import { strictEnumLabel } from '@/utils/strict-enum'

const CHART_AXIS = {
  axisLine: { lineStyle: { color: '#94a3b8' } },
  axisLabel: { color: '#64748b', fontSize: 11 },
  splitLine: { lineStyle: { color: '#e2e8f0' } },
}

function truncateLabel(label: string, max = 8): string {
  const text = label.trim()
  return text.length <= max ? text : `${text.slice(0, max)}…`
}

function toPercent(value: number | undefined): number | null {
  if (value == null || Number.isNaN(Number(value))) return null
  const num = Number(value)
  return num <= 1 ? num * 100 : num
}

function formatPercentText(value: number | undefined): string {
  const percent = toPercent(value)
  return percent == null ? '—' : `${percent.toFixed(1)}%`
}

export function buildExamStatTrendChartOption(
  snapshots: ExamStatSnapshotVO[],
): EChartsCoreOption | null {
  if (snapshots.length === 0) return null
  const categories = snapshots.map((item) => truncateLabel(item.examName || '考试'))
  const scoreRates = snapshots.map((item) => toPercent(item.scoreRate))
  const passRates = snapshots.map((item) => toPercent(item.passRate))
  const avgScores = snapshots.map((item) => (item.avgScore == null ? null : Number(item.avgScore)))
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (
        params: Array<{ seriesName: string, value: number | null, dataIndex: number }>,
      ) => {
        const index = params[0]?.dataIndex ?? 0
        const snapshot = snapshots[index]
        const lines = [
          snapshot.examName || '考试',
          snapshot.examTime ? `时间 ${snapshot.examTime}` : '',
          `参考 ${snapshot.participantCount ?? '—'} 人`,
          `得分率 ${formatPercentText(snapshot.scoreRate)}`,
          `及格率 ${formatPercentText(snapshot.passRate)}`,
          snapshot.avgScore != null ? `平均分 ${Number(snapshot.avgScore).toFixed(1)}` : '',
        ].filter(Boolean)
        return lines.join('<br/>')
      },
    },
    legend: { top: 0, textStyle: { fontSize: 12 } },
    grid: { left: 48, right: 48, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: categories, ...CHART_AXIS },
    yAxis: [
      {
        type: 'value',
        name: '比率(%)',
        min: 0,
        max: 100,
        ...CHART_AXIS,
      },
      {
        type: 'value',
        name: '平均分',
        ...CHART_AXIS,
      },
    ],
    series: [
      {
        name: '得分率',
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        symbolSize: 7,
        itemStyle: { color: '#2563eb' },
        data: scoreRates,
      },
      {
        name: '及格率',
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        symbolSize: 7,
        itemStyle: { color: '#16a34a' },
        data: passRates,
      },
      {
        name: '平均分',
        type: 'bar',
        yAxisIndex: 1,
        barMaxWidth: 28,
        itemStyle: { color: '#ea580c', borderRadius: [4, 4, 0, 0] },
        data: avgScores,
      },
    ],
  }
}

export function buildGrowthItemsBarOption(items: SemesterGrowthItemVO[]): EChartsCoreOption | null {
  if (items.length === 0) return null
  const categories = items.map((item) =>
    truncateLabel(item.dimensionLabel || item.dimension || '能力点', 10),
  )
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { fontSize: 12 } },
    grid: { left: 48, right: 16, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: categories, ...CHART_AXIS },
    yAxis: { type: 'value', name: '指标值', ...CHART_AXIS },
    series: [
      {
        name: '起始值',
        type: 'bar',
        barMaxWidth: 24,
        itemStyle: { color: '#94a3b8', borderRadius: [4, 4, 0, 0] },
        data: items.map((item) => item.startValue ?? null),
      },
      {
        name: '结束值',
        type: 'bar',
        barMaxWidth: 24,
        itemStyle: { color: '#2563eb', borderRadius: [4, 4, 0, 0] },
        data: items.map((item) => item.endValue ?? null),
      },
    ],
  }
}

export function buildErrorCausePieOption(
  items: ErrorCauseClusterItemVO[],
): EChartsCoreOption | null {
  const data = items
    .filter((item) => item.proportion != null && item.proportion > 0)
    .map((item) => ({
      name: item.causeName || item.questionType || '错因',
      value: Number(item.proportion),
    }))
  if (data.length === 0) return null
  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: { name: string, value: number, percent: number }) =>
        `${params.name}<br/>占比 ${params.percent.toFixed(1)}%`,
    },
    legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11 } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '46%'],
        label: { formatter: '{b}\n{d}%' },
        data,
      },
    ],
  }
}

export function buildAchievementBarOption(
  items: CourseAchievementItemVO[],
): EChartsCoreOption | null {
  if (items.length === 0) return null
  const categories = items.map((item) => {
    if (item.objectiveDimension) {
      return strictEnumLabel(
        COURSE_OBJECTIVE_DIMENSION_LABEL,
        item.objectiveDimension,
        '课程目标维度',
      )
    }
    return truncateLabel(item.objectiveDescription || '课程目标', 10)
  })
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ dataIndex: number }>) => {
        const item = items[params[0]?.dataIndex ?? 0]
        return [
          categories[params[0]?.dataIndex ?? 0],
          `达成率 ${formatPercentText(item.achievementRate)}`,
        ].join('<br/>')
      },
    },
    grid: { left: 48, right: 16, top: 16, bottom: 28 },
    xAxis: { type: 'category', data: categories, ...CHART_AXIS },
    yAxis: { type: 'value', name: '达成率(%)', min: 0, max: 100, ...CHART_AXIS },
    series: [
      {
        type: 'bar',
        barMaxWidth: 36,
        itemStyle: { color: '#2563eb', borderRadius: [4, 4, 0, 0] },
        data: items.map((item) => toPercent(item.achievementRate)),
      },
    ],
  }
}

export function buildCorrectRatioBarOption(
  rows: ExamQuestionAnalysisRecordVO[],
): EChartsCoreOption | null {
  const validRows = rows.filter((row) => row.totalCount > 0)
  if (validRows.length === 0) return null
  const categories = validRows.map((row) => `题${row.questionNo}`)
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ dataIndex: number }>) => {
        const row = validRows[params[0]?.dataIndex ?? 0]
        const ratio = (row.correctCount / row.totalCount) * 100
        return [
          `题${row.questionNo}`,
          `正确率 ${ratio.toFixed(1)}%`,
          `已批 ${row.totalCount} 人`,
        ].join('<br/>')
      },
    },
    grid: { left: 48, right: 16, top: 16, bottom: 28 },
    xAxis: { type: 'category', data: categories, ...CHART_AXIS },
    yAxis: { type: 'value', name: '正确率(%)', min: 0, max: 100, ...CHART_AXIS },
    series: [
      {
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: { color: '#2563eb', borderRadius: [4, 4, 0, 0] },
        data: validRows.map((row) => (row.correctCount / row.totalCount) * 100),
      },
    ],
  }
}

export function buildReviewProgressBarOption(
  rows: ReviewQuestionProgressItemVO[],
): EChartsCoreOption | null {
  if (rows.length === 0) return null
  const categories = rows.map((row) => `题${row.questionNo}`)
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0, textStyle: { fontSize: 12 } },
    grid: { left: 48, right: 16, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: categories, ...CHART_AXIS },
    yAxis: { type: 'value', name: '任务数', minInterval: 1, ...CHART_AXIS },
    series: [
      {
        name: '已通过',
        type: 'bar',
        stack: 'review',
        itemStyle: { color: '#16a34a' },
        data: rows.map((row) => row.approvedTaskCount),
      },
      {
        name: '复核中',
        type: 'bar',
        stack: 'review',
        itemStyle: { color: '#2563eb' },
        data: rows.map((row) => row.inProgressTaskCount),
      },
      {
        name: '待领取',
        type: 'bar',
        stack: 'review',
        itemStyle: { color: '#ea580c' },
        data: rows.map((row) => row.pendingTaskCount),
      },
      {
        name: '已驳回',
        type: 'bar',
        stack: 'review',
        itemStyle: { color: '#dc2626' },
        data: rows.map((row) => row.rejectedTaskCount),
      },
    ],
  }
}

export function buildExamScalePieOption(metrics: {
  activeExamCount: number
  closedExamCount: number
  recentExamCount: number
}): EChartsCoreOption | null {
  const data = [
    { name: '进行中', value: metrics.activeExamCount },
    { name: '已结束', value: metrics.closedExamCount },
    { name: '近期新增', value: metrics.recentExamCount },
  ].filter((item) => item.value > 0)
  if (data.length === 0) return null
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [
      {
        type: 'pie',
        radius: ['40%', '66%'],
        center: ['50%', '44%'],
        label: { formatter: '{b}\n{c} 场' },
        data,
      },
    ],
  }
}

export function buildScoreHistogramOption(distribution: {
  ranges: string[]
  counts: number[]
}): EChartsCoreOption | null {
  if (!distribution.ranges.length || distribution.ranges.length !== distribution.counts.length) {
    return null
  }
  const hasData = distribution.counts.some((count) => count > 0)
  if (!hasData) return null
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ name: string, value: number }>) => {
        const item = params[0]
        return `${item.name}<br/>人数 ${item.value}`
      },
    },
    grid: { left: 48, right: 16, top: 16, bottom: 48 },
    xAxis: {
      type: 'category',
      data: distribution.ranges,
      axisLabel: { interval: 0, rotate: 18, fontSize: 11, color: '#64748b' },
      axisLine: { lineStyle: { color: '#94a3b8' } },
    },
    yAxis: {
      type: 'value',
      name: '人数',
      minInterval: 1,
      axisLine: { lineStyle: { color: '#94a3b8' } },
      splitLine: { lineStyle: { color: '#e2e8f0' } },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 48,
        itemStyle: { color: '#2563eb', borderRadius: [4, 4, 0, 0] },
        data: distribution.counts,
      },
    ],
  }
}
