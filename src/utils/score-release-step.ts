import type { FinalScoreRiskOverviewResponse } from '@/apis/mark/exam-score'

/** 成绩发布主链步骤状态 */
export type ScoreReleaseStepStatus = 'done' | 'active' | 'pending'

/** 成绩确认与发布进度步骤（同页双段进度，非双路由） */
export interface ScoreReleaseStep {
  key: 'confirm' | 'publish'
  label: string
  description: string
  status: ScoreReleaseStepStatus
}

/**
 * 按 riskOverview 构造确认/发布进度；无独立路由步骤，禁止传入历史 currentStep。
 */
export function buildScoreReleaseSteps(
  overview: FinalScoreRiskOverviewResponse | null,
  allScoresPublished?: boolean,
): ScoreReleaseStep[] {
  const confirmDone = overview?.readyToSubmitPublishReview === true
  const publishDone = allScoresPublished === true

  const confirmStatus: ScoreReleaseStepStatus = confirmDone ? 'done' : 'active'

  let publishStatus: ScoreReleaseStepStatus
  if (publishDone) {
    publishStatus = 'done'
  } else if (confirmDone) {
    publishStatus = 'active'
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
      label: '发布复核',
      description: publishDone
        ? `已发布 ${overview?.publishedCount ?? 0} 人`
        : `可提交复核 ${overview?.publishableCount ?? 0} 人`
          + ((overview?.pendingPublishReviewCount ?? 0) > 0
            ? ` · 待签审 ${overview?.pendingPublishReviewCount} 人`
            : ''),
      status: publishStatus,
    },
  ]
}
