import type { ManualReviewDecisionCode } from './types'
/**
 * 达成度人工复核 API。
 * 后端对象：AchievementManualReviewController /api/quality/achievement-manual-reviews。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const REVIEW = '/api/quality/achievement-manual-reviews'

export interface AchievementManualReviewVO {
  id: string
  achievementResultId?: string
  reviewerUserId?: string
  reviewerNickName?: string
  reviewerRole?: string
  decision?: ManualReviewDecisionCode
  reviewRemark?: string
  reviewedTime?: string
  createTime?: string
  updateTime?: string
}

export interface AchievementManualReviewCreateRequest {
  achievementResultId: string
  reviewerRole?: string
  decision: ManualReviewDecisionCode
  reviewRemark?: string
}

export interface AchievementManualReviewQueryRequest extends QueryDto {
  achievementResultId: string
}

export const achievementManualReviewApi = {
  page: (data: AchievementManualReviewQueryRequest) =>
    http.post<PageResult<AchievementManualReviewVO>>(`${REVIEW}/page`, data),
  create: (data: AchievementManualReviewCreateRequest) =>
    http.post<string>(`${REVIEW}/create`, data),
}
