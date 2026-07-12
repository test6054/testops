import type { ArchiveTemplateScopeCode } from '@/apis/mark/archive-template-scope'
import type { ArchiveExamFormCode, ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import type { PageResult, QueryDto } from '@/types'
import type { ArchiveSetupActionLinkCode } from '@/types/enums/archive-setup-action-link-enum'
import type { ArchiveTenantTemplateOperationTypeCode } from '@/types/enums/archive-tenant-template-operation-type-enum'
import http from '@/config/axios'

export interface ArchivePlatformTemplateSetResponse {
  setCode: string
  setName: string
  examForm?: ArchiveExamFormCode
  description?: string
  releaseTag?: string
  /** 模板作用域，平台模板固定 PLATFORM */
  templateScope: ArchiveTemplateScopeCode
}

export interface ArchivePlatformMaterialItemResponse {
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  catalogName?: string
  requiredFlag?: boolean
  sortOrder?: number
  categoryGroup?: string
}

export interface ArchivePlatformSelfCheckItemResponse {
  itemText: string
  requiredFlag?: boolean
  sortOrder?: number
}

export interface ArchivePlatformTemplatePreviewResponse {
  templateSet: ArchivePlatformTemplateSetResponse
  materialItems: ArchivePlatformMaterialItemResponse[]
  selfCheckItems: ArchivePlatformSelfCheckItemResponse[]
}

export interface ArchivePlatformTemplatePreviewRequest {
  sourceSetCode: string
}

export interface ArchivePlatformTemplateCopyToTenantRequest {
  sourceSetCode: string
  targetSetCode: string
  overrideIfExists?: boolean
}

export interface ArchivePlatformTemplateCopyAllToTenantRequest {
  targetPrefix: string
  overrideIfExists?: boolean
}

export interface ArchivePlatformTemplateResyncRequest {
  templateSetCode: string
  confirmSetCode: string
}

export interface ArchiveTenantTemplateSetResponse {
  templateSetCode: string
  templateSetName: string
  examForm?: ArchiveExamFormCode
  forkSourceSetCode?: string
  forkSourceReleaseTag?: string
  releaseTag?: string
  description?: string
  defaultPermanentRetention?: boolean
  defaultRetentionYears?: number
  retentionPolicyLabel?: string
  /** 模板作用域：PLATFORM 平台母版 / TENANT 本校副本 */
  templateScope: ArchiveTemplateScopeCode
  materialItems?: ArchiveMaterialCatalogTemplateResponse[]
  selfCheckItems?: ArchiveSelfCheckTemplateResponse[]
}

export interface ArchiveMaterialCatalogTemplateResponse {
  templateItemId?: string
  examForm?: ArchiveExamFormCode
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  catalogName?: string
  requiredFlag?: boolean
  delayAllowedFlag?: boolean
  sortOrder?: number
}

export interface ArchiveSelfCheckTemplateResponse {
  selfCheckItemId?: string
  itemText: string
  requiredFlag?: boolean
  itemOrder?: number
}

export interface ArchiveTenantTemplateSetQueryRequest {
  templateSetCode: string
}

export interface ArchiveTenantTemplateMaterialItemRequest {
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  catalogName: string
  requiredFlag: boolean
  delayAllowedFlag?: boolean
  sortOrder?: number
}

export interface ArchiveTenantTemplateSelfCheckItemRequest {
  itemText: string
  requiredFlag: boolean
  itemOrder?: number
}

export interface ArchiveTenantTemplateSetSaveRequest {
  templateSetCode: string
  templateSetName: string
  examForm: ArchiveExamFormCode
  defaultPermanentRetention?: boolean
  defaultRetentionYears?: number
  retentionPolicyLabel?: string
  materialItems: ArchiveTenantTemplateMaterialItemRequest[]
  selfCheckItems: ArchiveTenantTemplateSelfCheckItemRequest[]
}

export interface ArchivePlatformTemplateMaterialItemRequest {
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  catalogName: string
  requiredFlag: boolean
  sortOrder?: number
  categoryGroup?: string
}

export interface ArchivePlatformTemplateSelfCheckItemRequest {
  itemText: string
  requiredFlag: boolean
  sortOrder?: number
}

export interface ArchivePlatformTemplateSetSaveRequest {
  setCode: string
  setName: string
  examForm: ArchiveExamFormCode
  description?: string
  releaseTag: string
  materialItems: ArchivePlatformTemplateMaterialItemRequest[]
  selfCheckItems: ArchivePlatformTemplateSelfCheckItemRequest[]
}

export interface ArchivePlatformTemplateInitializeResponse {
  beforeSetCount?: number
  afterSetCount?: number
  seeded?: boolean
}

export {
  ALL_ARCHIVE_SETUP_ACTION_LINK_CODES,
  ArchiveSetupActionLinkCode,
  ArchiveSetupActionLinkDescription,
} from '@/types/enums/archive-setup-action-link-enum'

export interface ArchiveSetupActionLinkResponse {
  linkCode: ArchiveSetupActionLinkCode
  linkName: string
  linkTarget: string
}

export interface ArchiveTenantSetupReadinessResponse {
  rolesReady?: boolean
  templatesReady?: boolean
  dutiesReady?: boolean
  overallReady?: boolean
  historicalVolumeExists?: boolean
  missingItems?: string[]
  actionLinks?: ArchiveSetupActionLinkResponse[]
}

export function listArchivePlatformTemplateSets(): Promise<ArchivePlatformTemplateSetResponse[]> {
  return http.post<ArchivePlatformTemplateSetResponse[]>(
    '/api/mark/archive-volumes/platform-template/list-sets',
    {},
  )
}

export function previewArchivePlatformTemplateSet(
  request: ArchivePlatformTemplatePreviewRequest,
): Promise<ArchivePlatformTemplatePreviewResponse> {
  return http.post<ArchivePlatformTemplatePreviewResponse>(
    '/api/mark/archive-volumes/platform-template/preview',
    request,
  )
}

export function copyArchivePlatformTemplateToTenant(
  request: ArchivePlatformTemplateCopyToTenantRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/platform-template/copy-to-tenant', request)
}

export function copyAllArchivePlatformTemplatesToTenant(
  request: ArchivePlatformTemplateCopyAllToTenantRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/platform-template/copy-all-to-tenant', request)
}

export function resyncArchiveTenantTemplateSet(
  request: ArchivePlatformTemplateResyncRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/platform-template/resync-tenant-set', request)
}

export function listArchiveTenantTemplateSets(): Promise<ArchiveTenantTemplateSetResponse[]> {
  return http.post<ArchiveTenantTemplateSetResponse[]>(
    '/api/mark/archive-volumes/tenant/template-set/list',
    {},
  )
}

export function getArchiveTenantTemplateSetDetail(
  request: ArchiveTenantTemplateSetQueryRequest,
): Promise<ArchiveTenantTemplateSetResponse> {
  return http.post<ArchiveTenantTemplateSetResponse>(
    '/api/mark/archive-volumes/tenant/template-set/detail',
    request,
  )
}

export function saveArchiveTenantTemplateSet(
  request: ArchiveTenantTemplateSetSaveRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/tenant/template-set/save', request)
}

export function saveArchivePlatformTemplateSet(
  request: ArchivePlatformTemplateSetSaveRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/platform-template/save', request)
}

export function initializeArchivePlatformTemplateDefaults(): Promise<ArchivePlatformTemplateInitializeResponse> {
  return http.post<ArchivePlatformTemplateInitializeResponse>(
    '/api/mark/archive-volumes/platform-template/initialize-defaults',
    {},
  )
}

export function getArchiveTenantSetupReadiness(): Promise<ArchiveTenantSetupReadinessResponse> {
  return http.post<ArchiveTenantSetupReadinessResponse>(
    '/api/mark/archive-volumes/tenant/setup-readiness',
    {},
  )
}

export interface ArchiveTenantTemplateAuditPageRequest extends QueryDto {
  templateSetCode: string
}

export interface ArchiveTenantTemplateAuditItemVO {
  auditId: string
  templateSetCode: string
  operationType: ArchiveTenantTemplateOperationTypeCode
  operatorUserId?: string
  createTime?: string
}

export interface ArchivePlatformTemplateRestoreFromAuditRequest {
  auditId: string
}

export function pageArchiveTenantTemplateAudit(
  request: ArchiveTenantTemplateAuditPageRequest,
): Promise<PageResult<ArchiveTenantTemplateAuditItemVO>> {
  return http.post<PageResult<ArchiveTenantTemplateAuditItemVO>>(
    '/api/mark/archive-volumes/platform-template/audit/page',
    request,
  )
}

export function restoreArchiveTenantTemplateFromAudit(
  request: ArchivePlatformTemplateRestoreFromAuditRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/platform-template/restore-from-audit', request)
}
