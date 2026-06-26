/**
 * 归档配置 API - 职责授权 / 密级策略
 */
import type { ArchiveSecurityLevelCode } from '@/apis/mark/archive-volume'
import http from '@/config/axios'

export type ArchiveDutyTypeCode
  = | 'VOLUME_OWNER'
    | 'COLLEGE_COORDINATOR'
    | 'TRANSFER_REVIEWER'
    | 'ARCHIVE_ADMIN'
    | 'DESTRUCTION_APPROVER'
    | 'SUPERVISION_INSPECTOR'

export const ARCHIVE_DUTY_TYPE_LABEL: Record<ArchiveDutyTypeCode, string> = {
  VOLUME_OWNER: '卷归属人',
  COLLEGE_COORDINATOR: '学院协调',
  TRANSFER_REVIEWER: '移交验收',
  ARCHIVE_ADMIN: '档案管理',
  DESTRUCTION_APPROVER: '销毁审批',
  SUPERVISION_INSPECTOR: '督导抽查',
}

export interface ArchiveDutyGrantVO {
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

export interface ArchiveSecurityPolicyVO {
  policyId: string
  dutyType: ArchiveDutyTypeCode
  maxSecurityLevel: ArchiveSecurityLevelCode
}

export interface ArchiveSecurityPolicyItemRequest {
  dutyType: ArchiveDutyTypeCode
  maxSecurityLevel: ArchiveSecurityLevelCode
}

export function listMyArchiveDutyGrants(): Promise<ArchiveDutyGrantVO[]> {
  return http.post<ArchiveDutyGrantVO[]>('/api/mark/archive-config/duty-grants/my', {})
}

export function listArchiveDutyGrants(): Promise<ArchiveDutyGrantVO[]> {
  return http.post<ArchiveDutyGrantVO[]>('/api/mark/archive-config/duty-grants/list', {})
}

export function saveArchiveDutyGrants(items: ArchiveDutyGrantItemRequest[]): Promise<void> {
  return http.post<void>('/api/mark/archive-config/duty-grants/save', { items })
}

export function listArchiveSecurityPolicy(): Promise<ArchiveSecurityPolicyVO[]> {
  return http.post<ArchiveSecurityPolicyVO[]>('/api/mark/archive-config/security-policy/list', {})
}

export function saveArchiveSecurityPolicy(items: ArchiveSecurityPolicyItemRequest[]): Promise<void> {
  return http.post<void>('/api/mark/archive-config/security-policy/save', { items })
}
