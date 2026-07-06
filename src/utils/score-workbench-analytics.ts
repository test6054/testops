import type { ArchiveVolumeExamGateVO } from '@/apis/mark/archive-volume'
import type { WorkbenchScorePanelVO } from '@/apis/mark/exam-progress'
import type { FinalScoreRiskOverviewVO } from '@/apis/mark/exam-score'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import {
  FINAL_SCORE_STATUS_TONE,
  FinalScoreStatusCode,
  FinalScoreStatusDescription,
} from '@/apis/mark/final-score-status'

export type ScoreWorkbenchAnalyticsMode = 'confirm' | 'publish'

/** 分析区 stat-card 展示项 */
export interface ScoreAnalyticsStatItem {
  key: string
  label: string
  value: string
  valClass?: string
}

/** 分数状态流转节点（带人数） */
export interface ScoreAnalyticsFlowStep {
  code: FinalScoreStatusCode
  label: string
  tone: BadgeTone
  count: number
  emphasis: boolean
}

const STATUS_FLOW_ORDER: FinalScoreStatusCode[] = [
  FinalScoreStatusCode.PENDING,
  FinalScoreStatusCode.CALCULATED,
  FinalScoreStatusCode.CONFIRMED,
  FinalScoreStatusCode.CORRECTED,
  FinalScoreStatusCode.PUBLISHED,
  FinalScoreStatusCode.WITHDRAWN,
]

function formatScoreValue(value?: number): string {
  if (value == null) {
    return '—'
  }
  return String(value)
}

function formatPercentValue(value?: number): string {
  if (value == null) {
    return '—'
  }
  return `${value}%`
}

function formatCount(value: number | undefined, unit: string): string {
  if (value == null) {
    return '—'
  }
  return `${value}${unit}`
}

function statusCount(overview: FinalScoreRiskOverviewVO, code: FinalScoreStatusCode): number {
  switch (code) {
    case FinalScoreStatusCode.PENDING:
      return overview.pendingCount
    case FinalScoreStatusCode.CALCULATED:
      return overview.calculatedCount
    case FinalScoreStatusCode.CONFIRMED:
      return overview.confirmedCount
    case FinalScoreStatusCode.CORRECTED:
      return overview.correctedCount
    case FinalScoreStatusCode.PUBLISHED:
      return overview.publishedCount
    case FinalScoreStatusCode.WITHDRAWN:
      return overview.withdrawnCount
    default:
      return 0
  }
}

function resolveFlowEmphasis(
  code: FinalScoreStatusCode,
  mode: ScoreWorkbenchAnalyticsMode,
  overview: FinalScoreRiskOverviewVO,
  publishableCount: number,
): boolean {
  if (mode === 'confirm') {
    if (code === FinalScoreStatusCode.CALCULATED && overview.calculatedCount > 0) {
      return true
    }
    if (
      code === FinalScoreStatusCode.PENDING
      && overview.pendingCount > 0
      && overview.calculatedCount === 0
    ) {
      return true
    }
    return false
  }
  if (code === FinalScoreStatusCode.CONFIRMED && publishableCount > 0) {
    return true
  }
  if (
    code === FinalScoreStatusCode.PUBLISHED
    && overview.publishedCount > 0
    && publishableCount === 0
  ) {
    return true
  }
  return false
}

/** 有分布时右侧 stat-card 六格（确认 / 发布口径不同）。 */
export function buildScoreDistributionStatItems(
  panel: WorkbenchScorePanelVO,
  mode: ScoreWorkbenchAnalyticsMode,
  publishableCount: number,
): ScoreAnalyticsStatItem[] {
  const overview = panel.riskOverview
  const workflowTail
    = mode === 'publish'
      ? [
          {
            key: 'publishable',
            label: '可发布',
            value: formatCount(publishableCount, ' 人'),
            valClass: publishableCount > 0 ? 'stat-card__val--warn' : undefined,
          },
          {
            key: 'published',
            label: '已发布',
            value: formatCount(overview.publishedCount, ' 人'),
            valClass: overview.publishedCount > 0 ? 'stat-card__val--ok' : undefined,
          },
        ]
      : [
          {
            key: 'confirmed',
            label: '已确认',
            value: formatCount(overview.confirmedCount, ' 人'),
            valClass: overview.confirmedCount > 0 ? 'stat-card__val--ok' : undefined,
          },
          {
            key: 'published',
            label: '已发布',
            value: formatCount(overview.publishedCount, ' 人'),
            valClass: overview.publishedCount > 0 ? 'stat-card__val--ok' : undefined,
          },
        ]

  return [
    {
      key: 'max',
      label: '最高分',
      value: formatScoreValue(panel.maxScore),
      valClass: 'stat-card__val--ok',
    },
    {
      key: 'min',
      label: '最低分',
      value: formatScoreValue(panel.minScore),
      valClass: 'stat-card__val--danger',
    },
    {
      key: 'median',
      label: '中位数',
      value: formatScoreValue(panel.medianScore),
    },
    {
      key: 'excellent',
      label: '优秀率',
      value: formatPercentValue(panel.excellentRate),
      valClass: 'stat-card__val--primary',
    },
    ...workflowTail,
  ]
}

