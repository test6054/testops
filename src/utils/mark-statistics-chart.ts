import type {
  CourseAchievementItemResponse,
  ExamStatSnapshotResponse,
  SemesterGrowthItemResponse
} from '@/apis/mark/cross-exam-analysis'
import type { ErrorCauseClusterItemVO } from '@/apis/mark/error-cause-cluster'
import type { ReviewQuestionProgressItemResponse } from '@/apis/mark/exam-progress'
import type { ProgressMonitorRecordResponse } from '@/apis/mark/marking-quality'
import type { ExamQuestionAnalysisRecordResponse } from '@/apis/mark/question-analysis'
import type {
  ClassWeaknessItemResponse,
  StudentLearningDiagnosisItemResponse,
  TeachingImprovementItemResponse,
} from '@/apis/mark/teaching-analysis'
import type { BadgeTone, UiBarChartItem, UiScatterSeries, UiTrendPoint } from '@/components/ui-guide/ui/types'
import type { MarkHeatmapCell } from '@/utils/mark-echarts-options'
import { CourseObjectiveDimensionDescription } from '@/apis/mark/cross-exam-analysis'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import {
  TEACHING_IMPROVEMENT_SEVERITY_TONE,
  TeachingImprovementSeverityDescription,
} from '@/apis/mark/teaching-analysis'
import { TeachingImprovementSeverityCode } from '@/types/enums/teaching-improvement-severity-enum'
import { formatScore, formatScorePercent } from '@/utils/format'
import { rateTone } from '@/utils/score-tone'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

/** UiScatterChart 区段色：canvas/SVG 不解析 CSS 变量，故用十六进制单一真源，取值与 --dp/--ant 主题色对齐 */
const CHART_PALETTE: Record<string, string> = {
  primary: '#1677ff',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
  purple: '#7c3aed',
  muted: '#94a3b8',
  axisLabel: '#64748b',
  axisLine: '#94a3b8',
  splitLine: '#e2e8f0',
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
  return percent == null ? '—' : formatScorePercent(percent, '—')
}

/** 考试统计快照 → UiTrendChart 点位：纵轴为得分率百分制 */
export function examStatSnapshotsToTrendPoints(snapshots: ExamStatSnapshotResponse[]): UiTrendPoint[] {
  if (snapshots.length === 0) return []
  return snapshots.map((snapshot, index) => ({
    key: snapshot.examId || `exam-${index}`,
    label: truncateLabel(snapshot.examName || '考试'),
    value: toPercent(snapshot.scoreRate) ?? 0,
  }))
}

/** 考试规模指标 → UiBarChart 条目 */
export function examScaleMetricsToBarItems(metrics: {
  activeExamCount: number
  closedExamCount: number
  recentExamCount: number
}): UiBarChartItem[] {
  const items: UiBarChartItem[] = [
    { key: 'active', label: '进行中', value: metrics.activeExamCount, tone: 'blue' },
    { key: 'closed', label: '已结束', value: metrics.closedExamCount, tone: 'gray' },
    { key: 'recent', label: '近期新增', value: metrics.recentExamCount, tone: 'green' },
  ]
  return items.filter((item) => item.value > 0)
}

/** 课程目标达成条目 → UiBarChart 条目（百分制纵轴） */
export function achievementItemsToBarItems(items: CourseAchievementItemResponse[]): UiBarChartItem[] {
  if (items.length === 0) return []
  return items.map((item, index) => {
    const label = item.objectiveDimension
      ? strictEnumLabel(CourseObjectiveDimensionDescription, item.objectiveDimension, '课程目标维度')
      : truncateLabel(item.objectiveDescription || '课程目标', 10)
    const tone: BadgeTone = item.achievementRate == null ? 'gray' : rateTone(item.achievementRate)
    return {
      key: item.objectiveDimension || `objective-${index}`,
      label,
      value: toPercent(item.achievementRate) ?? 0,
      tone,
      helper: formatPercentText(item.achievementRate),
    }
  })
}

/** 学期成长条目 → UiBarChart 条目：展示结束值，helper 标注起止对照 */
export function growthItemsToBarItems(items: SemesterGrowthItemResponse[]): UiBarChartItem[] {
  if (items.length === 0) return []
  return items.map((item, index) => {
    const helperParts = [
      item.startValue != null ? `起始 ${item.startValue}` : '',
      item.endValue != null ? `结束 ${item.endValue}` : '',
    ].filter(Boolean)
    return {
      key: item.dimension || `growth-${index}`,
      label: truncateLabel(item.dimensionLabel || item.dimension || '能力点', 10),
      value: item.endValue ?? 0,
      tone: 'blue' satisfies BadgeTone,
      helper: helperParts.length ? helperParts.join(' · ') : undefined,
    }
  })
}

