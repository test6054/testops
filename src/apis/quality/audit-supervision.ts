/**
 * 审核评估督导复查 API - 对接 AuditSupervisionController
 *
 * 后端路径：/api/quality/audit-evaluation/supervisions
 */
import type { QualityAuditEvidenceItem } from './audit-evidence'
import type { AuditSupervisionType } from './types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/audit-evaluation/supervisions'

/** 督导复查范围 - 对应后端 AuditSupervisionScopeEnum */
export type AuditSupervisionScope = 'COURSE' | 'PROGRAM' | 'TRAINING_PLAN' | 'COMPREHENSIVE'

/** 督导复查结论 - 对应后端 AuditSupervisionConclusionEnum */
export type AuditSupervisionConclusion = 'PASS' | 'NEEDS_IMPROVEMENT' | 'FAIL'

export interface AuditSupervisionVO {
  id: string
  tenantId?: string
  auditIssueId?: string
  rectificationId?: string
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  supervisionCode: string
  supervisionTitle: string
  supervisionType: AuditSupervisionType
  supervisionScope?: AuditSupervisionScope
  supervisorUserId?: string
  supervisedAt?: string
  summary?: string
  findingItems?: AuditSupervisionFindingItem[]
  conclusion?: AuditSupervisionConclusion
  archiveId?: string
  evidenceItems?: QualityAuditEvidenceItem[]
  createUser?: string
  updateUser?: string
  createTime?: string
  updateTime?: string
}

export interface AuditSupervisionSaveRequest {
  id?: string
  auditIssueId?: string
  rectificationId?: string
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  supervisionCode: string
  supervisionTitle: string
  supervisionType: AuditSupervisionType
  supervisionScope?: AuditSupervisionScope
  supervisorUserId?: string
  supervisedAt?: string
  summary?: string
  findingItems?: AuditSupervisionFindingItem[]
  conclusion?: AuditSupervisionConclusion
  archiveId?: string
  evidenceItems?: QualityAuditEvidenceItem[]
}

export interface AuditSupervisionFindingItem {
  findingType?: string
  findingTitle?: string
  findingDescription?: string
  severity?: string
  responsibleUnit?: string
  improvementSuggestion?: string
}

export interface AuditSupervisionQueryRequest extends QueryDto {
  auditIssueId?: string
  programId?: string
  trainingPlanId?: string
  supervisionType?: AuditSupervisionType
  conclusion?: string
  supervisorUserId?: string
  keyword?: string
}

export const auditSupervisionApi = {
  page: (data: AuditSupervisionQueryRequest) =>
    http.post<PageResult<AuditSupervisionVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<AuditSupervisionVO>(`${BASE}/detail`, { id }),
  create: (data: AuditSupervisionSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: AuditSupervisionSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
}
