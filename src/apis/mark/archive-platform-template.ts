import type { ArchiveTemplateScopeCode } from '@/apis/mark/archive-template-scope'
import type { ArchiveExamFormCode, ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import http from '@/config/axios'

export interface ArchivePlatformTemplateSetVO {
  setCode: string
  setName: string
  examForm?: ArchiveExamFormCode
  description?: string
  releaseTag?: string
  /** 模板作用域，平台模板固定 PLATFORM */
  templateScope: ArchiveTemplateScopeCode
}

export interface ArchivePlatformMaterialItemVO {
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  catalogName?: string
  requiredFlag?: boolean
  sortOrder?: number
  categoryGroup?: string
}

export interface ArchivePlatformSelfCheckItemVO {
  itemText: string
  requiredFlag?: boolean
  sortOrder?: number
}

export interface ArchivePlatformTemplatePreviewVO {
  templateSet: ArchivePlatformTemplateSetVO
  materialItems: ArchivePlatformMaterialItemVO[]
  selfCheckItems: ArchivePlatformSelfCheckItemVO[]
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

export interface ArchiveTenantTemplateSetVO {
  templateSetCode: string
  templateSetName: string
  examForm?: ArchiveExamFormCode
  forkSourceSetCode?: string
  forkSourceReleaseTag?: string
  releaseTag?: string
  description?: string
  /** 模板作用域：PLATFORM 平台母版 / TENANT 本校副本 */
  templateScope: ArchiveTemplateScopeCode
  materialItems?: ArchiveMaterialCatalogTemplateItemVO[]
  selfCheckItems?: ArchiveSelfCheckTemplateItemVO[]
}

export interface ArchiveMaterialCatalogTemplateItemVO {
  templateItemId?: string
  examForm?: ArchiveExamFormCode
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  catalogName?: string
  requiredFlag?: boolean
  delayAllowedFlag?: boolean
  sortOrder?: number
}

export interface ArchiveSelfCheckTemplateItemVO {
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

/** 模板材料编辑行：平台 / 租户 SaveRequest 合同字段 + 表格 rowKey */
export type ArchiveTemplateMaterialEditRow = ArchivePlatformTemplateMaterialItemRequest
  & ArchiveTenantTemplateMaterialItemRequest
  & {
    rowKey: string
  }

/** 模板自查项编辑行：平台 sortOrder / 租户 itemOrder 与 SaveRequest 一致 + 表格 rowKey */
export type ArchiveTemplateSelfCheckEditRow = ArchivePlatformTemplateSelfCheckItemRequest
  & ArchiveTenantTemplateSelfCheckItemRequest
  & {
    rowKey: string
  }

export interface ArchivePlatformTemplateInitializeVO {
  beforeSetCount?: number
  afterSetCount?: number
  seeded?: boolean
}

export type ArchiveSetupActionLinkCode = 'ROLES' | 'TEMPLATES' | 'DUTIES'

export interface ArchiveSetupActionLinkVO {
  linkCode: ArchiveSetupActionLinkCode
  linkName: string
  linkTarget: string
}

export interface ArchiveTenantSetupReadinessVO {
  rolesReady?: boolean
  templatesReady?: boolean
  dutiesReady?: boolean
  overallReady?: boolean
  missingItems?: string[]
  actionLinks?: ArchiveSetupActionLinkVO[]
}

export function listArchivePlatformTemplateSets(): Promise<ArchivePlatformTemplateSetVO[]> {
  return http.post<ArchivePlatformTemplateSetVO[]>('/api/mark/archive-volumes/platform-template/list-sets', {})
}

export function previewArchivePlatformTemplateSet(
  request: ArchivePlatformTemplatePreviewRequest,
): Promise<ArchivePlatformTemplatePreviewVO> {
  return http.post<ArchivePlatformTemplatePreviewVO>('/api/mark/archive-volumes/platform-template/preview', request)
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

export function listArchiveTenantTemplateSets(): Promise<ArchiveTenantTemplateSetVO[]> {
  return http.post<ArchiveTenantTemplateSetVO[]>('/api/mark/archive-volumes/tenant/template-set/list', {})
}

export function getArchiveTenantTemplateSetDetail(
  request: ArchiveTenantTemplateSetQueryRequest,
): Promise<ArchiveTenantTemplateSetVO> {
  return http.post<ArchiveTenantTemplateSetVO>('/api/mark/archive-volumes/tenant/template-set/detail', request)
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

export function initializeArchivePlatformTemplateDefaults(): Promise<ArchivePlatformTemplateInitializeVO> {
  return http.post<ArchivePlatformTemplateInitializeVO>(
    '/api/mark/archive-volumes/platform-template/initialize-defaults',
    {},
  )
}

export function getArchiveTenantSetupReadiness(): Promise<ArchiveTenantSetupReadinessVO> {
  return http.post<ArchiveTenantSetupReadinessVO>('/api/mark/archive-volumes/tenant/setup-readiness', {})
}
