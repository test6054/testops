import type { ExamScannerKioskContextVO } from '@/apis/mark/scanner-kiosk'
import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import type { ExamScannerScanConfigVO } from '@/apis/mark/scanner-kiosk'
import http from '@/config/axios'

export type ScanTaskKindCode = 'EXAM_MARKING' | 'EXAM_ARCHIVE' | 'PORTFOLIO_COLLECT'
export type ScanWorkOrderStatusCode = 'IN_PROGRESS' | 'COMMITTING' | 'FAILED' | 'COMMITTED' | 'DISCARDED'

/** 扫描工单生命周期状态展示文案 */
export const SCAN_WORK_ORDER_STATUS_LABEL: Record<ScanWorkOrderStatusCode, string> = {
  IN_PROGRESS: '扫描中',
  COMMITTING: '提交中',
  FAILED: '失败',
  COMMITTED: '已提交',
  DISCARDED: '已作废',
}
export type ArchiveScanBatchModeCode = 'MERGED' | 'PER_PAGE'
export type PortfolioCollectModeCode = 'AI_SUBMIT' | 'GAP_ATTACHMENT'

export interface ScanWorkOrderStartRequest {
  taskKind: ScanTaskKindCode
  scannerDeviceId: string
  scannerStationId: string
  examId?: string
  declaredClassIds?: string[]
  examScanMode?: 'DIRECT' | 'SUPPLEMENT'
  targetPageNo?: number
  supplementReason?: string
  replaceTargetPage?: boolean
  paperInstanceId?: string
  scanConfig: ExamScannerScanConfigVO
  volumeId?: string
  catalogCode?: string
  materialType?: ArchiveMaterialTypeCode
  archiveBatchMode?: ArchiveScanBatchModeCode
  dispatchTicketId?: string
  collectMode?: PortfolioCollectModeCode
  teacherId?: string
  gapTaskId?: string
  categoryId?: string
  taskType?: string
  templateCode?: string
  archiveRecordId?: string
  providerChain?: 'BAIDU_QWEN' | 'PADDLE_LOCAL'
}

export interface ScanWorkOrderLifecycleVO {
  workOrderId?: string
  taskKind?: ScanTaskKindCode
  status?: ScanWorkOrderStatusCode
  batchExternalNo?: string
  reportId?: string
  examId?: string
  scannerDeviceId?: string
  scannerStationId?: string
  examScanMode?: 'DIRECT' | 'SUPPLEMENT'
  targetPageNo?: number
  supplementReason?: string
  replaceTargetPage?: boolean
  paperInstanceId?: string
  declaredClassIds?: string[]
  anchorExists?: boolean
  anchorMutated?: boolean
  startedAt?: string
  startedBy?: string
  scanBatchId?: string
  committedExamBatchId?: string
  documentIngestionSessionId?: string
  resolvedScanConfig?: ExamScannerScanConfigVO
  pageCount?: number
  fileHash?: string
  diagnostic?: string
  pageRegisterBlocked?: boolean
  pageRegisterDiagnostic?: string
  pendingPageCount?: number
  pendingPagesDiagnostic?: string
  committedAiJobId?: string
  committedFileNodeId?: string
  archiveBatchMode?: ArchiveScanBatchModeCode
}

export interface ScanWorkOrderPortfolioContextVO {
  collectMode?: PortfolioCollectModeCode
  teacherId?: string
  gapTaskId?: string
  gapTaskTitle?: string
  categoryId?: string
  categoryName?: string
  taskType?: string
  templateCode?: string
  archiveRecordId?: string
  scanAllowed?: boolean
  blockReason?: string
  activeWorkOrderId?: string
  activeBatchExternalNo?: string
  activeWorkOrderStatus?: ScanWorkOrderStatusCode
  activeWorkOrderDiagnostic?: string
}

