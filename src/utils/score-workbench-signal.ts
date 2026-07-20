import type { ArchiveVolumeExamGateResponse } from '@/apis/mark/archive-volume'
import type { ExamWorkbenchScorePanelResponse } from '@/apis/mark/exam-progress'
import type { FinalScoreRiskOverviewResponse } from '@/apis/mark/exam-score'
import type { SignalMetric } from '@/types/workbench'
import type { StatMetricLike } from '@/utils/stat-metric-helpers'

/** 成绩确认页 Signal：有分布时对齐原型 renderScores 五 KPI，否则展示确认流程计数。 */
export function buildScoreFinalizeSignalMetrics(
  panel: ExamWorkbenchScorePanelResponse | null,
  overview: FinalScoreRiskOverviewResponse | null,
  hasDailyScoreConfig = false,
  publishableCount?: number,
): SignalMetric[] {
  if (panel?.distributionAvailable) {
    const total = overview?.totalCandidateCount ?? 0
    const metrics: SignalMetric[] = [
      { key: 'total', label: '总考生', value: total, unit: '人', tone: 'blue' },
      {
        key: 'avg',
        label: '平均分',
        value: panel.avgScore != null ? String(panel.avgScore) : '—',
        tone: 'green',
      },
      {
        key: 'pass',
        label: '及格率',
        value: panel.passRate != null ? `${panel.passRate}%` : '—',
        tone: 'green',
      },
      {
        key: 'absent',
        label: '缺考',
        value: panel.absentCount,
        unit: '人',
        tone: panel.absentCount > 0 ? 'orange' : 'gray',
      },
      {
        key: 'stddev',
        label: '标准差',
        value: panel.stdDev != null ? String(panel.stdDev) : '—',
        tone: 'gray',
      },
    ]
    if (publishableCount != null) {
      metrics.push({
        key: 'publishable',
        label: '可发布',
        value: publishableCount,
        unit: '人',
        tone: publishableCount > 0 ? 'green' : 'gray',
      })
    }
    return metrics
  }

  const total = overview?.totalCandidateCount ?? 0
  const pending = overview?.pendingCount ?? 0
  const calculated = overview?.calculatedCount ?? 0
  const confirmed = overview?.confirmedCount ?? 0
  const published = overview?.publishedCount ?? 0
  const blocked = overview?.blockedCount ?? 0
  const unconfirmedQuestions = overview?.unconfirmedQuestionGradeCount ?? 0
  const safeConfirmable = overview?.safeConfirmableCount ?? 0
  const pendingDelayed = panel?.pendingDelayedFinalScoreConfirmCount ?? 0
  const blockedDelayed = panel?.blockedDelayedFinalScoreConfirmCount ?? 0
  const delayedMinutes = panel?.delayedFinalScoreConfirmMinutes
  const metrics: SignalMetric[] = [
    { key: 'total', label: '全场考生', value: total, unit: '人', tone: 'blue' },
    {
      key: 'pending',
      label: '待计算',
      value: pending,
      unit: '人',
      tone: pending > 0 ? 'orange' : 'gray',
    },
    {
      key: 'calculated',
      label: '卷级可确认',
      value: calculated,
      unit: '人',
      tone: calculated > 0 ? 'blue' : 'gray',
    },
    {
      key: 'unconfirmedQuestions',
      label: '题未教师确认',
      value: unconfirmedQuestions,
      unit: '卷',
      tone: unconfirmedQuestions > 0 ? 'orange' : 'gray',
    },
    {
      key: 'safeConfirmable',
      label: '可安全批确认',
      value: safeConfirmable,
      unit: '卷',
      tone: safeConfirmable > 0 ? 'green' : 'gray',
    },
    {
      key: 'confirmed',
      label: '已确认',
      value: confirmed,
      unit: '人',
      tone: confirmed > 0 ? 'blue' : 'gray',
    },
    {
      key: 'published',
      label: '已发布',
      value: published,
      unit: '人',
      tone: published > 0 ? 'green' : 'gray',
    },
    {
      key: 'blocked',
      label: '阻塞风险',
      value: blocked,
      unit: '项',
      tone: blocked > 0 ? 'red' : 'gray',
    },
  ]
  if (
    !hasDailyScoreConfig
    && panel?.manualFinalScoreConfirmRequired === false
    && pendingDelayed > 0
    && delayedMinutes != null
  ) {
    metrics.push({
      key: 'delayedConfirm',
      label: '延迟自动确认',
      value: pendingDelayed,
      unit: '份',
      tone: 'blue',
      helper: `${delayedMinutes} 分钟窗口`,
    })
  }
  if (panel?.manualFinalScoreConfirmRequired === false && blockedDelayed > 0) {
    metrics.push({
      key: 'blockedDelayedConfirm',
      label: '自动确认失败',
      value: blockedDelayed,
      unit: '份',
      tone: 'red',
      helper: '须人工确认',
    })
  }
  if (publishableCount != null) {
    metrics.push({
      key: 'publishable',
      label: '可发布',
      value: publishableCount,
      unit: '人',
      tone: publishableCount > 0 ? 'green' : 'gray',
    })
  }
  return metrics
}

