import type { ExamScannerScanConfigVO, ExamScannerBoundPaperItemVO, ScannerKioskScanMode } from '@/apis/mark/scanner-kiosk'
import http from '@/config/axios'

/** 扫描来源页映射 - 对应 ExamScanSourcePageMappingRequest */
export interface ExamScanSourcePageMappingRequest {
  pageSeq: number
  templatePageNo: number
}

/** 教师 Web 端人工补录准备查询请求 - 对应 ExamTeacherScanSupplementPrepareRequest */
export interface ExamTeacherScanSupplementPrepareRequest {
  examId: string
  scannerDeviceId: string
  scannerStationId: string
  scanMode: ScannerKioskScanMode
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
  scanMode: ScannerKioskScanMode
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
