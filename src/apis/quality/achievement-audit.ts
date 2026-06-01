import type { AchievementAuditStatus, ManualReviewDecision } from './types'
/**
 * 达成度审核责任链 + 人工复核 API
 *
 * 后端路径：
 * - /api/quality/achievement-audits            责任链事件流水（只追加）
 * - /api/quality/achievement-manual-reviews    人工复核记录（只追加）
 *
 * 设计文档 §7.8：审核责任链事件不可编辑，仅追加；真正的状态流转在 achievement_result 上。
 */
import http from '@/config/axios'

const AUDIT = '/api/quality/achievement-audits'
const REVIEW = '/api/quality/achievement-manual-reviews'

export interface AchievementAuditVO {
  id: string
  achievementResultId: string
  auditorUserId: string
  auditorNickName: string
  auditorRole?: string
  auditEvent: AchievementAuditStatus
  auditStatusFrom: AchievementAuditStatus
  auditStatusTo: AchievementAuditStatus
  auditOpinion?: string
  returnReason?: string
  evidenceItems?: AchievementAuditEvidenceItem[]
  auditedAt: string
  createTime?: string
  updateTime?: string
}

export interface AchievementAuditEvidenceItem {
  evidenceType?: string
  evidenceTitle?: string
  evidenceCode?: string
  archiveId?: string
  fileNodeId?: string
  reportId?: string
  remark?: string
}

export interface AchievementAuditCreateRequest {
  achievementResultId: string
  auditorRole?: string
  auditEvent: AchievementAuditStatus
  auditStatusFrom: AchievementAuditStatus
  auditStatusTo: AchievementAuditStatus
  auditOpinion?: string
  returnReason?: string
  evidenceItems?: AchievementAuditEvidenceItem[]
}

export interface AchievementManualReviewVO {
  id: string
  achievementResultId: string
  reviewerUserId: string
  reviewerNickName: string
  reviewerRole?: string
  decision: ManualReviewDecision
  reviewRemark?: string
  reviewedAt: string
  createTime?: string
  updateTime?: string
}

export interface AchievementManualReviewCreateRequest {
  achievementResultId: string
  reviewerRole?: string
  decision: ManualReviewDecision
  reviewRemark?: string
}

export const achievementAuditApi = {
  listByResult: (achievementResultId: string) =>
    http.post<AchievementAuditVO[]>(`${AUDIT}/list-by-result`, { id: achievementResultId }),
  create: (data: AchievementAuditCreateRequest) => http.post<string>(`${AUDIT}/create`, data),
}

export const achievementManualReviewApi = {
  listByResult: (achievementResultId: string) =>
    http.post<AchievementManualReviewVO[]>(`${REVIEW}/list-by-result`, { id: achievementResultId }),
  create: (data: AchievementManualReviewCreateRequest) =>
    http.post<string>(`${REVIEW}/create`, data),
}
