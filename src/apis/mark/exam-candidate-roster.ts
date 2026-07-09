import type { PaperInstanceDisplayVO } from '@/apis/mark/exam-score'
/**
 * 考生名册工作台 API - 对接 /api/mark/exams/candidate-roster/workbench-list
 */
import type { PageResult, QueryDto } from '@/types'
import type { BindingStatusCode } from '@/types/enums/binding-status-enum'
import type { CandidateScanProgressStatusCode } from '@/types/enums/candidate-scan-progress-status-enum'
import type { CandidateStatusCode } from '@/types/enums/candidate-status-enum'
import type { EffectiveStatusCode } from '@/types/enums/effective-status-enum'
import type { QualityDecisionCode } from '@/types/enums/quality-decision-enum'
import http from '@/config/axios'

export {
  ALL_CANDIDATE_SCAN_PROGRESS_STATUS_CODES,
  CANDIDATE_SCAN_PROGRESS_STATUS_TONE,
  CandidateScanProgressStatusCode,
  CandidateScanProgressStatusDescription,
} from '@/types/enums/candidate-scan-progress-status-enum'

/** 考生名册工作台列表查询 - 对应 ExamCandidateRosterWorkbenchListQueryRequest */
export interface ExamCandidateRosterWorkbenchListQueryRequest extends QueryDto {
  examId: string
  classId?: string
  keyword?: string
  scanProgressStatus?: CandidateScanProgressStatusCode
}

/** 考生名册工作台列表项 - 对应 ExamCandidateRosterWorkbenchItemResponse */
export interface ExamCandidateRosterWorkbenchItemResponse {
  candidateRosterId: string
  classId?: string
  className?: string
  studentUserId: string
  studentNo: string
  studentName: string
  candidateStatus: CandidateStatusCode
  paperInstanceId?: string
  bindingStatus?: BindingStatusCode
  scanBatchId?: string
  scannedPageCount: number
  expectedPageCount: number | null
  scanProgressStatus: CandidateScanProgressStatusCode
  openAttentionCount: number
  paperDisplay?: PaperInstanceDisplayVO
  removable?: boolean
  removalBlockReason?: string
}

/** 分页查询考生名册工作台列表。 */
export function pageCandidateRosterWorkbench(
  request: ExamCandidateRosterWorkbenchListQueryRequest,
): Promise<PageResult<ExamCandidateRosterWorkbenchItemResponse>> {
  return http.post<PageResult<ExamCandidateRosterWorkbenchItemResponse>>(
    '/api/mark/exams/candidate-roster/workbench-list',
    request,
  )
}

/** 考生名册试卷扫描页查询 - 对应 ExamCandidateRosterPaperScannedPagesQueryRequest */
export interface ExamCandidateRosterPaperScannedPagesQueryRequest {
  examId: string
  paperInstanceId: string
}

/** 考生名册试卷扫描页项 - 对应 ExamCandidateRosterPaperScannedPageItemResponse */
export interface ExamCandidateRosterPaperScannedPageItemResponse {
  pageId: string
  templatePageNo: number
  pageSeq: number
  fileId: string
  qualityStatus: QualityDecisionCode
  effectiveStatus: EffectiveStatusCode
  diagnostic?: string
}

/** 考生名册试卷扫描页列表 - 对应 ExamCandidateRosterPaperScannedPagesResponse */
export interface ExamCandidateRosterPaperScannedPagesResponse {
  examId: string
  paperInstanceId: string
  scanBatchId?: string
  pages: ExamCandidateRosterPaperScannedPageItemResponse[]
}

/** 查询考生指定试卷实例 ACTIVE 扫描页。 */
export function listCandidateRosterPaperScannedPages(
  request: ExamCandidateRosterPaperScannedPagesQueryRequest,
): Promise<ExamCandidateRosterPaperScannedPagesResponse> {
  return http.post<ExamCandidateRosterPaperScannedPagesResponse>(
    '/api/mark/exams/candidate-roster/paper-scanned-pages',
    request,
  )
}