/** 分数段分布 → UiBarChart 条目；includeZeroBuckets 为 true 时保留 0 人数段（成绩页五级分布） */
export function scoreHistogramToBarItems(
  distribution: {
    ranges: string[]
    counts: number[]
  },
  options?: { includeZeroBuckets?: boolean },
): UiBarChartItem[] {
  if (!distribution.ranges.length || distribution.ranges.length !== distribution.counts.length) {
    return []
  }
  const items: UiBarChartItem[] = distribution.ranges.map((label, index) => ({
    key: `range-${index}`,
    label,
    value: distribution.counts[index] ?? 0,
    tone: 'blue' satisfies BadgeTone,
    helper: `${distribution.counts[index] ?? 0} 人`,
  }))
  if (options?.includeZeroBuckets) {
    return items
  }
  return items.filter((item) => item.value > 0)
}

/** 题目复核进度 → UiBarChart 条目：展示已通过任务数 */
export function reviewProgressToBarItems(
  rows: ReviewQuestionProgressItemResponse[],
): UiBarChartItem[] {
  if (rows.length === 0) return []
  return rows.map((row) => ({
    key: row.layoutQuestionId,
    label: `题${row.questionNo}`,
    value: row.approvedTaskCount,
    tone: row.approvedTaskCount >= row.totalTaskCount && row.totalTaskCount > 0
      ? ('green' satisfies BadgeTone)
      : ('blue' satisfies BadgeTone),
    helper: `已通过 ${row.approvedTaskCount} / ${row.totalTaskCount}`,
  }))
}

/** 各题正确率 → UiBarChart 条目（百分制） */
export function correctRatioToBarItems(
  rows: ExamQuestionAnalysisRecordResponse[],
): UiBarChartItem[] {
  const validRows = rows.filter((row) => row.totalCount > 0)
  if (validRows.length === 0) return []
  return validRows.map((row) => {
    const ratio = (row.correctCount / row.totalCount) * 100
    const tone: BadgeTone = ratio < 40 ? 'red' : ratio < 60 ? 'orange' : 'green'
    return {
      key: row.layoutQuestionId,
      label: `题${row.questionNo}`,
      value: Number(formatScore(ratio, 'percent')),
      tone,
      helper: `已批 ${row.totalCount} 人`,
    }
  })
}

/** 错因占比 → UiBarChart 条目（百分制占比） */
export function errorCauseToBarItems(
  items: ErrorCauseClusterItemVO[],
): UiBarChartItem[] {
  return items
    .filter((item) => item.proportion != null && item.proportion > 0)
    .map((item, index) => {
      const percent
        = Number(item.proportion) <= 1 ? Number(item.proportion) * 100 : Number(item.proportion)
      return {
        key: item.causeName || item.questionType || `cause-${index}`,
        label: truncateLabel(item.causeName || item.questionType || '错因', 10),
        value: Number(formatScore(percent, 'percent')),
        tone: 'blue' satisfies BadgeTone,
        helper: formatScorePercent(percent, '—'),
      }
    })
}

/** UiScatterChart 区段色：与 CHART_PALETTE 对齐 */
export const SCATTER_ZONE_COLORS: Record<string, string> = {
  ideal: CHART_PALETTE.success,
  tooHard: CHART_PALETTE.danger,
  tooEasy: CHART_PALETTE.warning,
  lowDiscrim: CHART_PALETTE.purple,
}

/** 题目质量分析 → UiScatterChart 序列：按难度/区分度四区段分组 */
export function buildQuestionQualityScatterSeries(
  rows: ExamQuestionAnalysisRecordResponse[],
): UiScatterSeries[] {
  const ideal: UiScatterSeries['points'] = []
  const tooHard: UiScatterSeries['points'] = []
  const tooEasy: UiScatterSeries['points'] = []
  const lowDiscrim: UiScatterSeries['points'] = []

  for (const row of rows) {
    if (row.difficultyIndex == null || row.discriminationIndex == null) continue
    const difficulty = Number(row.difficultyIndex)
    const discrimination = Number(row.discriminationIndex)
    const questionType = strictEnumLabel(QuestionTypeDescription, row.questionType, '题型')
    const point = {
      key: row.layoutQuestionId,
      x: difficulty,
      y: discrimination,
      weight: row.totalCount,
      label: `题${row.questionNo} · ${questionType}`,
      helper: [
        `难度系数 ${formatScore(difficulty, 'achievement')} · 区分度 ${formatScore(discrimination, 'achievement')}`,
        `已批 ${row.totalCount} 人`,
      ].join(' · '),
    }
    if (difficulty < 0.3) {
      tooHard.push(point)
    } else if (difficulty > 0.8) {
      tooEasy.push(point)
    } else if (discrimination < 0.4) {
      lowDiscrim.push(point)
    } else {
      ideal.push(point)
    }
  }

  return [
    { key: 'ideal', name: '理想区间', color: SCATTER_ZONE_COLORS.ideal, points: ideal },
    { key: 'tooHard', name: '偏难', color: SCATTER_ZONE_COLORS.tooHard, points: tooHard },
    { key: 'tooEasy', name: '偏易', color: SCATTER_ZONE_COLORS.tooEasy, points: tooEasy },
    {
      key: 'lowDiscrim',
      name: '区分度不足',
      color: SCATTER_ZONE_COLORS.lowDiscrim,
      points: lowDiscrim,
    },
  ].filter((series) => series.points.length > 0)
}

