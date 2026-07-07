import type { FinalScoreRiskOverviewResponse } from '@/apis/mark/exam-score'

/** 成绩发布主链步骤状态 */
export type ScoreReleaseStepStatus = 'done' | 'active' | 'pending'

/** 成绩发布主链步骤（确认 → 发布） */
export interface ScoreReleaseStep {
  key: 'confirm' | 'publish'
  label: string
  description: string
  status: ScoreReleaseStepStatus
}

/**
 * 构造成绩发布两步主链；真源为 riskOverview.readyToPublish 与当前路由步骤。
 */
export function buildScoreReleaseSteps(
  currentStep: 'confirm' | 'publish',
  overview: FinalScoreRiskOverviewResponse | null,
  allScoresPublished?: boolean,
): ScoreReleaseStep[] {
  const confirmDone = overview?.readyToPublish === true
  const publishDone = allScoresPublished === true

  const confirmStatus: ScoreReleaseStepStatus = confirmDone
    ? 'done'
    : currentStep === 'confirm'
      ? 'active'
      : 'pending'

  let publishStatus: ScoreReleaseStepStatus
  if (publishDone) {
    publishStatus = 'done'
  } else if (currentStep === 'publish') {
    publishStatus = 'active'
  } else if (confirmDone) {
    publishStatus = 'pending'
  } else {
    publishStatus = 'pending'
  }

  return [
    {
      key: 'confirm',
      label: '成绩确认',
      description: confirmDone
        ? `已确认 ${overview?.confirmedCount ?? 0} 人`
        : `待确认 ${(overview?.pendingCount ?? 0) + (overview?.calculatedCount ?? 0)} 人`,
      status: confirmStatus,
    },
    {
      key: 'publish',
      label: '成绩发布',
      description: publishDone
        ? `已发布 ${overview?.publishedCount ?? 0} 人`
        : `可发布 ${overview?.confirmedCount ?? 0} 人`,
      status: publishStatus,
    },
  ]
}
