import type { PageResult, QueryDto } from '@/types'
import type { BindingStatusCode } from '@/types/enums/binding-status-enum'
import type { CandidateScanProgressStatusCode } from '@/types/enums/candidate-scan-progress-status-enum'
import type { CandidateStatusCode } from '@/types/enums/candidate-status-enum'
import type { EffectiveStatusCode } from '@/types/enums/effective-status-enum'
import type { QualityDecisionCode } from '@/types/enums/quality-decision-enum'
import type { ScannerKioskScanModeCode } from '@/types/enums/scanner-kiosk-scan-mode-enum'
import http from '@/config/axios'

export interface ExamManualSupplementWorkbenchQueryRequest {
  examId: string
}

export interface ExamManualSupplementWorkbenchResponse {
  examId: string
  missingPageCandidateCount: number
  supplementEligibleBatchCount: number
  pendingAttentionCount: number
  webSupplementDeviceCount: number
  recentSupplements: ExamManualSupplementRecordItemResponse[]
  /** MVR-265：主考补录写能力位；与 BE isExamOwner 对齐 */
  canManageOwnerSupplementWrites?: boolean
}

export interface ExamManualSupplementCandidatePageQueryRequest extends QueryDto {
  examId: string
  classId?: string
  keyword?: string
}

export interface ExamManualSupplementCandidateItemResponse {
  candidateRosterId: string
  classId?: string
  className?: string
  studentNo: string
  studentName: string
  candidateStatus: CandidateStatusCode
  paperInstanceId?: string
  bindingStatus?: BindingStatusCode
  scanBatchId?: string
  expectedPageCount?: number | null
  scannedPageCount: number
  openAttentionCount: number
  missingTemplatePageNos: number[]
  scanProgressStatus: CandidateScanProgressStatusCode
  supplementEligible: boolean
  blockReason?: string
  replaceEligible: boolean
  replaceBlockReason?: string
}

export interface ExamManualSupplementPaperPageStatusQueryRequest {
  examId: string
  paperInstanceId: string
}

export interface ExamManualSupplementPaperOccupiedPageItemResponse {
  templatePageNo: number
  pageId: string
  qualityStatus: QualityDecisionCode
  effectiveStatus: EffectiveStatusCode
}

export interface ExamManualSupplementPaperPageStatusResponse {
  examId: string
  paperInstanceId: string
  scanBatchId?: string
  expectedPageCount?: number | null
  registeredTemplatePageNos: number[]
  missingTemplatePageNos: number[]
  occupiedPages: ExamManualSupplementPaperOccupiedPageItemResponse[]
  candidateRosterId?: string
  studentNo?: string
  studentName?: string
  classId?: string
  className?: string
  supplementEligible: boolean
  supplementBlockReason?: string
  replaceEligible: boolean
  replaceBlockReason?: string
}

export interface ExamManualSupplementRecordPageQueryRequest extends QueryDto {
  examId: string
}

export interface ExamManualSupplementRecordItemResponse {
  scanBatchId: string
  batchNo?: string
  scanMode: ScannerKioskScanModeCode
  targetPageNo?: number
  supplementReason?: string
  paperInstanceId?: string
  studentNo?: string
  studentName?: string
  scannerDeviceId?: string
  operatorUserId?: string
  createTime?: string
}

export interface ExamManualSupplementDeviceListQueryRequest {
  examId: string
  directOnly: boolean
}

export interface ExamManualSupplementDeviceItemResponse {
  scannerDeviceId: string
  scannerStationId: string
  deviceName?: string
  webSupplementEnabled: boolean
}

export interface ExamManualSupplementDeviceListResponse {
  examId: string
  items: ExamManualSupplementDeviceItemResponse[]
}

export function getManualSupplementWorkbench(
  examId: string,
): Promise<ExamManualSupplementWorkbenchResponse> {
  return http.post<ExamManualSupplementWorkbenchResponse>(
    '/api/mark/exams/manual-supplement/workbench',
    { examId } satisfies ExamManualSupplementWorkbenchQueryRequest,
  )
}

export function pageManualSupplementCandidates(
  request: ExamManualSupplementCandidatePageQueryRequest,
): Promise<PageResult<ExamManualSupplementCandidateItemResponse>> {
  return http.post<PageResult<ExamManualSupplementCandidateItemResponse>>(
    '/api/mark/exams/manual-supplement/candidates/page',
    request,
  )
}

export function getManualSupplementPaperPageStatus(
  request: ExamManualSupplementPaperPageStatusQueryRequest,
): Promise<ExamManualSupplementPaperPageStatusResponse> {
  return http.post<ExamManualSupplementPaperPageStatusResponse>(
    '/api/mark/exams/manual-supplement/paper-page-status',
    request,
  )
}

export function pageManualSupplementRecords(
  request: ExamManualSupplementRecordPageQueryRequest,
): Promise<PageResult<ExamManualSupplementRecordItemResponse>> {
  return http.post<PageResult<ExamManualSupplementRecordItemResponse>>(
    '/api/mark/exams/manual-supplement/records/page',
    request,
  )
}

export function listManualSupplementDevices(
  request: ExamManualSupplementDeviceListQueryRequest,
): Promise<ExamManualSupplementDeviceListResponse> {
  return http.post<ExamManualSupplementDeviceListResponse>(
    '/api/mark/exams/manual-supplement/devices/list',
    request,
  )
}
