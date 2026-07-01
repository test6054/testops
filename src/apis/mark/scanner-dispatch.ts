import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import type {
  PortfolioCollectModeCode,
  ScanTaskKindCode,
  ScanWorkOrderStatusCode,
} from '@/apis/mark/scanner-work-order'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

export type ScanDispatchTicketStatusCode
  = 'PENDING' | 'PROCESSING' | 'SUSPENDED' | 'DONE' | 'EXPIRED' | 'CANCELLED'

export const SCAN_DISPATCH_TICKET_STATUS_LABEL: Record<ScanDispatchTicketStatusCode, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  SUSPENDED: '已挂起',
  DONE: '已完成',
  EXPIRED: '已过期',
  CANCELLED: '已取消',
}

export type ScanBatchQualityFlagCode = 'NORMAL' | 'SUSPECTED_MIXED'

export const SCAN_BATCH_QUALITY_FLAG_LABEL: Record<ScanBatchQualityFlagCode, string> = {
  NORMAL: '正常',
  SUSPECTED_MIXED: '疑似混扫',
}

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
}

export interface ScanDispatchPortfolioSnapshotVO {
  teacherId?: string
  teacherName?: string
  collectMode?: 'AI_SUBMIT' | 'GAP_ATTACHMENT'
  gapTaskId?: string
  gapTaskTitle?: string
  categoryId?: string
  categoryName?: string
  taskType?: string
  templateCode?: string
  archiveRecordId?: string
}

export interface ScanDispatchTicketVO {
  ticketId?: string
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
  kioskDispatchUrl?: string
  archiveSnapshot?: ScanDispatchArchiveSnapshotVO
  portfolioSnapshot?: ScanDispatchPortfolioSnapshotVO
}

export interface ScanDispatchCreateRequest {
  taskKind: ScanTaskKindCode
  volumeId?: string
  catalogCode?: string
  materialType?: ArchiveMaterialTypeCode
  archiveBatchMode?: string
  physicalStorageLocation?: string
  physicalLocationNote?: string
  generateTraceLabel?: boolean
  teacherId?: string
  collectMode?: 'AI_SUBMIT' | 'GAP_ATTACHMENT'
  gapTaskId?: string
  categoryId?: string
  taskType?: string
  templateCode?: string
  archiveRecordId?: string
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

/** 失败派单 ticket 条目，对应后端 FailedTicketItemVO */
export interface FailedTicketItemVO {
  ticketId?: string
  status?: ScanDispatchTicketStatusCode
  failureReason?: string
  traceLabelCode?: string
}

/** 失败扫描工单条目，对应后端 FailedWorkOrderItemVO */
export interface FailedWorkOrderItemVO {
  workOrderId?: string
  batchExternalNo?: string
  status?: ScanWorkOrderStatusCode
  diagnostic?: string
  taskKind?: ScanTaskKindCode
  contextExamId?: string
  contextVolumeId?: string
  contextCollectMode?: PortfolioCollectModeCode
  contextTeacherId?: string
  contextGapTaskId?: string
}

/** 疑似混扫批次条目，对应后端 SuspectedMixedBatchItemVO */
export interface SuspectedMixedBatchItemVO {
  workOrderId?: string
  volumeId?: string
  batchQualityFlag?: ScanBatchQualityFlagCode
  diagnostic?: string
}

/** 扫描异常看板聚合 VO，对应后端 ScannerExceptionDashboardVO */
export interface ScannerExceptionDashboardVO {
  failedTickets?: FailedTicketItemVO[]
  failedWorkOrders?: FailedWorkOrderItemVO[]
  suspectedMixedBatches?: SuspectedMixedBatchItemVO[]
  pageRegisterBlockedBatches?: PageRegisterBlockedBatchItemVO[]
}

/** 页登记阻断批次条目，对应 ScannerExceptionDashboardVO.PageRegisterBlockedBatchItemVO */
export interface PageRegisterBlockedBatchItemVO {
  scanBatchId?: string
  examId?: string
  batchExternalNo?: string
  batchNo?: string
  pageCount?: number
  registeredPageCount?: number
  batchDiagnostic?: string
  pageRegisterDiagnostic?: string
  workOrderId?: string
  taskKind?: ScanTaskKindCode
  workOrderBatchExternalNo?: string
}

export interface ScanDispatchForceReleaseRequest {
  ticketId: string
  releaseReason: string
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

/** 目标端点：后端 VO 已定义，Controller 待落地 */
export function forceReleaseScanDispatch(request: ScanDispatchForceReleaseRequest) {
  return http.post<ScanDispatchTicketVO>('/api/mark/scanner/dispatch/force-release', request)
}

export function loadScannerExceptionDashboard() {
  return http.post<ScannerExceptionDashboardVO>(
    '/api/mark/scanner/exception/dashboard/aggregate',
    {},
  )
}

export interface ScanDispatchQueueSummaryVO {
  pendingCount?: number
  processingCount?: number
  suspendedCount?: number
  failedTicketCount?: number
  committingWorkOrderCount?: number
  suspectedMixedCount?: number
}

export interface ScanDispatchQueueSummaryRequest {
  scannerDeviceId?: string
  scannerStationId?: string
}

export function loadScanDispatchQueueSummary(request: ScanDispatchQueueSummaryRequest = {}) {
  return http.post<ScanDispatchQueueSummaryVO>('/api/mark/scanner/dispatch/queue-summary', request)
}

export type ScanOperationActionCode
  = | 'OPEN'
    | 'CONFIRM'
    | 'DISCARD'
    | 'DISPATCH_CREATE'
    | 'DISPATCH_CANCEL'
    | 'DISPATCH_OPEN'
    | 'DISPATCH_CLAIM'
    | 'DISPATCH_SUSPEND'
    | 'DISPATCH_RESUME'
    | 'DISPATCH_HEARTBEAT'
    | 'LEASE_RELEASE'
    | 'DISPATCH_ADHOC_CREATE'
    | 'DISPATCH_FORCE_RELEASE'
    | 'DISPATCH_DONE'
    | 'PHYSICAL_LOCATION_UPDATE'

export const SCAN_OPERATION_ACTION_LABEL: Record<ScanOperationActionCode, string> = {
  OPEN: '开单',
  CONFIRM: '提交',
  DISCARD: '废弃',
  DISPATCH_CREATE: '创建派单',
  DISPATCH_CANCEL: '取消派单',
  DISPATCH_OPEN: '打开派单',
  DISPATCH_CLAIM: '领取派单',
  DISPATCH_SUSPEND: '挂起派单',
  DISPATCH_RESUME: '恢复派单',
  DISPATCH_HEARTBEAT: '派单心跳',
  LEASE_RELEASE: '租约释放',
  DISPATCH_ADHOC_CREATE: '临时派单',
  DISPATCH_FORCE_RELEASE: '强制释放',
  DISPATCH_DONE: '完成派单',
  PHYSICAL_LOCATION_UPDATE: '柜位更新',
}

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
