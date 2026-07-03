import type { ExamScannerBoundPaperItemVO, ExamScannerScanConfigVO } from '@/apis/mark/scanner-kiosk'
import type { QualityDecisionCode } from '@/apis/mark/exam-scan'
import http from '@/config/axios'

/** 教师 Web 端补录扫描模式 - 对应 ScannerKioskScanMode DIRECT / SUPPLEMENT */
export type TeacherScanSupplementMode = 'DIRECT' | 'SUPPLEMENT'

/** 扫描来源页映射 - 对应 ExamScanSourcePageMappingRequest */
export interface ExamScanSourcePageMappingRequest {
  pageSeq: number
  templatePageNo: number
}

/** 扫描页登记请求 - 对应 ExamScannedPageRegisterRequest */
export interface ExamScannedPageRegisterRequest {
  examId: string
  scanBatchId: string
  paperInstanceId?: string
  pageSeq: number
  templatePageNo: number
  fileId: string
  qualityStatus: QualityDecisionCode
}

/** 扫描页登记响应 - 对应 ExamScannedPageRegisterResponse */
export interface ExamScannedPageRegisterResponse {
  pageId: string
  paperInstanceId: string
}

/** 扫描来源文件导入请求 - 对应 ExamScanSourceImportRequest */
export interface ExamScanSourceImportRequest {
  examId: string
  scanBatchId: string
  sourceFileId: string
  paperInstanceId?: string
  startPageSeq?: number
  startTemplatePageNo?: number
  pageMappings?: ExamScanSourcePageMappingRequest[]
}

/** 扫描来源文件导入响应 - 对应 ExamScanSourceImportResponse */
export interface ExamScanSourceImportResponse {
  paperInstanceId: string
  registeredPageCount: number
  pageIds: string[]
}

/** 教师 Web 端人工补录准备查询请求 - 对应 ExamTeacherScanSupplementPrepareRequest */
export interface ExamTeacherScanSupplementPrepareRequest {
  examId: string
  scannerDeviceId: string
  scannerStationId: string
  scanMode: TeacherScanSupplementMode
  /** SUPPLEMENT 必填；DIRECT 不传 */
  scanBatchId?: string
}

/** 教师 Web 端人工补录准备查询响应 - 对应 ExamTeacherScanSupplementPrepareResponse */
export interface ExamTeacherScanSupplementPrepareResponse {
  canSubmitManualSupplement: boolean
  blockReason?: string
  hasActiveScanSession: boolean
  activeScanSessionReason?: string
  activeBatchExternalNo?: string
  activeScanBatchId?: string
  supplementBlockReason?: string
  boundPapers: ExamScannerBoundPaperItemVO[]
}

/** 教师 Web 端人工补录扫描来源请求 - 对应 ExamTeacherScanSupplementRequest */
export interface ExamTeacherScanSupplementRequest {
  examId: string
  scannerDeviceId: string
  scannerStationId: string
  declaredClassIds: string[]
  scanMode: TeacherScanSupplementMode
  /** SUPPLEMENT 必填；DIRECT 不传 */
  scanBatchId?: string
  targetPageNo?: number
  supplementReason?: string
  replaceTargetPage: boolean
  scanConfig: ExamScannerScanConfigVO
  sourceFileId: string
  paperInstanceId?: string
  startPageSeq?: number
  startTemplatePageNo?: number
  pageMappings?: ExamScanSourcePageMappingRequest[]
}

/** 教师 Web 端人工补录扫描来源响应 - 对应 ExamTeacherScanSupplementResponse */
export interface ExamTeacherScanSupplementResponse {
  scanBatchId: string
  batchExternalNo: string
  paperInstanceId?: string
  registeredPageCount: number
  pageIds: string[]
}

/**
 * 登记扫描页并返回试卷实例
 * POST /api/mark/exams/scanned-pages/register
 */
export function registerScannedPage(
  request: ExamScannedPageRegisterRequest,
): Promise<ExamScannedPageRegisterResponse> {
  return http.post<ExamScannedPageRegisterResponse>('/api/mark/exams/scanned-pages/register', request)
}

/**
 * 导入扫描来源文件并登记扫描页（批次须 RECEIVED）
 * POST /api/mark/exams/scan-sources/import
 */
export function importScanSource(
  request: ExamScanSourceImportRequest,
): Promise<ExamScanSourceImportResponse> {
  return http.post<ExamScanSourceImportResponse>('/api/mark/exams/scan-sources/import', request)
}

/**
 * 教师 Web 端人工补录准备查询：设备阻塞诊断与本设备已绑定试卷列表
 * POST /api/mark/exams/scan-supplement/prepare
 */
export function prepareTeacherScanSupplement(
  request: ExamTeacherScanSupplementPrepareRequest,
): Promise<ExamTeacherScanSupplementPrepareResponse> {
  return http.post<ExamTeacherScanSupplementPrepareResponse>(
    '/api/mark/exams/scan-supplement/prepare',
    request,
  )
}

/**
 * 教师 Web 端人工补录：开启批次锚点 → commit → 登记扫描页
 * POST /api/mark/exams/scan-sources/teacher-supplement
 */
export function teacherSupplementScanSource(
  request: ExamTeacherScanSupplementRequest,
): Promise<ExamTeacherScanSupplementResponse> {
  return http.post<ExamTeacherScanSupplementResponse>(
    '/api/mark/exams/scan-sources/teacher-supplement',
    request,
  )
}
