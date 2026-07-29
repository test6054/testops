import type { ExamWorkbenchScorePanelResponse } from '@/apis/mark/exam-progress'
import type { FinalScoreRiskOverviewResponse } from '@/apis/mark/exam-score'
import type { SignalMetric } from '@/types/workbench'

/**
 * 成绩确认页 Signal：任务漏斗主卡 + 次级规模（方案 2）。
 * 有分布时主卡为总考生/待我复核；无分布时主卡优先阻塞风险 → 待我复核 → 待计算。
 * 安全批确认 / 题未确认 / 延迟确认等阻断细节由 ScoreConfirmReadinessPanel 承载，禁止回填信号带。
 */
export function buildScoreFinalizeSignalMetrics(
  panel: ExamWorkbenchScorePanelResponse | null,
  overview: FinalScoreRiskOverviewResponse | null,
): SignalMetric[] {
  const pendingMy = overview?.pendingMyPublishReviewCount ?? 0

  if (panel?.distributionAvailable) {
    const total = overview?.totalCandidateCount ?? 0
    const primary: SignalMetric
      = pendingMy > 0
        ? {
            key: 'pendingMyPublishReview',
            label: '待我复核',
            value: pendingMy,
            unit: '份',
            tone: 'orange',
            emphasis: 'primary',
            actionLabel: '去复核',
            helper: '指定复核人签审',
          }
        : {
            key: 'total',
            label: '总考生',
            value: total,
            unit: '人',
            tone: 'blue',
            emphasis: 'primary',
            actionLabel: '查看名单',
            helper: '本场成绩确认范围',
          }

    const secondaryPool: SignalMetric[] = [
      {
        key: 'total',
        label: '总考生',
        value: total,
        unit: '人',
        tone: 'blue',
        emphasis: 'secondary',
      },
      {
        key: 'avg',
        label: '平均分',
        value: panel.avgScore != null ? String(panel.avgScore) : '—',
        tone: 'green',
        emphasis: 'secondary',
      },
      {
        key: 'pass',
        label: '及格率',
        value: panel.passRate != null ? `${panel.passRate}%` : '—',
        tone: 'green',
        emphasis: 'secondary',
      },
      {
        key: 'absent',
        label: '缺考',
        value: panel.absentCount,
        unit: '人',
        tone: panel.absentCount > 0 ? 'orange' : 'gray',
        emphasis: 'secondary',
      },
      {
        key: 'stddev',
        label: '标准差',
        value: panel.stdDev != null ? String(panel.stdDev) : '—',
        tone: 'gray',
        emphasis: 'secondary',
      },
      {
        key: 'pendingMyPublishReview',
        label: '待我复核',
        value: pendingMy,
        unit: '份',
        tone: 'orange',
        emphasis: 'secondary',
        helper: '指定复核人签审',
      },
    ]

    return [
      primary,
      ...secondaryPool
        .filter((item) => item.key !== primary.key)
        .filter((item) => item.key !== 'pendingMyPublishReview' || pendingMy > 0)
        .slice(0, 3),
    ]
  }

  const total = overview?.totalCandidateCount ?? 0
  const pending = overview?.pendingCount ?? 0
  const confirmed = overview?.confirmedCount ?? 0
  const published = overview?.publishedCount ?? 0
  const blocked = overview?.blockedCount ?? 0

  const blockedPrimary: SignalMetric = {
    key: 'blocked',
    label: '阻塞风险',
    value: blocked,
    unit: '项',
    tone: blocked > 0 ? 'red' : 'gray',
    emphasis: 'primary',
    actionLabel: blocked > 0 ? '处理阻塞' : undefined,
    helper: blocked > 0 ? '发布前优先清阻塞' : '当前无阻塞风险',
  }
  const myReviewPrimary: SignalMetric = {
    key: 'pendingMyPublishReview',
    label: '待我复核',
    value: pendingMy,
    unit: '份',
    tone: 'orange',
    emphasis: 'primary',
    actionLabel: '去复核',
    helper: '指定复核人签审',
  }
  const pendingPrimary: SignalMetric = {
    key: 'pending',
    label: '待计算',
    value: pending,
    unit: '人',
    tone: pending > 0 ? 'orange' : 'gray',
    emphasis: 'primary',
    actionLabel: pending > 0 ? '推进计算' : undefined,
    helper: pending > 0 ? '成绩待计算队列' : '暂无待计算',
  }
  const totalPrimary: SignalMetric = {
    key: 'total',
    label: '全场考生',
    value: total,
    unit: '人',
    tone: 'blue',
    emphasis: 'primary',
    helper: '本场成绩确认范围',
  }

  const primary
    = blocked > 0
      ? blockedPrimary
      : pendingMy > 0
        ? myReviewPrimary
        : pending > 0
          ? pendingPrimary
          : totalPrimary

  const secondaryPool: SignalMetric[] = [
    {
      key: 'total',
      label: '全场考生',
      value: total,
      unit: '人',
      tone: 'blue',
      emphasis: 'secondary',
    },
    {
      key: 'pending',
      label: '待计算',
      value: pending,
      unit: '人',
      tone: pending > 0 ? 'orange' : 'gray',
      emphasis: 'secondary',
    },
    {
      key: 'confirmed',
      label: '已确认',
      value: confirmed,
      unit: '人',
      tone: confirmed > 0 ? 'blue' : 'gray',
      emphasis: 'secondary',
    },
    {
      key: 'published',
      label: '已发布',
      value: published,
      unit: '人',
      tone: published > 0 ? 'green' : 'gray',
      emphasis: 'secondary',
    },
    {
      key: 'blocked',
      label: '阻塞风险',
      value: blocked,
      unit: '项',
      tone: blocked > 0 ? 'red' : 'gray',
      emphasis: 'secondary',
    },
    {
      key: 'pendingMyPublishReview',
      label: '待我复核',
      value: pendingMy,
      unit: '份',
      tone: 'orange',
      emphasis: 'secondary',
      helper: '指定复核人签审',
    },
  ]

  return [
    primary,
    ...secondaryPool
      .filter((item) => item.key !== primary.key)
      .filter((item) => item.key !== 'pendingMyPublishReview' || pendingMy > 0)
      .slice(0, 3),
  ]
}