/** 成绩发布页 Signal：有分布时展示统计 KPI + 已发布；否则展示发布流程计数。 */
export function buildScorePublishSignalMetrics(
  panel: ExamWorkbenchScorePanelResponse | null,
  overview: FinalScoreRiskOverviewResponse | null,
  gate: ArchiveVolumeExamGateResponse | null,
  publishableCount: number,
  listTotal: number,
): StatMetricLike[] {
  const total = overview?.totalCandidateCount ?? listTotal
  const published = overview?.publishedCount ?? 0

  if (panel?.distributionAvailable) {
    return [
      { label: '总考生', value: total, unit: '人', tone: 'blue' },
      {
        label: '平均分',
        value: panel.avgScore != null ? String(panel.avgScore) : '—',
        tone: 'green',
      },
      {
        label: '及格率',
        value: panel.passRate != null ? `${panel.passRate}%` : '—',
        tone: 'green',
      },
      {
        label: '已发布',
        value: published,
        unit: '人',
        tone: published > 0 ? 'green' : 'gray',
      },
      {
        label: '缺考',
        value: panel.absentCount,
        unit: '人',
        tone: panel.absentCount > 0 ? 'orange' : 'gray',
      },
    ]
  }

  const corrected = overview?.correctedCount ?? 0
  const withdrawn = overview?.withdrawnCount ?? 0
  const unconfirmed = overview ? overview.pendingCount + overview.calculatedCount : 0
  const unpublishedBound = gate?.unpublishedBoundPaperCount
  const metrics: StatMetricLike[] = [
    { label: '考生总数', value: total, unit: '人', tone: 'blue' },
    {
      label: '可发布',
      value: publishableCount,
      unit: '人',
      tone: publishableCount > 0 ? 'orange' : 'gray',
    },
    {
      label: '已发布',
      value: published,
      unit: '人',
      tone: published > 0 ? 'green' : 'gray',
    },
  ]
  if (unpublishedBound != null) {
    metrics.push({
      label: '绑定卷未发布',
      value: unpublishedBound,
      unit: '份',
      tone: unpublishedBound > 0 ? 'orange' : 'green',
    })
  }
  metrics.push(
    {
      label: '已订正',
      value: corrected,
      unit: '人',
      tone: corrected > 0 ? 'purple' : 'gray',
    },
    {
      label: '已撤回',
      value: withdrawn,
      unit: '人',
      tone: withdrawn > 0 ? 'red' : 'gray',
    },
    {
      label: '未确认',
      value: unconfirmed,
      unit: '人',
      tone: unconfirmed > 0 ? 'orange' : 'gray',
    },
  )
  return metrics
}
