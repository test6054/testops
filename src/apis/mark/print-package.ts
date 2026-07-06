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

/** 试卷母版/制卷未配置业务码 - 与后端 ResultCodeEnum.EXAM_MARK_PAPER_MASTER_NOT_CONFIGURED 对齐 */
export const PAPER_MASTER_NOT_CONFIGURED_CODE = 20015

type MarkBusinessError = Error & {
  code?: number | string
  response?: { data?: { code?: number | string } }
}

export const PRINT_PACKAGE_STATUS_TONE: Record<PrintPackageStatusCode, BadgeTone> = {
  [PrintPackageStatusCode.GENERATED]: 'green',
}

/** 印刷包主流程 hint：名册与母版就绪后生成，再预览或下载 PDF */
export const PRINT_PACKAGE_FLOW_HINT = '名册与母版就绪 → 生成印刷包 → 预览 / 下载'

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

export interface PrintPackageQueryRequest {
  examId: string
  printPackageId?: string
}

export interface PrintPackageVO {
  printPackageId: string
  examId: string
  masterId: string
  packageNo: string
  packageName: string
  packageFileId: string
  itemCount: number
  status: PrintPackageStatusCode
  generatedTime: string
  sealRemark: string | null
  items: PrintPackageItemVO[]
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

export function isPaperMasterNotConfiguredError(error: MarkBusinessError): boolean {
  const code = error.code ?? error.response?.data?.code
  return Number(code) === PAPER_MASTER_NOT_CONFIGURED_CODE
}

export function getPrintPackage(request: PrintPackageQueryRequest): Promise<PrintPackageVO> {
  return http.post<PrintPackageVO>('/api/mark/exams/print-package/detail', request)
}

export function generatePrintPackage(request: PrintPackageGenerateRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/print-package/generate', request)
}

export function pagePrintPackages(
  request: PrintPackagePageRequest,
): Promise<PageResult<PrintPackageVO>> {
  return http.post<PageResult<PrintPackageVO>>('/api/mark/exams/print-package/page', request)
}
