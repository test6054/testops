import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import type {
  ExamScannerKioskContextVO,
  ExamScannerScanConfigVO,
  ScannerKioskScanModeCode,
} from '@/apis/mark/scanner-kiosk'
import type { ArchiveScanBatchModeCode } from '@/types/enums/archive-scan-batch-mode-enum'
import type { DirectScanProviderChainCode } from '@/types/enums/direct-scan-provider-chain-enum'
import type { DocumentBlankPageStatusCode } from '@/types/enums/document-blank-page-status-enum'
import type { DocumentBusinessSceneCode } from '@/types/enums/document-business-scene-enum'
import type { PortfolioAiTaskTypeCode } from '@/types/enums/portfolio-ai-task-type-enum'
import type { PortfolioCollectModeCode } from '@/types/enums/portfolio-collect-mode-enum'
import type { ScannerColorModeCode } from '@/types/enums/scanner-color-mode-enum'
import type { ScannerDuplexModeCode } from '@/types/enums/scanner-duplex-mode-enum'
import http from '@/config/axios'
import {
  ALL_SCAN_TASK_KIND_CODES,
  ScanTaskKindCode,
  ScanTaskKindDescription,
} from '@/types/enums/scan-task-kind-enum'
import { ScanWorkOrderStatusCode } from '@/types/enums/scan-work-order-status-enum'

import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_ARCHIVE_SCAN_BATCH_MODE_CODES,
  ArchiveScanBatchModeCode,
  ArchiveScanBatchModeDescription,
} from '@/types/enums/archive-scan-batch-mode-enum'

export {
  ALL_PORTFOLIO_COLLECT_MODE_CODES,
  PortfolioCollectModeCode,
  PortfolioCollectModeDescription,
} from '@/types/enums/portfolio-collect-mode-enum'

export const SCAN_TASK_KIND_OPTIONS: Array<{ value: ScanTaskKindCode, label: string }>
  = ALL_SCAN_TASK_KIND_CODES.map((value) => ({
    value,
    label: strictEnumLabel(ScanTaskKindDescription, value, '扫描任务类型'),
  }))

export const SCAN_WORK_ORDER_STATUS_TONE: Record<
  ScanWorkOrderStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ScanWorkOrderStatusCode.IN_PROGRESS]: 'blue',
  [ScanWorkOrderStatusCode.COMMITTING]: 'orange',
  [ScanWorkOrderStatusCode.FAILED]: 'red',
  [ScanWorkOrderStatusCode.COMMITTED]: 'green',
  [ScanWorkOrderStatusCode.DISCARDED]: 'gray',
}
export {
  ALL_SCAN_TASK_KIND_CODES,
  ScanTaskKindCode,
  ScanTaskKindDescription,
} from '@/types/enums/scan-task-kind-enum'
export {
  ALL_SCAN_WORK_ORDER_STATUS_CODES,
  ScanWorkOrderStatusCode,
  ScanWorkOrderStatusDescription,
} from '@/types/enums/scan-work-order-status-enum'

export interface ScanWorkOrderStartRequest {
  taskKind: ScanTaskKindCode
  scannerDeviceId: string
  scannerStationId: string
  examId?: string
  declaredClassIds?: string[]
  examScanMode?: ScannerKioskScanModeCode
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
  taskType?: PortfolioAiTaskTypeCode
  templateCode?: string
  archiveRecordId?: string
  providerChain?: DirectScanProviderChainCode
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
  examScanMode?: ScannerKioskScanModeCode
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
  pageRegisterPending?: boolean
  pageRegisterDiagnostic?: string
  pendingPageCount?: number
  pendingPagesDiagnostic?: string
  committedAiJobId?: string
  committedQualityAiTaskId?: string
  committedMaterialId?: string
  committedFileNodeId?: string
  archiveBatchMode?: ArchiveScanBatchModeCode
}

