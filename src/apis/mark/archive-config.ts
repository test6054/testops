/**
 * 归档配置 API - 职责授权 / 密级策略
 */
import type { ArchiveSecurityLevelCode } from '@/apis/mark/archive-volume'
import type { ArchiveDutyTypeCode } from '@/types/enums/archive-duty-type-enum'
import http from '@/config/axios'
import {
  ALL_ARCHIVE_DUTY_TYPE_CODES,
  ArchiveDutyTypeDescription,
} from '@/types/enums/archive-duty-type-enum'

export {
  ALL_ARCHIVE_DUTY_TYPE_CODES,
  ArchiveDutyTypeCode,
  ArchiveDutyTypeDescription,
} from '@/types/enums/archive-duty-type-enum'

export const ARCHIVE_DUTY_TYPE_OPTIONS: Array<{ value: ArchiveDutyTypeCode, label: string }>
  = ALL_ARCHIVE_DUTY_TYPE_CODES.map((value) => ({
    value,
    label: ArchiveDutyTypeDescription[value],
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
