import type { AuditEvidenceItemRequest, AuditEvidenceItemVO } from './audit-evidence'
import type { AchievementAuditStatusCode } from './types'
/**
 * 达成度审核责任链事件 API。
 * 后端对象：AchievementAuditController /api/quality/achievement-audits。
 */
import http from '@/config/axios'

const AUDIT = '/api/quality/achievement-audits'

export interface AchievementAuditVO {
  id: string
  achievementResultId?: string
  auditorUserId?: string
  auditorNickName?: string
  auditorRole?: string
  auditEvent?: string
  auditStatusFrom?: AchievementAuditStatusCode
  auditStatusTo?: AchievementAuditStatusCode
  auditOpinion?: string
  returnReason?: string
  evidenceItems?: AuditEvidenceItemVO[]
  auditedTime?: string
  createTime?: string
  updateTime?: string
}

export interface AchievementAuditCreateRequest {
  achievementResultId: string
  auditorRole?: string
  auditEvent: string
  auditStatusFrom?: AchievementAuditStatusCode
  auditStatusTo?: AchievementAuditStatusCode
  auditOpinion?: string
  returnReason?: string
  evidenceItems?: AuditEvidenceItemRequest[]
}

export const achievementAuditApi = {
  listByResult: (achievementResultId: string) =>
    http.post<AchievementAuditVO[]>(`${AUDIT}/list-by-result`, { id: achievementResultId }),
  create: (data: AchievementAuditCreateRequest) => http.post<string>(`${AUDIT}/create`, data),
}
