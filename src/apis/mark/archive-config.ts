/**
 * 归档配置 API - 职责授权 / 密级策略 / 时限策略
 */
import type { ArchiveSecurityLevelCode } from '@/apis/mark/archive-volume'
import type { ArchiveDeadlineTierCode } from '@/types/enums/archive-deadline-tier-enum'
import type { ArchiveDutyTypeCode } from '@/types/enums/archive-duty-type-enum'
import {
  ALL_ARCHIVE_DUTY_TYPE_CODES,
  ArchiveDutyTypeDescription,
} from '@/types/enums/archive-duty-type-enum'
import type { ArchiveKioskHubListModeCode } from '@/types/enums/archive-kiosk-hub-list-mode-enum'
import type { ArchiveSubmitModeCode } from '@/types/enums/archive-submit-mode-enum'
import http from '@/config/axios'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_ARCHIVE_DUTY_TYPE_CODES,
  ArchiveDutyTypeCode,
  ArchiveDutyTypeDescription,
} from '@/types/enums/archive-duty-type-enum'

export const ARCHIVE_DUTY_TYPE_OPTIONS: Array<{ value: ArchiveDutyTypeCode, label: string }>
  = ALL_ARCHIVE_DUTY_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(ArchiveDutyTypeDescription, value, '归档职责类型'),
  }))

export interface ArchiveDutyGrantResponse {
  grantId: string
  userId: string
  userNickName?: string
  userIdentifier?: string
  dutyType: ArchiveDutyTypeCode
  scopeDepartmentId?: string
  scopeDepartmentName?: string
  tenantWide?: boolean
  grantedTime?: string
}

export interface ArchiveDutyGrantItemRequest {
  userId: string
  dutyType: ArchiveDutyTypeCode
  scopeDepartmentId?: string
  tenantWide?: boolean
}

export interface ArchiveSecurityPolicyResponse {
  policyId: string
  dutyType: ArchiveDutyTypeCode
  maxSecurityLevel: ArchiveSecurityLevelCode
}

export interface ArchiveSecurityPolicyItemRequest {
  dutyType: ArchiveDutyTypeCode
  maxSecurityLevel: ArchiveSecurityLevelCode
}

export function listMyArchiveDutyGrants(): Promise<ArchiveDutyGrantResponse[]> {
  return http.post<ArchiveDutyGrantResponse[]>('/api/mark/archive-config/duty-grants/my', {})
}

export function listArchiveDutyGrants(): Promise<ArchiveDutyGrantResponse[]> {
  return http.post<ArchiveDutyGrantResponse[]>('/api/mark/archive-config/duty-grants/list', {})
}

export function saveArchiveDutyGrants(items: ArchiveDutyGrantItemRequest[]): Promise<void> {
  return http.post<void>('/api/mark/archive-config/duty-grants/save', { items })
}

export function listArchiveSecurityPolicy(): Promise<ArchiveSecurityPolicyResponse[]> {
  return http.post<ArchiveSecurityPolicyResponse[]>('/api/mark/archive-config/security-policy/list', {})
}

export function saveArchiveSecurityPolicy(
  items: ArchiveSecurityPolicyItemRequest[],
): Promise<void> {
  return http.post<void>('/api/mark/archive-config/security-policy/save', { items })
}

export interface ArchiveDeadlinePolicyResponse {
  policyId: string
  departmentId?: string
  deadlineTier: ArchiveDeadlineTierCode
  leadDays: number
  overdueSubmitBlock: boolean
  departmentReviewEnabled: boolean
}

export interface ArchiveDeadlinePolicyItemRequest {
  departmentId?: string
  deadlineTier: ArchiveDeadlineTierCode
  leadDays: number
  overdueSubmitBlock: boolean
  departmentReviewEnabled: boolean
}

export function listArchiveDeadlinePolicy(): Promise<ArchiveDeadlinePolicyResponse[]> {
  return http.post<ArchiveDeadlinePolicyResponse[]>('/api/mark/archive-config/deadline-policy/list', {})
}

export function saveArchiveDeadlinePolicy(
  items: ArchiveDeadlinePolicyItemRequest[],
): Promise<void> {
  return http.post<void>('/api/mark/archive-config/deadline-policy/save', { items })
}

export interface ArchiveTenantCollaborationPolicyResponse {
  autoSeedExamReviewers: boolean
  autoSeedCourseTeachers: boolean
  coordinatorImplicitSubmit: boolean
  scanOperatorMayEditCatalog: boolean
  submitMode: ArchiveSubmitModeCode
  kioskHubListMode: ArchiveKioskHubListModeCode
}

export type ArchiveTenantCollaborationPolicySaveRequest = ArchiveTenantCollaborationPolicyResponse

export function getArchiveCollaborationPolicy(): Promise<ArchiveTenantCollaborationPolicyResponse> {
  return http.post<ArchiveTenantCollaborationPolicyResponse>(
    '/api/mark/archive-config/collaboration-policy/get',
    {},
  )
}

export function saveArchiveCollaborationPolicy(
  request: ArchiveTenantCollaborationPolicySaveRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-config/collaboration-policy/save', request)
}