/** 阅卷进度快照序列 → 完成率趋势点 */
export function progressSnapshotsToTrendPoints(records: ProgressMonitorRecordResponse[]): UiTrendPoint[] {
  if (records.length === 0) return []
  return records.map((record, index) => ({
    key: record.id || `snapshot-${index}`,
    label: formatSnapshotLabel(record.snapshotTime, index),
    value: Number(formatScore(record.completionRate, 'percent')),
  }))
}

function formatSnapshotLabel(snapshotTime: string, index: number): string {
  const text = snapshotTime.trim()
  if (!text) return `快照 ${index + 1}`
  const normalized = text.replace('T', ' ')
  return normalized.length > 16 ? normalized.slice(5, 16) : normalized
}

/** 题目复核进度 → 热力图单元格 */
export function reviewProgressToHeatmapCells(
  rows: ReviewQuestionProgressItemResponse[],
): MarkHeatmapCell[] {
  if (rows.length === 0) return []
  return rows.map((row) => {
    const percent = row.totalTaskCount === 0
      ? 0
      : Math.round((row.approvedTaskCount * 100) / row.totalTaskCount)
    return {
      key: row.layoutQuestionId,
      label: String(row.questionNo),
      value: percent,
    }
  })
}

/** 学生答题卡 → 热力图单元格（按得分率着色） */
export function scoreSheetToHeatmapCells(
  questions: Array<{
    layoutQuestionId: string
    questionNo: string | number
    finalScore?: number | null
    fullScore?: number | null
  }>,
): MarkHeatmapCell[] {
  if (questions.length === 0) return []
  return questions.map((question) => {
    const full = question.fullScore ?? 0
    const finalScore = question.finalScore ?? 0
    const percent = full > 0 ? Math.round((finalScore * 100) / full) : 0
    return {
      key: question.layoutQuestionId,
      label: String(question.questionNo),
      value: percent,
    }
  })
}

/** 教学改进项 → 按严重程度计数的柱状条目 */
export function teachingImprovementToBarItems(
  items: TeachingImprovementItemResponse[],
): UiBarChartItem[] {
  if (items.length === 0) {
    return []
  }
  const severityOrder: TeachingImprovementSeverityCode[] = [
    TeachingImprovementSeverityCode.HIGH,
    TeachingImprovementSeverityCode.MEDIUM,
    TeachingImprovementSeverityCode.LOW,
  ]
  const counts = new Map<TeachingImprovementSeverityCode, number>()
  for (const item of items) {
    const severity = item.severity ?? TeachingImprovementSeverityCode.MEDIUM
    counts.set(severity, (counts.get(severity) ?? 0) + 1)
  }
  return severityOrder
    .filter((severity) => (counts.get(severity) ?? 0) > 0)
    .map((severity) => ({
      key: severity,
      label: strictEnumLabel(TeachingImprovementSeverityDescription, severity, '严重程度'),
      value: counts.get(severity) ?? 0,
      tone: strictEnumTone(TEACHING_IMPROVEMENT_SEVERITY_TONE, severity, '严重程度'),
    }))
}

/** 班级薄弱题型 → 得分率横向柱图条目（百分制） */
export function classWeaknessToBarItems(items: ClassWeaknessItemResponse[]): UiBarChartItem[] {
  if (items.length === 0) {
    return []
  }
  return items.map((item, index) => {
    const rate = toPercent(item.avgScoreRate)
    return {
      key: item.questionType || `weak-${index}`,
      label: strictEnumLabel(QuestionTypeDescription, item.questionType, '题目类型'),
      value: rate ?? 0,
      tone: item.avgScoreRate == null ? 'gray' : rateTone(item.avgScoreRate),
      helper: formatPercentText(item.avgScoreRate),
    }
  })
}

/** 学生学情诊断 → 各题型得分率柱图条目（百分制） */
export function studentDiagnosisToBarItems(
  items: StudentLearningDiagnosisItemResponse[],
): UiBarChartItem[] {
  if (items.length === 0) {
    return []
  }
  return items.map((item, index) => {
    const rate = toPercent(Number(item.scoreRate))
    return {
      key: `${item.questionType}-${index}`,
      label: strictEnumLabel(QuestionTypeDescription, item.questionType, '题目类型'),
      value: rate ?? 0,
      tone: rate == null ? 'gray' : rateTone(Number(item.scoreRate)),
      helper: formatPercentText(Number(item.scoreRate)),
    }
  })
}
