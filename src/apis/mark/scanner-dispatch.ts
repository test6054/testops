import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import type {
  PortfolioCollectModeCode,
  ScanWorkOrderStatusCode,
} from '@/apis/mark/scanner-work-order'
import type { PageResult, QueryDto } from '@/types'
import type { PageRegisterStateCode } from '@/types/enums/page-register-state-enum'
import type { PortfolioAiTaskTypeCode } from '@/types/enums/portfolio-ai-task-type-enum'
import type { ScanBatchQualityFlagCode } from '@/types/enums/scan-batch-quality-flag-enum'
import type { ScanDispatchTicketStatusCode } from '@/types/enums/scan-dispatch-ticket-status-enum'
import {
  ALL_SCAN_DISPATCH_TICKET_STATUS_CODES,
  ScanDispatchTicketStatusDescription,
} from '@/types/enums/scan-dispatch-ticket-status-enum'
import type { ScanOperationActionCode } from '@/types/enums/scan-operation-action-enum'
import {
  ALL_SCAN_OPERATION_ACTION_CODES,
  ScanOperationActionDescription,
} from '@/types/enums/scan-operation-action-enum'
import type { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import type { ScannerExceptionItemKindCode } from '@/types/enums/scanner-exception-item-kind-enum'
import http from '@/config/axios'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_SCAN_BATCH_QUALITY_FLAG_CODES,
  ScanBatchQualityFlagCode,
  ScanBatchQualityFlagDescription,
} from '@/types/enums/scan-batch-quality-flag-enum'
export {
  ALL_SCAN_DISPATCH_TICKET_STATUS_CODES,
  ScanDispatchTicketStatusCode,
  ScanDispatchTicketStatusDescription,
} from '@/types/enums/scan-dispatch-ticket-status-enum'

export const SCAN_DISPATCH_TICKET_STATUS_OPTIONS: Array<{
  value: ScanDispatchTicketStatusCode
  label: string
}> = ALL_SCAN_DISPATCH_TICKET_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ScanDispatchTicketStatusDescription, value, '派单票据状态'),
}))

export {
  ScanOperationActionCode,
  ScanOperationActionDescription,
} from '@/types/enums/scan-operation-action-enum'

export interface ScanDispatchArchiveSnapshotVO {
  volumeId?: string
  archiveTitle?: string
  teachingClassName?: string
  catalogCode?: string
  materialType?: ArchiveMaterialTypeCode
  archiveBatchMode?: string
  physicalStorageLocation?: string
  physicalLocationNote?: string
  previewFileId?: string
  materialTags?: string[]
}

export interface ScanDispatchPortfolioSnapshotVO {
  teacherId?: string
  teacherName?: string
  collectMode?: PortfolioCollectModeCode
  gapTaskId?: string
  gapTaskTitle?: string
  categoryId?: string
  categoryName?: string
  taskType?: PortfolioAiTaskTypeCode
  templateCode?: string
  archiveRecordId?: string
}

export interface ScanDispatchTicketVO {
  ticketId: string
  taskKind?: ScanTaskKindCode
  status?: ScanDispatchTicketStatusCode
  traceLabelCode?: string
  traceLabelFileId?: string
  creatorUserId?: string
  lockedOperatorUserId?: string
  lockedScannerDeviceId?: string
  lockedScannerStationId?: string
  workOrderId?: string
  processingStartedAt?: string
  lastHeartbeatAt?: string
  suspendedAt?: string
  createTime?: string
  failureReason?: string
  kioskDispatchUrl?: string
  archiveSnapshot?: ScanDispatchArchiveSnapshotVO
  portfolioSnapshot?: ScanDispatchPortfolioSnapshotVO
  /** 强制释放派单（PROCESSING/SUSPENDED）；归档 ARCHIVE_ADMIN，档案袋 scanAllowed */
  canForceReleaseTicket?: boolean
  /** 取消派单（PENDING）；归档 canManageMaterials，档案袋 scanAllowed */
  canCancelTicket?: boolean
  /** 领取派单（PENDING）；归档 canScan/canManageMaterials，档案袋 scanAllowed；与 claim 写口同源 */
  canClaimTicket?: boolean
}

