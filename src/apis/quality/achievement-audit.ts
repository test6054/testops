import type { AchievementAuditStatus } from './types'
/**
 * 达成度审核责任链事件 API。
 * 后端对象：AchievementAuditController /api/quality/achievement-audits。
 */
import http from '@/config/axios'

const AUDIT = '/api/quality/achievement-audits'

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

export const achievementAuditApi = {
  listByResult: (achievementResultId: string) =>
    http.post<AchievementAuditVO[]>(`${AUDIT}/list-by-result`, { id: achievementResultId }),
  create: (data: AchievementAuditCreateRequest) => http.post<string>(`${AUDIT}/create`, data),
}
