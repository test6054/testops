import type { ExamWorkbenchScorePanelResponse } from '@/apis/mark/exam-progress'
import type { FinalScoreRiskOverviewResponse } from '@/apis/mark/exam-score'
import type { SignalMetric } from '@/types/workbench'

/**
 * 成绩确认页 Signal：有分布时对齐原型 renderScores 五 KPI，否则展示确认漏斗主链五计数。
 * 信号带上限 6 项（5 基础 + 条件「待我复核」个人队列）；安全批确认 / 题未确认 / 延迟确认 /
 * 可提交复核等阻断与机会细节由 ScoreConfirmReadinessPanel（readinessItems 唯一真源）承载，禁止回填到信号带。
 */
export function buildScoreFinalizeSignalMetrics(
  panel: ExamWorkbenchScorePanelResponse | null,
  overview: FinalScoreRiskOverviewResponse | null,
): SignalMetric[] {
  const pendingMy = overview?.pendingMyPublishReviewCount ?? 0
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
    if (pendingMy > 0) {
      metrics.push({
        key: 'pendingMyPublishReview',
        label: '待我复核',
        value: pendingMy,
        unit: '份',
        tone: 'orange',
        helper: '指定复核人签审',
      })
    }
    return metrics
  }

  const total = overview?.totalCandidateCount ?? 0
  const pending = overview?.pendingCount ?? 0
  const confirmed = overview?.confirmedCount ?? 0
  const published = overview?.publishedCount ?? 0
  const blocked = overview?.blockedCount ?? 0
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
  if (pendingMy > 0) {
    metrics.push({
      key: 'pendingMyPublishReview',
      label: '待我复核',
      value: pendingMy,
      unit: '份',
      tone: 'orange',
      helper: '指定复核人签审',
    })
  }
  return metrics
}