export interface ScanWorkOrderArchiveContextVO {
  volumeId?: string
  archiveNo?: string
  archiveTitle?: string
  volumeStatus?: string
  catalogCode?: string
  materialType?: ArchiveMaterialTypeCode
  archiveBatchMode?: ArchiveScanBatchModeCode
  activeWorkOrderId?: string
  activeWorkOrderStatus?: ScanWorkOrderStatusCode
  activeBatchExternalNo?: string
  canRegisterMaterial?: boolean
}

export interface ScanWorkOrderContextVO {
  taskKind?: ScanTaskKindCode
  activeWorkOrderId?: string
  activeWorkOrderStatus?: ScanWorkOrderStatusCode
  activeBatchExternalNo?: string
  examKioskContext?: ExamScannerKioskContextVO
  archiveContext?: ScanWorkOrderArchiveContextVO
  portfolioContext?: ScanWorkOrderPortfolioContextVO
}

export interface ScanWorkOrderCommitRequest {
  taskKind: ScanTaskKindCode
  batchExternalNo: string
  pageCount?: number
  containerFileId?: string
  containerSha256?: string
  archiveBatchMode?: ArchiveScanBatchModeCode
  dpi?: number
  colorMode?: string
  duplexMode?: string
  scanStartTime?: string
  scanEndTime?: string
  scannerIp?: string
  traceId?: string
}

export interface ScanWorkOrderDiscardRequest {
  taskKind: ScanTaskKindCode
  batchExternalNo: string
  examId?: string
  scannerDeviceId: string
  scannerStationId: string
  discardPendingPages: boolean
}

/** 考试扫描开单：taskKind 由 startExamScanWorkOrder 注入。 */
export type ExamScanWorkOrderStartRequest = Omit<ScanWorkOrderStartRequest, 'taskKind'>

/** 考试扫描 discard：taskKind 由 discardExamScanWorkOrder 注入，examId 关闭 kiosk 锚点必填。 */
export type ExamScanWorkOrderDiscardRequest = Omit<ScanWorkOrderDiscardRequest, 'taskKind'> & {
  examId: string
}

export interface ScanWorkOrderContextRequest {
  taskKind: ScanTaskKindCode
  scannerDeviceId: string
  scannerStationId: string
  examId?: string
  examScanMode?: 'DIRECT' | 'SUPPLEMENT'
  volumeId?: string
  batchExternalNo?: string
  collectMode?: PortfolioCollectModeCode
  teacherId?: string
  gapTaskId?: string
  categoryId?: string
  taskType?: string
  templateCode?: string
  archiveRecordId?: string
}

export function startScanWorkOrder(
  request: ScanWorkOrderStartRequest,
): Promise<ScanWorkOrderLifecycleVO> {
  return http.post<ScanWorkOrderLifecycleVO>('/api/mark/scanner/work-order/start', request)
}

export function commitScanWorkOrder(
  request: ScanWorkOrderCommitRequest,
): Promise<ScanWorkOrderLifecycleVO> {
  return http.post<ScanWorkOrderLifecycleVO>('/api/mark/scanner/work-order/commit', request)
}

export function discardScanWorkOrder(
  request: ScanWorkOrderDiscardRequest,
): Promise<ScanWorkOrderLifecycleVO> {
  return http.post<ScanWorkOrderLifecycleVO>('/api/mark/scanner/work-order/discard', request)
}

export function getScanWorkOrderContext(
  request: ScanWorkOrderContextRequest,
): Promise<ScanWorkOrderContextVO> {
  return http.post<ScanWorkOrderContextVO>('/api/mark/scanner/work-order/context', request)
}

export function startExamScanWorkOrder(
  request: ExamScanWorkOrderStartRequest,
): Promise<ScanWorkOrderLifecycleVO> {
  return startScanWorkOrder({ ...request, taskKind: 'EXAM_MARKING' })
}

export function discardExamScanWorkOrder(
  request: ExamScanWorkOrderDiscardRequest,
): Promise<ScanWorkOrderLifecycleVO> {
  return discardScanWorkOrder({ ...request, taskKind: 'EXAM_MARKING' })
}
