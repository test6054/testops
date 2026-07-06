/**
 * 审核评估督导复查 API - 对接 AuditSupervisionController
 *
 * 后端路径：/api/quality/audit-evaluation/supervisions
 */
import type { AuditEvidenceItemRequest, AuditEvidenceItemVO } from './audit-evidence'
import type { AuditSupervisionTypeCode } from './types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type {
  AuditSupervisionScopeCode} from '@/types/enums/audit-supervision-scope-enum';
import http from '@/config/axios'
import {
  ALL_AUDIT_SUPERVISION_CONCLUSION_CODES,
  AuditSupervisionConclusionCode,
  AuditSupervisionConclusionDescription,
} from '@/types/enums/audit-supervision-conclusion-enum'
import {
  ALL_AUDIT_SUPERVISION_SCOPE_CODES,
  AuditSupervisionScopeDescription,
} from '@/types/enums/audit-supervision-scope-enum'

const BASE = '/api/quality/audit-evaluation/supervisions'

export {
  ALL_AUDIT_SUPERVISION_CONCLUSION_CODES,
  AuditSupervisionConclusionCode,
  AuditSupervisionConclusionDescription,
} from '@/types/enums/audit-supervision-conclusion-enum'

export {
  ALL_AUDIT_SUPERVISION_SCOPE_CODES,
  AuditSupervisionScopeCode,
  AuditSupervisionScopeDescription,
} from '@/types/enums/audit-supervision-scope-enum'

/** 督导复查结论徽标色调 */
export const AUDIT_SUPERVISION_CONCLUSION_TONE: Record<AuditSupervisionConclusionCode, BadgeTone> = {
  [AuditSupervisionConclusionCode.PASS]: 'green',
  [AuditSupervisionConclusionCode.NEEDS_IMPROVEMENT]: 'orange',
  [AuditSupervisionConclusionCode.FAIL]: 'red',
}

export const AUDIT_SUPERVISION_SCOPE_OPTIONS: Array<{ value: AuditSupervisionScopeCode, label: string }>
  = ALL_AUDIT_SUPERVISION_SCOPE_CODES.map((value) => ({
    value,
    label: AuditSupervisionScopeDescription[value],
  }))

export const AUDIT_SUPERVISION_CONCLUSION_OPTIONS: Array<{
  value: AuditSupervisionConclusionCode
  label: string
  tone: BadgeTone
}> = ALL_AUDIT_SUPERVISION_CONCLUSION_CODES.map((value) => ({
  value,
  label: AuditSupervisionConclusionDescription[value],
  tone: AUDIT_SUPERVISION_CONCLUSION_TONE[value],
}))

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
  supervisionType: AuditSupervisionTypeCode
  supervisionScope?: AuditSupervisionScopeCode
  supervisorUserId?: string
  supervisedTime?: string
  summary?: string
  findingItems?: AuditSupervisionFindingItemVO[]
  conclusion?: AuditSupervisionConclusionCode
  archiveId?: string
  evidenceItems?: AuditEvidenceItemVO[]
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
  supervisionType: AuditSupervisionTypeCode
  supervisionScope?: AuditSupervisionScopeCode
  supervisorUserId?: string
  supervisedTime?: string
  summary?: string
  findingItems?: AuditSupervisionFindingItemRequest[]
  conclusion?: AuditSupervisionConclusionCode
  archiveId?: string
  evidenceItems?: AuditEvidenceItemRequest[]
}

export interface AuditSupervisionFindingItemRequest {
  findingType?: string
  findingTitle?: string
  findingDescription?: string
  severity?: string
  responsibleUnit?: string
  improvementSuggestion?: string
}

export interface AuditSupervisionFindingItemVO {
  id?: string
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
  qualityCourseId?: string
  supervisionType?: AuditSupervisionTypeCode
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