export interface ScanWorkOrderPortfolioContextVO {
  collectMode?: PortfolioCollectModeCode
  teacherId?: string
  teacherName?: string
  gapTaskId?: string
  gapTaskTitle?: string
  categoryId?: string
  categoryName?: string
  taskType?: PortfolioAiTaskTypeCode
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
  activeWorkOrderDiagnostic?: string
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
  activeWorkOrderLifecycle?: ScanWorkOrderLifecycleVO
}

export interface ScanWorkOrderCommitRequest {
  taskKind: ScanTaskKindCode
  batchExternalNo: string
  examId?: string
  reportId?: string
  declaredClassIds?: string[]
  examScanMode?: ScannerKioskScanModeCode
  targetPageNo?: number
  supplementReason?: string
  replaceTargetPage?: boolean
  pageCount?: number
  sourceFileIds?: string[]
  containerFileId?: string
  containerSha256?: string
  dpi?: number
  colorMode?: ScannerColorModeCode
  duplexMode?: ScannerDuplexModeCode
  scanStartTime?: string
  scanEndTime?: string
  scannerIp?: string
  traceId?: string
  scanSessionId?: string
  businessScene?: DocumentBusinessSceneCode
  businessRefId?: string
  providerChain?: DirectScanProviderChainCode
  documentPages?: ExamScannerCommitDocumentPageRequest[]
  archiveBatchMode?: ArchiveScanBatchModeCode
}

export interface ExamScannerCommitDocumentPageRequest {
  pageNo: number
  pageFileId: string
  widthPx: number
  heightPx: number
  dpi?: number
  sha256: string
  blankPageStatus?: DocumentBlankPageStatusCode
}

export interface ScanWorkOrderDiscardRequest {
  taskKind: ScanTaskKindCode
  batchExternalNo: string
  examId?: string
  scannerDeviceId: string
  scannerStationId: string
  discardPendingPages: boolean
}

export interface ExamScanWorkOrderStartRequest {
  scannerDeviceId: string
  scannerStationId: string
  examId?: string
  declaredClassIds?: string[]
  examScanMode?: ScannerKioskScanModeCode
  targetPageNo?: number
  supplementReason?: string
  replaceTargetPage?: boolean
  paperInstanceId?: string
  scanConfig: ExamScannerScanConfigVO
  dispatchTicketId?: string
  providerChain?: DirectScanProviderChainCode
}

export interface ExamScanWorkOrderDiscardRequest {
  batchExternalNo: string
  examId: string
  scannerDeviceId: string
  scannerStationId: string
  discardPendingPages: boolean
}

export interface ScanWorkOrderContextRequest {
  taskKind: ScanTaskKindCode
  scannerDeviceId: string
  scannerStationId: string
  examId?: string
  examScanMode?: ScannerKioskScanModeCode
  volumeId?: string
  batchExternalNo?: string
  collectMode?: PortfolioCollectModeCode
  teacherId?: string
  gapTaskId?: string
  categoryId?: string
  taskType?: PortfolioAiTaskTypeCode
  templateCode?: string
  archiveRecordId?: string
  dispatchTicketId?: string
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
  return startScanWorkOrder({ ...request, taskKind: ScanTaskKindCode.EXAM_MARKING })
}

export function commitExamScanWorkOrder(
  request: Omit<ScanWorkOrderCommitRequest, 'taskKind'>,
): Promise<ScanWorkOrderLifecycleVO> {
  return commitScanWorkOrder({ ...request, taskKind: ScanTaskKindCode.EXAM_MARKING })
}

export function discardExamScanWorkOrder(
  request: ExamScanWorkOrderDiscardRequest,
): Promise<ScanWorkOrderLifecycleVO> {
  return discardScanWorkOrder({ ...request, taskKind: ScanTaskKindCode.EXAM_MARKING })
}

export interface ExamScanWorkOrderPageRegisterRetryRequest {
  batchExternalNo: string
  examId: string
}

export function retryExamScanWorkOrderPageRegister(
  request: ExamScanWorkOrderPageRegisterRetryRequest,
): Promise<ScanWorkOrderLifecycleVO> {
  return http.post<ScanWorkOrderLifecycleVO>(
    '/api/mark/scanner/work-order/page-register/retry',
    request,
  )
}
