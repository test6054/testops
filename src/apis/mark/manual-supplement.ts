import type { PageResult, QueryDto } from '@/types'
import type { BindingStatusCode } from '@/types/enums/binding-status-enum'
import type { CandidateScanProgressStatusCode } from '@/types/enums/candidate-scan-progress-status-enum'
import type { CandidateStatusCode } from '@/types/enums/candidate-status-enum'
import type { EffectiveStatusCode } from '@/types/enums/effective-status-enum'
import type { QualityDecisionCode } from '@/types/enums/quality-decision-enum'
import type { ScannerKioskScanModeCode } from '@/types/enums/scanner-kiosk-scan-mode-enum'
import http from '@/config/axios'
import { ALL_BINDING_STATUS_CODES } from '@/types/enums/binding-status-enum'
import { ALL_CANDIDATE_SCAN_PROGRESS_STATUS_CODES } from '@/types/enums/candidate-scan-progress-status-enum'
import { ALL_CANDIDATE_STATUS_CODES } from '@/types/enums/candidate-status-enum'
import { ALL_SCANNER_KIOSK_SCAN_MODE_CODES } from '@/types/enums/scanner-kiosk-scan-mode-enum'

export interface ExamManualSupplementWorkbenchQueryRequest {
  examId: string
}

export interface ExamManualSupplementWorkbenchResponse {
  examId: string
  /** 整卷线下试卷尚未形成单卷页数真源时为空，不能将其解释为零缺页。 */
  missingPageCandidateCount: number | null
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

/** 查询并校验当前考试的手动补录工作台合同。 */
export async function getManualSupplementWorkbench(
  examId: string,
): Promise<ExamManualSupplementWorkbenchResponse> {
  const response = await http.post<ExamManualSupplementWorkbenchResponse>(
    '/api/mark/exams/manual-supplement/workbench',
    { examId } satisfies ExamManualSupplementWorkbenchQueryRequest,
  )
  const requiredCounts = [
    response.supplementEligibleBatchCount,
    response.pendingAttentionCount,
    response.webSupplementDeviceCount,
  ]
  if (
    response.examId !== examId
    || !Array.isArray(response.recentSupplements)
    || requiredCounts.some((count) => !Number.isInteger(count) || count < 0)
    || (response.missingPageCandidateCount != null
      && (!Number.isInteger(response.missingPageCandidateCount)
        || response.missingPageCandidateCount < 0))
  ) {
    throw new Error('手动补录工作台合同异常：考试身份、计数或最近记录不可用')
  }
  return response
}

/** 分页查询待补候选，并校验候选身份、计数与状态集合。 */
export async function pageManualSupplementCandidates(
  request: ExamManualSupplementCandidatePageQueryRequest,
): Promise<PageResult<ExamManualSupplementCandidateItemResponse>> {
  const response = await http.post<PageResult<ExamManualSupplementCandidateItemResponse>>(
    '/api/mark/exams/manual-supplement/candidates/page',
    request,
  )
  if (
    !Array.isArray(response.list)
    || !Number.isInteger(response.total)
    || response.total < 0
    || response.list.some(
      (item) =>
        !item.candidateRosterId
        || !item.studentNo
        || !item.studentName
        || !Array.isArray(item.missingTemplatePageNos)
        || item.missingTemplatePageNos.some((pageNo) => !Number.isInteger(pageNo) || pageNo <= 0)
        || !Number.isInteger(item.scannedPageCount)
        || item.scannedPageCount < 0
        || !Number.isInteger(item.openAttentionCount)
        || item.openAttentionCount < 0
        || !ALL_CANDIDATE_STATUS_CODES.includes(item.candidateStatus)
        || !ALL_CANDIDATE_SCAN_PROGRESS_STATUS_CODES.includes(item.scanProgressStatus)
        || (item.bindingStatus != null && !ALL_BINDING_STATUS_CODES.includes(item.bindingStatus)),
    )
  ) {
    throw new Error('手动补录候选分页合同异常：列表、计数或候选状态不可用')
  }
  return response
}

/** 查询指定答卷页状态，并校验考试、答卷与模板页集合身份。 */
export async function getManualSupplementPaperPageStatus(
  request: ExamManualSupplementPaperPageStatusQueryRequest,
): Promise<ExamManualSupplementPaperPageStatusResponse> {
  const response = await http.post<ExamManualSupplementPaperPageStatusResponse>(
    '/api/mark/exams/manual-supplement/paper-page-status',
    request,
  )
  if (
    response.examId !== request.examId
    || response.paperInstanceId !== request.paperInstanceId
    || !Array.isArray(response.registeredTemplatePageNos)
    || !Array.isArray(response.missingTemplatePageNos)
    || !Array.isArray(response.occupiedPages)
    || [...response.registeredTemplatePageNos, ...response.missingTemplatePageNos].some(
      (pageNo) => !Number.isInteger(pageNo) || pageNo <= 0,
    )
    || response.occupiedPages.some(
      (page) => !page.pageId || !Number.isInteger(page.templatePageNo) || page.templatePageNo <= 0,
    )
  ) {
    throw new Error('手动补录卷面状态合同异常：对象身份或页集合不可用')
  }
  return response
}

/** 分页查询补录审计记录，并校验批次标识与扫描模式。 */
export async function pageManualSupplementRecords(
  request: ExamManualSupplementRecordPageQueryRequest,
): Promise<PageResult<ExamManualSupplementRecordItemResponse>> {
  const response = await http.post<PageResult<ExamManualSupplementRecordItemResponse>>(
    '/api/mark/exams/manual-supplement/records/page',
    request,
  )
  if (
    !Array.isArray(response.list)
    || !Number.isInteger(response.total)
    || response.total < 0
    || response.list.some(
      (item) =>
        !item.scanBatchId
        || !ALL_SCANNER_KIOSK_SCAN_MODE_CODES.includes(item.scanMode)
        || (item.targetPageNo != null
          && (!Number.isInteger(item.targetPageNo) || item.targetPageNo <= 0)),
    )
  ) {
    throw new Error('手动补录记录分页合同异常：列表、总数或记录状态不可用')
  }
  return response
}

/** 查询当前考试补录工位，并校验考试身份与设备工位标识。 */
export async function listManualSupplementDevices(
  request: ExamManualSupplementDeviceListQueryRequest,
): Promise<ExamManualSupplementDeviceListResponse> {
  const response = await http.post<ExamManualSupplementDeviceListResponse>(
    '/api/mark/exams/manual-supplement/devices/list',
    request,
  )
  if (
    response.examId !== request.examId
    || !Array.isArray(response.items)
    || response.items.some((item) => !item.scannerDeviceId || !item.scannerStationId)
  ) {
    throw new Error('手动补录工位列表合同异常：考试身份或工位标识不可用')
  }
  return response
}