export interface ScanDispatchCreateRequest {
  taskKind: ScanTaskKindCode
  volumeId?: string
  catalogCode?: string
  materialType?: ArchiveMaterialTypeCode
  archiveBatchMode?: string
  generateTraceLabel?: boolean
  teacherId?: string
  collectMode?: PortfolioCollectModeCode
  gapTaskId?: string
  categoryId?: string
  taskType?: PortfolioAiTaskTypeCode
  templateCode?: string
  archiveRecordId?: string
  materialTags?: string[]
}

export interface ScanDispatchCreateResponse {
  ticket?: ScanDispatchTicketVO
}

export interface ScanDispatchCancelRequest {
  ticketId: string
  cancelReason?: string
}

export interface ScanDispatchOpenRequest {
  ticketId: string
  scannerDeviceId: string
  scannerStationId: string
}

export interface ScanDispatchClaimRequest {
  ticketId: string
  scannerDeviceId: string
  scannerStationId: string
}

export interface ScanDispatchSuspendRequest {
  ticketId: string
  scannerDeviceId: string
  scannerStationId: string
}

export interface ScanDispatchResumeRequest {
  ticketId: string
  scannerDeviceId: string
  scannerStationId: string
}

export interface ScanDispatchHeartbeatRequest {
  ticketId: string
  scannerDeviceId: string
  scannerStationId: string
}

export interface ScanDispatchPreviewRequest {
  ticketId: string
}

export interface ScanDispatchTicketPageRequest extends QueryDto {
  statusList?: ScanDispatchTicketStatusCode[]
  taskKind?: ScanTaskKindCode
  scannerDeviceId?: string
  scannerStationId?: string
  volumeId?: string
  failureOnly?: boolean
  excludeFailed?: boolean
}

/** 扫描异常看板分页条目，对应后端 ScannerExceptionDashboardItemVO */
export interface ScannerExceptionDashboardItemVO {
  itemKind?: ScannerExceptionItemKindCode
  /** 最近更新时间 */
  updateTime?: string
  ticketId?: string
  workOrderId?: string
  volumeId?: string
  scanBatchId?: string
  examId?: string
  /** 试卷实例 ID（BINDING_CONFLICT 条目） */
  paperInstanceId?: string
  ticketStatus?: ScanDispatchTicketStatusCode
  workOrderStatus?: ScanWorkOrderStatusCode
  batchQualityFlag?: ScanBatchQualityFlagCode
  traceLabelCode?: string
  failureReason?: string
  batchExternalNo?: string
  batchNo?: string
  diagnostic?: string
  pageRegisterDiagnostic?: string
  registeredPageCount?: number
  pageCount?: number
  taskKind?: ScanTaskKindCode
  contextExamId?: string
  contextVolumeId?: string
  contextCollectMode?: PortfolioCollectModeCode
  contextTeacherId?: string
  contextGapTaskId?: string
  workOrderBatchExternalNo?: string
  /** 页登记状态（PAGE_REGISTER_BLOCKED 条目） */
  pageRegisterState?: PageRegisterStateCode | null
  /** 主考考试写动作（重试页登记/忽略 collate/手工绑定） */
  canManageOwnerExamWrites?: boolean
  /** 强制释放派单（PROCESSING/SUSPENDED）；归档 ARCHIVE_ADMIN，档案袋 scanAllowed */
  canForceReleaseTicket?: boolean
  /** 取消派单（PENDING）；归档 canManageMaterials，档案袋 scanAllowed */
  canCancelTicket?: boolean
}

export interface ScannerExceptionDashboardPageRequest extends QueryDto {
  itemKind?: ScannerExceptionItemKindCode
  taskKind?: ScanTaskKindCode
  examId?: string
}

export interface ScanDispatchForceReleaseRequest {
  ticketId: string
  releaseReason: string
}

export function resolveMarkVueAppRoot(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  const baseUrl = import.meta.env.BASE_URL || '/'
  if (baseUrl === '/') {
    return window.location.origin
  }
  const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${window.location.origin}${normalized}`
}

export function appendUrlQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${key}=${encodeURIComponent(value)}`
}

/** 工位派单 URL 构建字段 - 对应 ScanDispatchTicketVO 的 ticketId 与 kioskDispatchUrl */
export interface ScanDispatchKioskUrlTicket {
  ticketId: string
  kioskDispatchUrl?: string
}

