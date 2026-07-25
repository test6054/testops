import type { PageResult, QueryDto } from '@/types'
import type { PortfolioCollectModeCode } from '@/types/enums/portfolio-collect-mode-enum'
import type { ScanDispatchTicketStatusCode } from '@/types/enums/scan-dispatch-ticket-status-enum'
import type { ScanOperationActionCode } from '@/types/enums/scan-operation-action-enum'
import type { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import type { ScanWorkOrderStatusCode } from '@/types/enums/scan-work-order-status-enum'
import type { ScannerExceptionItemKindCode } from '@/types/enums/scanner-exception-item-kind-enum'
import http from '@/config/axios'

/** 对齐后端 PortfolioScanOpsOverviewVO */
export interface PortfolioScanOpsOverviewVO {
  failedTicketCount?: number
  failedWorkOrderCount?: number
  pendingDispatchCount?: number
  processingDispatchCount?: number
  suspendedDispatchCount?: number
  committingWorkOrderCount?: number
}

/** 对齐后端 PortfolioScanExceptionItemVO */
export interface PortfolioScanExceptionItemVO {
  itemKind?: ScannerExceptionItemKindCode
  updateTime?: string
  ticketId?: string
  workOrderId?: string
  scanBatchId?: string
  ticketStatus?: ScanDispatchTicketStatusCode
  workOrderStatus?: ScanWorkOrderStatusCode
  batchQualityFlag?: string
  traceLabelCode?: string
  failureReason?: string
  batchExternalNo?: string
  batchNo?: string
  diagnostic?: string
  taskKind?: ScanTaskKindCode
  contextCollectMode?: PortfolioCollectModeCode
  contextTeacherId?: string
  contextGapTaskId?: string
  workOrderBatchExternalNo?: string
  canForceReleaseTicket?: boolean
  canCancelTicket?: boolean
}

export interface PortfolioScanExceptionPageRequest extends QueryDto {
  itemKind?: ScannerExceptionItemKindCode
}

/** 对齐后端 PortfolioScanOperationLogItemVO */
export interface PortfolioScanOperationLogItemVO {
  logId?: string
  ticketId?: string
  workOrderId?: string
  action?: ScanOperationActionCode
  operatorUserId?: string
  /** 工位设备业务编码（varchar，非 Long 主键） */
  scannerDeviceId?: string
  /** 工位业务编码（varchar，非 Long 主键） */
  scannerStationId?: string
  clientIp?: string
  detailJson?: string
  createTime?: string
}

export interface PortfolioScanOperationLogPageRequest extends QueryDto {
  ticketId?: string
  action?: ScanOperationActionCode
}

const BASE = '/api/portfolio/scan-ops'

/** 加载教学档案袋扫描运营概览 KPI（edu-quality） */
export function loadPortfolioScanOpsOverview() {
  return http.post<PortfolioScanOpsOverviewVO>(`${BASE}/overview`, {})
}

/** 分页查询教学档案袋扫描异常看板（edu-quality） */
export function pagePortfolioScanException(request: PortfolioScanExceptionPageRequest) {
  return http.post<PageResult<PortfolioScanExceptionItemVO>>(`${BASE}/exception/page`, request)
}

/** 分页查询教学档案袋扫描操作审计（edu-quality） */
export function pagePortfolioScanOperationLogs(request: PortfolioScanOperationLogPageRequest) {
  return http.post<PageResult<PortfolioScanOperationLogItemVO>>(`${BASE}/operation-log/page`, request)
}
