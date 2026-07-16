/**
 * 印刷包 API — 对接 /api/mark/exams/print-package/**
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type { PrintPackageItemStatusCode } from '@/types/enums/print-package-item-status-enum'
import http from '@/config/axios'

import { PrintPackageStatusCode } from '@/types/enums/print-package-status-enum'

export {
  ALL_PRINT_PACKAGE_ITEM_STATUS_CODES,
  PrintPackageItemStatusCode,
  PrintPackageItemStatusDescription,
} from '@/types/enums/print-package-item-status-enum'

/** 制卷设计未完成业务码 - 与后端 ResultCodeEnum.EXAM_MARK_LAYOUT_NOT_READY 对齐 */
export const LAYOUT_NOT_READY_CODE = 20015

type MarkBusinessError = Error & {
  code?: number | string
  response?: { data?: { code?: number | string } }
}

export const PRINT_PACKAGE_STATUS_TONE: Record<PrintPackageStatusCode, BadgeTone> = {
  [PrintPackageStatusCode.GENERATED]: 'green',
}

/** 印刷包主流程 hint：名册与制卷设计就绪后生成，再预览或下载 PDF */
export const PRINT_PACKAGE_FLOW_HINT = '名册与制卷设计就绪 → 生成印刷包 → 预览 / 下载送印'

/** 独立答卷页不适用系统印刷包 */
export const PRINT_PACKAGE_ANSWER_SHEET_HINT
  = '本场为教考分离（独立答卷页），试题卷线下印制，系统不生成印刷包。'

/** 外带已印整卷不适用系统印刷包 */
export const PRINT_PACKAGE_EXTERNAL_PRINT_HINT
  = '本场为外带已印试卷，系统只上传同款 PDF 母版用于扫描对齐，不生成印刷包。'

export {
  ALL_PRINT_PACKAGE_STATUS_CODES,
  PrintPackageStatusCode,
  PrintPackageStatusDescription,
} from '@/types/enums/print-package-status-enum'

export interface PrintPackageItemVO {
  printPackageItemId: string
  studentUserId: string
  studentNo: string
  studentName: string
  examRoom: string
  seatNo: string
  qrCode: string
  barCode: string
  securityCode: string
  printFileId: string
  status: PrintPackageItemStatusCode
}

export interface ExamPrintPackageResponse {
  printPackageId: string
  examId: string
  layoutId: string
  packageNo: string
  packageName: string
  packageFileId: string
  itemCount: number
  status: PrintPackageStatusCode
  generatedTime: string
  sealRemark: string | null
}

export interface PrintPackageGenerateRequest {
  examId: string
  packageNo: string
  packageName: string
  sealRemark?: string
}

export interface PrintPackagePageRequest extends QueryDto {
  examId: string
}

export interface PrintPackageItemPageRequest extends QueryDto {
  examId: string
  printPackageId: string
}

export function isLayoutNotReadyError(error: MarkBusinessError): boolean {
  const code = error.code ?? error.response?.data?.code
  return Number(code) === LAYOUT_NOT_READY_CODE
}

export function generatePrintPackage(request: PrintPackageGenerateRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/print-package/generate', request)
}

export function pagePrintPackages(
  request: PrintPackagePageRequest,
): Promise<PageResult<ExamPrintPackageResponse>> {
  return http.post<PageResult<ExamPrintPackageResponse>>('/api/mark/exams/print-package/page', request)
}

export function pagePrintPackageItems(
  request: PrintPackageItemPageRequest,
): Promise<PageResult<PrintPackageItemVO>> {
  return http.post<PageResult<PrintPackageItemVO>>('/api/mark/exams/print-package/items/page', request)
}