export function buildScanDispatchKioskUrl(
  ticket: ScanDispatchKioskUrlTicket,
  returnTo?: string,
): string {
  const path = ticket.kioskDispatchUrl || `/scanner-kiosk/dispatch/${ticket.ticketId}`
  const url = `${resolveMarkVueAppRoot()}${path}`
  const trimmedReturnTo = returnTo?.trim()
  if (!trimmedReturnTo) {
    return url
  }
  return appendUrlQueryParam(url, 'returnTo', trimmedReturnTo)
}

export function createScanDispatch(request: ScanDispatchCreateRequest) {
  return http.post<ScanDispatchCreateResponse>('/api/mark/scanner/dispatch/create', request)
}

export function cancelScanDispatch(request: ScanDispatchCancelRequest) {
  return http.post<ScanDispatchTicketVO>('/api/mark/scanner/dispatch/cancel', request)
}

export function pageScanDispatchTickets(request: ScanDispatchTicketPageRequest) {
  return http.post<PageResult<ScanDispatchTicketVO>>('/api/mark/scanner/dispatch/page', request)
}

export function previewScanDispatch(request: ScanDispatchPreviewRequest) {
  return http.post<ScanDispatchTicketVO>('/api/mark/scanner/dispatch/preview', request)
}

export function claimScanDispatch(request: ScanDispatchClaimRequest) {
  return http.post<ScanDispatchTicketVO>('/api/mark/scanner/dispatch/claim', request)
}

export function openScanDispatch(request: ScanDispatchOpenRequest) {
  return http.post<ScanDispatchTicketVO>('/api/mark/scanner/dispatch/open', request)
}

export function suspendScanDispatch(request: ScanDispatchSuspendRequest) {
  return http.post<ScanDispatchTicketVO>('/api/mark/scanner/dispatch/suspend', request)
}

export function resumeScanDispatch(request: ScanDispatchResumeRequest) {
  return http.post<ScanDispatchTicketVO>('/api/mark/scanner/dispatch/resume', request)
}

export function heartbeatScanDispatch(request: ScanDispatchHeartbeatRequest) {
  return http.post<ScanDispatchTicketVO>('/api/mark/scanner/dispatch/heartbeat', request)
}

/** 管理员强制释放 PROCESSING 派单 ticket，回 PENDING 并写审计。 */
export function forceReleaseScanDispatch(request: ScanDispatchForceReleaseRequest) {
  return http.post<ScanDispatchTicketVO>('/api/mark/scanner/dispatch/force-release', request)
}

export function pageScannerExceptionDashboard(request: ScannerExceptionDashboardPageRequest) {
  return http.post<PageResult<ScannerExceptionDashboardItemVO>>(
    '/api/mark/scanner/exception/dashboard/page',
    request,
  )
}

export interface ScanDispatchQueueSummaryVO {
  pendingCount?: number
  processingCount?: number
  suspendedCount?: number
  failedTicketCount?: number
  committingWorkOrderCount?: number
}

export interface ScanDispatchQueueSummaryRequest {
  scannerDeviceId?: string
  scannerStationId?: string
  /** 分域扫描运营 / 派单结案必传；工位 Hub 可省略以看租户级合计数 */
  taskKind?: ScanTaskKindCode
}

export function loadScanDispatchQueueSummary(request: ScanDispatchQueueSummaryRequest = {}) {
  return http.post<ScanDispatchQueueSummaryVO>('/api/mark/scanner/dispatch/queue-summary', request)
}

export const SCAN_OPERATION_ACTION_OPTIONS: Array<{
  value: ScanOperationActionCode
  label: string
}> = ALL_SCAN_OPERATION_ACTION_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ScanOperationActionDescription, value, '扫描操作动作'),
}))

export interface ScanOperationLogPageRequest extends QueryDto {
  volumeId?: string
  ticketId?: string
  action?: ScanOperationActionCode
}

export interface ScanOperationLogItemVO {
  logId?: string
  ticketId?: string
  workOrderId?: string
  action?: ScanOperationActionCode
  operatorUserId?: string
  scannerDeviceId?: string
  scannerStationId?: string
  clientIp?: string
  detailJson?: string
  createTime?: string
}

export function pageScanOperationLogs(request: ScanOperationLogPageRequest) {
  return http.post<PageResult<ScanOperationLogItemVO>>(
    '/api/mark/scanner/operation-log/page',
    request,
  )
}
