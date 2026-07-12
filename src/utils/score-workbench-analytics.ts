import type { ExamWorkbenchScorePanelResponse } from '@/apis/mark/exam-progress'
import type { FinalScoreRiskOverviewResponse } from '@/apis/mark/exam-score'
import type { BadgeTone, UiSectionTabItem } from '@/components/ui-guide/ui/types'
import {
  FINAL_SCORE_STATUS_TONE,
  FinalScoreStatusCode,
  FinalScoreStatusDescription,
} from '@/apis/mark/final-score-status'
import { strictEnumLabel } from '@/utils/strict-enum'

export type ScoreWorkbenchAnalyticsMode = 'confirm' | 'publish'

/** 成绩名单状态 Tab：全部 */
export const SCORE_STATUS_TAB_ALL = 'ALL'

/** 成绩名单状态 Tab 键：全部 + 最终成绩状态枚举值 */
export type ScoreStatusTabKey = typeof SCORE_STATUS_TAB_ALL | FinalScoreStatusCode

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

function statusCount(overview: FinalScoreRiskOverviewResponse, code: FinalScoreStatusCode): number {
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
  overview: FinalScoreRiskOverviewResponse,
  publishableCount: number,
): boolean {
  if (mode === 'confirm') {
    if (code === FinalScoreStatusCode.CALCULATED && overview.calculatedCount > 0) {
      return true
    }
    return (
      code === FinalScoreStatusCode.PENDING
      && overview.pendingCount > 0
      && overview.calculatedCount === 0
    )
  }
  if (code === FinalScoreStatusCode.CONFIRMED && publishableCount > 0) {
    return true
  }
  return (
    code === FinalScoreStatusCode.PUBLISHED && overview.publishedCount > 0 && publishableCount === 0
  )
}

/** 有分布时右侧 stat-card 六格（确认 / 发布口径不同）。 */
export function buildScoreDistributionStatItems(
  panel: ExamWorkbenchScorePanelResponse,
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

/** 分数状态流转（带人数与当前阶段强调）。 */
export function buildScoreAnalyticsFlowSteps(
  overview: FinalScoreRiskOverviewResponse,
  mode: ScoreWorkbenchAnalyticsMode,
  publishableCount: number,
): ScoreAnalyticsFlowStep[] {
  return STATUS_FLOW_ORDER.map((code) => ({
    code,
    label: strictEnumLabel(FinalScoreStatusDescription, code, '最终成绩状态'),
    tone: FINAL_SCORE_STATUS_TONE[code],
    count: statusCount(overview, code),
    emphasis: resolveFlowEmphasis(code, mode, overview, publishableCount),
  }))
}

export function resolveScoreAnalyticsOverviewTitle(
  hasDistribution: boolean,
  _mode: ScoreWorkbenchAnalyticsMode,
): string {
  if (hasDistribution) {
    return '关键指标'
  }
  return '分数状态流转'
}

/** 成绩名单状态 Tab：计数须来自 getFinalScoreRiskOverview，禁止用分页名单推断。 */
export function buildScoreConfirmStatusTabItems(
  overview: FinalScoreRiskOverviewResponse | null,
): UiSectionTabItem[] {
  if (!overview) {
    return [
      { key: SCORE_STATUS_TAB_ALL, label: '全部', disabled: true },
      ...STATUS_FLOW_ORDER.map((code) => ({
        key: code,
        label: strictEnumLabel(FinalScoreStatusDescription, code, '最终成绩状态'),
        disabled: true,
      })),
    ]
  }
  return [
    {
      key: SCORE_STATUS_TAB_ALL,
      label: '全部',
      count: overview.totalCandidateCount,
      badgeTone: 'blue',
    },
    ...STATUS_FLOW_ORDER.map((code) => ({
      key: code,
      label: strictEnumLabel(FinalScoreStatusDescription, code, '最终成绩状态'),
      count: statusCount(overview, code),
      badgeTone: FINAL_SCORE_STATUS_TONE[code],
    })),
  ]
}

/** 全场发布确认弹窗 KPI 条。 */
export function buildScoreBulkPublishModalStatItems(
  overview: FinalScoreRiskOverviewResponse,
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