/** 无分布时 workflow 条（确认页）。 */
export function buildScoreConfirmWorkflowStatItems(
  overview: FinalScoreRiskOverviewVO,
): ScoreAnalyticsStatItem[] {
  return [
    {
      key: 'total',
      label: '全场考生',
      value: formatCount(overview.totalCandidateCount, ' 人'),
    },
    {
      key: 'pending',
      label: '待计算',
      value: formatCount(overview.pendingCount, ' 人'),
      valClass: overview.pendingCount > 0 ? 'stat-card__val--warn' : undefined,
    },
    {
      key: 'calculated',
      label: '可确认',
      value: formatCount(overview.calculatedCount, ' 人'),
      valClass: overview.calculatedCount > 0 ? 'stat-card__val--primary' : undefined,
    },
    {
      key: 'confirmed',
      label: '已确认',
      value: formatCount(overview.confirmedCount, ' 人'),
      valClass: overview.confirmedCount > 0 ? 'stat-card__val--ok' : undefined,
    },
    {
      key: 'published',
      label: '已发布',
      value: formatCount(overview.publishedCount, ' 人'),
      valClass: overview.publishedCount > 0 ? 'stat-card__val--ok' : undefined,
    },
    {
      key: 'blocked',
      label: '阻塞',
      value: formatCount(overview.blockedCount, ' 项'),
      valClass: overview.blockedCount > 0 ? 'stat-card__val--danger' : undefined,
    },
  ]
}

/** 无分布时 workflow 条（发布页）。 */
export function buildScorePublishWorkflowStatItems(
  overview: FinalScoreRiskOverviewVO,
  publishableCount: number,
  gate: ArchiveVolumeExamGateVO | null,
): ScoreAnalyticsStatItem[] {
  const unconfirmed = overview.pendingCount + overview.calculatedCount
  const items: ScoreAnalyticsStatItem[] = [
    {
      key: 'total',
      label: '考生总数',
      value: formatCount(overview.totalCandidateCount, ' 人'),
    },
    {
      key: 'publishable',
      label: '可发布',
      value: formatCount(publishableCount, ' 人'),
      valClass: publishableCount > 0 ? 'stat-card__val--warn' : undefined,
    },
    {
      key: 'published',
      label: '已发布',
      value: formatCount(overview.publishedCount, ' 人'),
      valClass: overview.publishedCount > 0 ? 'stat-card__val--ok' : undefined,
    },
  ]
  if (gate?.unpublishedBoundPaperCount != null) {
    items.push({
      key: 'unpublished-bound',
      label: '绑定卷未发布',
      value: formatCount(gate.unpublishedBoundPaperCount, ' 份'),
      valClass: gate.unpublishedBoundPaperCount > 0 ? 'stat-card__val--warn' : 'stat-card__val--ok',
    })
  }
  items.push(
    {
      key: 'corrected',
      label: '已订正',
      value: formatCount(overview.correctedCount, ' 人'),
      valClass: overview.correctedCount > 0 ? 'stat-card__val--primary' : undefined,
    },
    {
      key: 'withdrawn',
      label: '已撤回',
      value: formatCount(overview.withdrawnCount, ' 人'),
      valClass: overview.withdrawnCount > 0 ? 'stat-card__val--danger' : undefined,
    },
    {
      key: 'unconfirmed',
      label: '未确认',
      value: formatCount(unconfirmed, ' 人'),
      valClass: unconfirmed > 0 ? 'stat-card__val--warn' : undefined,
    },
  )
  return items
}

/** 分数状态流转（带人数与当前阶段强调）。 */
export function buildScoreAnalyticsFlowSteps(
  overview: FinalScoreRiskOverviewVO,
  mode: ScoreWorkbenchAnalyticsMode,
  publishableCount: number,
): ScoreAnalyticsFlowStep[] {
  return STATUS_FLOW_ORDER.map((code) => ({
    code,
    label: FinalScoreStatusDescription[code],
    tone: FINAL_SCORE_STATUS_TONE[code],
    count: statusCount(overview, code),
    emphasis: resolveFlowEmphasis(code, mode, overview, publishableCount),
  }))
}

export function resolveScoreAnalyticsOverviewTitle(
  hasDistribution: boolean,
  mode: ScoreWorkbenchAnalyticsMode,
): string {
  if (hasDistribution) {
    return '关键指标'
  }
  return mode === 'publish' ? '发布进度概览' : '成绩状态概览'
}

/** 全场发布确认弹窗 KPI 条。 */
export function buildScoreBulkPublishModalStatItems(
  overview: FinalScoreRiskOverviewVO,
  publishableCount: number,
): ScoreAnalyticsStatItem[] {
  const unconfirmed = overview.pendingCount + overview.calculatedCount
  return [
    {
      key: 'total',
      label: '全场考生',
      value: formatCount(overview.totalCandidateCount, ' 人'),
    },
    {
      key: 'publishable',
      label: '可发布',
      value: formatCount(publishableCount, ' 人'),
      valClass: publishableCount > 0 ? 'stat-card__val--warn' : undefined,
    },
    {
      key: 'published',
      label: '已发布',
      value: formatCount(overview.publishedCount, ' 人'),
      valClass: overview.publishedCount > 0 ? 'stat-card__val--ok' : undefined,
    },
    {
      key: 'unconfirmed',
      label: '未确认',
      value: formatCount(unconfirmed, ' 人'),
      valClass: unconfirmed > 0 ? 'stat-card__val--warn' : undefined,
    },
    {
      key: 'blocked',
      label: '阻塞',
      value: formatCount(overview.blockedCount, ' 项'),
      valClass: overview.blockedCount > 0 ? 'stat-card__val--danger' : undefined,
    },
    {
      key: 'safe',
      label: '可安全确认',
      value: formatCount(overview.safeConfirmableCount, ' 人'),
      valClass: overview.safeConfirmableCount > 0 ? 'stat-card__val--primary' : undefined,
    },
  ]
}
