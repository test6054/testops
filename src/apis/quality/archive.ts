import type { ArchiveBusinessTypeCode, ExpertPackageTypeCode } from './types'
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
  tenantId?: string
  archiveCode: string
  businessType: ArchiveBusinessTypeCode
  businessId: string
  businessLabel: string
  fileId: string
  fileName: string
  expertPackageType?: ExpertPackageTypeCode
  archiveCategory?: string
  retentionPolicyCode?: string
  retentionYears?: number
  digitalStatus?: string
  destructionStatus?: string
  destructionApprovedUserId?: string
  archivedTime?: string
  archiveOfficeConfirmed?: boolean
  notes?: string
  createUser?: string
  createTime?: string
  updateUser?: string
  updateTime?: string
}

export interface ArchiveQueryRequest extends QueryDto {
  businessType?: ArchiveBusinessTypeCode
  excludeBusinessType?: ArchiveBusinessTypeCode
  businessId?: string
  archiveCategory?: string
  digitalStatus?: string
  destructionStatus?: string
  archiveOfficeConfirmed?: boolean
  keyword?: string
}

export interface ArchiveSaveRequest {
  id?: string
  archiveCode: string
  businessType: ArchiveBusinessTypeCode
  businessId: string
  fileId: string
  archiveCategory?: string
  retentionPolicyCode?: string
  retentionYears?: number
  digitalStatus?: string
  notes?: string
}

export interface ExpertPackageExportRequest {
  packageType: ExpertPackageTypeCode
  targetId: string
  archiveCode?: string
  retentionYears?: number
  archiveCategory?: string
  notes?: string
  recipientUserIds?: string[]
}

/** SignalBand 汇总响应 - 对齐后端 ArchiveSignalSummaryVO */
export interface ArchiveSignalSummaryVO {
  totalCount: number
  confirmedCount: number
  pendingCount: number
  expertPackageCount: number
  reportCount: number
}

export const archiveApi = {
  page: (data: ArchiveQueryRequest) => http.post<PageResult<ArchiveVO>>(`${BASE}/page`, data),
  signalSummary: (data: ArchiveQueryRequest) =>
    http.post<ArchiveSignalSummaryVO>(`${BASE}/signal-summary`, data),
  detail: (id: string) => http.post<ArchiveVO>(`${BASE}/detail`, { id }),
  create: (data: ArchiveSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: ArchiveSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  /** 专家材料包导出（按毕业要求 / 按专业认证整包；同步打包，延长超时） */
  exportExpertPackage: (data: ExpertPackageExportRequest) =>
    http.post<string>(`${BASE}/export-expert-package`, data, { timeout: 120000 }),
}
