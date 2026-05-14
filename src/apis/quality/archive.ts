import type { ArchiveBusinessType, ExpertPackageType } from './types'
/**
 * 材料归档 + 专家材料包 API - 对接 edu-quality / ArchiveController
 *
 * 后端路径: /api/quality/archives
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/archives'

export interface ArchiveVO {
  id: string
  archiveCode: string
  businessType: ArchiveBusinessType | string
  businessId: string
  fileId: string
  fileName?: string
  archiveCategory?: string
  retentionPolicyCode?: string
  retentionYears?: number
  digitalStatus?: string
  archivedAt?: string
  archiveOfficeConfirmed?: boolean
  notes?: string
  createUser?: string
  createTime?: string
}

export interface ArchiveQueryPayload extends QueryDto {
  businessType?: string
  businessId?: string
  archiveCategory?: string
  archiveOfficeConfirmed?: boolean
  keyword?: string
}

export interface ArchiveSavePayload {
  id?: string
  archiveCode: string
  businessType: string
  businessId: string
  fileId: string
  archiveCategory?: string
  retentionPolicyCode?: string
  retentionYears?: number
  digitalStatus?: string
  notes?: string
}

export interface ExpertPackageExportPayload {
  packageType: ExpertPackageType
  targetId: string
  archiveCode?: string
  retentionYears?: number
  archiveCategory?: string
  notes?: string
  recipientUserIds?: string[]
}

export const archiveApi = {
  page: (data: ArchiveQueryPayload) =>
    http.post<PageResult<ArchiveVO>>(`${BASE}/page`, data),
  detail: (id: string) =>
    http.post<ArchiveVO>(`${BASE}/detail`, { id }),
  create: (data: ArchiveSavePayload) =>
    http.post<string>(`${BASE}/create`, data),
  update: (data: ArchiveSavePayload) =>
    http.post<void>(`${BASE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${BASE}/delete`, { id }),
  /** 专家材料包导出（按毕业要求 / 按专业认证整包） */
  exportExpertPackage: (data: ExpertPackageExportPayload) =>
    http.post<string>(`${BASE}/export-expert-package`, data),
}
