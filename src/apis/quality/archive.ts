import type { ArchiveBusinessTypeCode, ExpertPackageTypeCode } from './types'
/**
 * 材料归档 + 专家材料包 API - 对接 edu-quality / ArchiveController
 *
 * 后端路径: /api/quality/archives
 */
import type { PageResult, QueryDto } from '@/types'
import type { ArchiveDestructionDecisionCode } from '@/types/enums/archive-destruction-decision-enum'
import type { ArchiveDigitalStatusCode } from '@/types/enums/archive-digital-status-enum'
import type { QualityArchiveDestructionEventTypeCode } from '@/types/enums/quality-archive-destruction-event-type-enum'
import type { QualityArchiveDestructionLedgerExportDecisionCode } from '@/types/enums/quality-archive-destruction-ledger-export-decision-enum'
import type { QualityArchiveDestructionStatusCode } from '@/types/enums/quality-archive-destruction-status-enum'
import http from '@/config/axios'

const BASE = '/api/quality/archives'

export interface ArchiveVO {
  id: string
  tenantId?: string
  archiveCode: string
  businessType: ArchiveBusinessTypeCode
  businessId: string
  businessLabel: string
  fileId?: string
  fileName?: string
  expertPackageType?: ExpertPackageTypeCode
  archiveCategory?: string
  retentionPolicyCode?: string
  retentionYears?: number
  digitalStatus?: ArchiveDigitalStatusCode
  destructionStatus: QualityArchiveDestructionStatusCode
  destructionApprovedUserId?: string
  destructionRequestUserId?: string
  destructionExecuteUserId?: string
  destructionHistoryPresent?: boolean
  destructionRecordId?: string
  destructionTargetFileCount?: number
  ledgerExportDecision?: QualityArchiveDestructionLedgerExportDecisionCode
  ledgerSkipReason?: string
  ledgerFileId?: string
  ledgerExportTime?: string
  storageCleanupAttempts?: number
  storageCleanupError?: string
  destructionWitnessUserId?: string
  retentionDueTime?: string
  retentionExpired?: boolean
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
  digitalStatus?: ArchiveDigitalStatusCode
  destructionStatus?: QualityArchiveDestructionStatusCode
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
  digitalStatus?: ArchiveDigitalStatusCode
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

export interface ArchiveDestructionRequest {
  archiveId: string
  reason: string
  ledgerExportDecision: QualityArchiveDestructionLedgerExportDecisionCode
  ledgerSkipReason?: string
}

export interface ArchiveDestructionApprovalRequest {
  archiveId: string
  decision: ArchiveDestructionDecisionCode
  remark?: string
}

export interface ArchiveDestructionSuperviseRequest {
  archiveId: string
  remark?: string
}

export interface ArchiveDestructionFlowRecordVO {
  id: string
  archiveId: string
  destructionRecordId?: string
  eventType: QualityArchiveDestructionEventTypeCode
  destructionStatus?: QualityArchiveDestructionStatusCode
  beforeStatus?: QualityArchiveDestructionStatusCode
  afterStatus?: QualityArchiveDestructionStatusCode
  operatorUserId?: string
  remark?: string
  detail?: string
  eventTime?: string
}

export interface ArchiveDestructionLedgerPageRequest extends QueryDto {
  keyword?: string
  destructionStatus?: QualityArchiveDestructionStatusCode
}

export interface ArchiveDestructionLedgerRowVO {
  archiveId: string
  archiveCode: string
  businessType: string
  businessId?: string
  destructionRecordId: string
  destructionStatus: QualityArchiveDestructionStatusCode
  ledgerExportDecision?: QualityArchiveDestructionLedgerExportDecisionCode
  ledgerSkipReason?: string
  ledgerFileId?: string
  ledgerExportTime?: string
  requestReason: string
  requestUserId?: string
  requestTime?: string
  approverUserId?: string
  approvalTime?: string
  executedTime?: string
  witnessUserId?: string
  retentionYears?: number
}

export interface ArchiveDestructionLedgerExcelFileVO {
  fileName: string
  fileContentBase64: string
}

export const archiveApi = {
  page: (data: ArchiveQueryRequest) => http.post<PageResult<ArchiveVO>>(`${BASE}/page`, data),
  signalSummary: (data: ArchiveQueryRequest) =>
    http.post<ArchiveSignalSummaryVO>(`${BASE}/signal-summary`, data),
  detail: (id: string) => http.post<ArchiveVO>(`${BASE}/detail`, { id }),
  create: (data: ArchiveSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: ArchiveSaveRequest) => http.post<void>(`${BASE}/update`, data),
  confirmArchiveOffice: (id: string) => http.post<void>(`${BASE}/confirm-archive-office`, { id }),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  /** 专家材料包导出（按毕业要求 / 按专业认证整包；同步打包，延长超时） */
  exportExpertPackage: (data: ExpertPackageExportRequest) =>
    http.post<string>(`${BASE}/export-expert-package`, data, { timeout: 120000 }),
  requestDestruction: (data: ArchiveDestructionRequest) =>
    http.post<ArchiveVO>(`${BASE}/destruction/request`, data),
  approveDestruction: (data: ArchiveDestructionApprovalRequest) =>
    http.post<ArchiveVO>(`${BASE}/destruction/approve`, data),
  executeDestruction: (id: string) => http.post<ArchiveVO>(`${BASE}/destruction/execute`, { id }),
  retryDestruction: (id: string) => http.post<ArchiveVO>(`${BASE}/destruction/retry`, { id }),
  superviseDestruction: (data: ArchiveDestructionSuperviseRequest) =>
    http.post<ArchiveVO>(`${BASE}/destruction/supervise`, data),
  listDestructionFlowRecords: (id: string) =>
    http.post<ArchiveDestructionFlowRecordVO[]>(`${BASE}/destruction/flow-records/list`, { id }),
  pageDestructionLedger: (data: ArchiveDestructionLedgerPageRequest) =>
    http.post<PageResult<ArchiveDestructionLedgerRowVO>>(`${BASE}/destruction/ledger/page`, data),
  exportDestructionLedger: (data: ArchiveDestructionLedgerPageRequest) =>
    http.post<ArchiveDestructionLedgerExcelFileVO>(`${BASE}/destruction/ledger/export`, data),
}
