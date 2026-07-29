import type { ExamScannerBoundPaperItemVO, ExamScannerScanConfigVO } from '@/apis/mark/scanner-kiosk'
import type { ScannerKioskScanModeCode } from '@/types/enums/scanner-kiosk-scan-mode-enum'
import http from '@/config/axios'

/** 扫描来源页映射 - 对应 ExamScanSourcePageMappingRequest */
export interface ExamScanSourcePageMappingRequest {
  sourcePageNo: number
  pageSeq?: number
  templatePageNo: number
}

/** 教师 Web 端人工补录准备查询请求 - 对应 ExamTeacherScanSupplementPrepareRequest */
export interface ExamTeacherScanSupplementPrepareRequest {
  examId: string
  scannerDeviceId: string
  scannerStationId: string
  scanMode: ScannerKioskScanModeCode
  /** 补扫上下文扫描批次 ID（须已 commit） */
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
  scanMode: ScannerKioskScanModeCode
  /** 补扫上下文扫描批次 ID（须与设备一致） */
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
 * 教师 Web 端人工补录准备查询：设备阻塞诊断与本设备已绑定试卷列表
 * POST /api/mark/exams/scan-supplement/prepare
 */
export async function prepareTeacherScanSupplement(
  request: ExamTeacherScanSupplementPrepareRequest,
): Promise<ExamTeacherScanSupplementPrepareResponse> {
  const response = await http.post<ExamTeacherScanSupplementPrepareResponse>(
    '/api/mark/exams/scan-supplement/prepare',
    request,
  )
  if (
    typeof response.canSubmitManualSupplement !== 'boolean'
    || typeof response.hasActiveScanSession !== 'boolean'
    || !Array.isArray(response.boundPapers)
  ) {
    throw new TypeError('教师补录预检合同异常：能力位、扫描会话或已绑定试卷不可用')
  }
  return response
}

/**
 * 教师 Web 端人工补录：开启批次锚点 → commit → 登记扫描页
 * POST /api/mark/exams/scan-sources/teacher-supplement
 */
export async function teacherSupplementScanSource(
  request: ExamTeacherScanSupplementRequest,
): Promise<ExamTeacherScanSupplementResponse> {
  const response = await http.post<ExamTeacherScanSupplementResponse>(
    '/api/mark/exams/scan-sources/teacher-supplement',
    request,
  )
  if (
    !response.scanBatchId
    || !response.batchExternalNo
    || !Number.isInteger(response.registeredPageCount)
    || response.registeredPageCount <= 0
    || !Array.isArray(response.pageIds)
    || response.pageIds.length !== response.registeredPageCount
    || response.pageIds.some((pageId) => !pageId)
  ) {
    throw new Error('教师补录提交合同异常：批次、登记页数或页标识不可用')
  }
  return response
}
