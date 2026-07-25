import type { PageResult, QueryDto } from '@/types'
import type { PortfolioAiTaskTypeCode } from '@/types/enums/portfolio-ai-task-type-enum'
import type { PortfolioCollectModeCode } from '@/types/enums/portfolio-collect-mode-enum'
import type { ScanDispatchTicketStatusCode } from '@/types/enums/scan-dispatch-ticket-status-enum'
import type { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import http from '@/config/axios'

/** 对齐后端 PortfolioScanDispatchSnapshotVO */
export interface PortfolioScanDispatchSnapshotVO {
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

/** 对齐后端 PortfolioScanDispatchTicketVO */
export interface PortfolioScanDispatchTicketVO {
  ticketId: string
  taskKind?: ScanTaskKindCode
  status?: ScanDispatchTicketStatusCode
  traceLabelCode?: string
  traceLabelFileId?: string
  kioskDispatchUrl?: string
  canCancelTicket?: boolean
  canForceReleaseTicket?: boolean
  failureReason?: string
  createTime?: string
  portfolioSnapshot?: PortfolioScanDispatchSnapshotVO
}

/** 对齐后端 PortfolioScanDispatchCreateRequest（无 taskKind） */
export interface PortfolioScanDispatchCreateRequest {
  teacherId: string
  collectMode: PortfolioCollectModeCode
  gapTaskId?: string
  categoryId?: string
  taskType?: PortfolioAiTaskTypeCode
  templateCode?: string
  archiveRecordId?: string
  generateTraceLabel?: boolean
  materialTags?: string[]
}

export interface PortfolioScanDispatchCreateResponse {
  ticket?: PortfolioScanDispatchTicketVO
}

export interface PortfolioScanDispatchCancelRequest {
  ticketId: string
  cancelReason?: string
}

export interface PortfolioScanDispatchForceReleaseRequest {
  ticketId: string
  releaseReason: string
}

export interface PortfolioScanDispatchPageRequest extends QueryDto {
  statusList?: ScanDispatchTicketStatusCode[]
  gapTaskId?: string
  failureOnly?: boolean
  excludeFailed?: boolean
}

export interface PortfolioScanDispatchQueueSummaryVO {
  pendingCount?: number
  processingCount?: number
  suspendedCount?: number
  failedTicketCount?: number
  committingWorkOrderCount?: number
}

const BASE = '/api/portfolio/scan-dispatch'

/** 创建教学档案袋扫描派单（edu-quality） */
export function createPortfolioScanDispatch(request: PortfolioScanDispatchCreateRequest) {
  return http.post<PortfolioScanDispatchCreateResponse>(`${BASE}/create`, request)
}

/** 取消教学档案袋扫描派单（edu-quality） */
export function cancelPortfolioScanDispatch(request: PortfolioScanDispatchCancelRequest) {
  return http.post<PortfolioScanDispatchTicketVO>(`${BASE}/cancel`, request)
}

/** 强制释放教学档案袋扫描派单（edu-quality） */
export function forceReleasePortfolioScanDispatch(request: PortfolioScanDispatchForceReleaseRequest) {
  return http.post<PortfolioScanDispatchTicketVO>(`${BASE}/force-release`, request)
}

/** 分页查询教学档案袋扫描派单（edu-quality） */
export function pagePortfolioScanDispatchTickets(request: PortfolioScanDispatchPageRequest) {
  return http.post<PageResult<PortfolioScanDispatchTicketVO>>(`${BASE}/page`, request)
}

/** 教学档案袋扫描派单队列摘要（edu-quality） */
export function loadPortfolioScanDispatchQueueSummary() {
  return http.post<PortfolioScanDispatchQueueSummaryVO>(`${BASE}/queue-summary`, {})
}
