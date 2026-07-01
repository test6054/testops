/**
 * 印刷包 API — 对接 /api/mark/exams/print-package/**
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const PRINT_PACKAGE_DATA_ERROR = '印刷包数据异常，请刷新后重试'

/** 试卷母版/制卷未配置业务码 - 与后端 ResultCodeEnum.EXAM_MARK_PAPER_MASTER_NOT_CONFIGURED 对齐 */
export const PAPER_MASTER_NOT_CONFIGURED_CODE = 20015

type MarkBusinessError = Error & {
  code?: number | string
  response?: { data?: { code?: number | string } }
}

export type PrintPackageStatusCode = 'GENERATED'

export const PRINT_PACKAGE_STATUS_LABEL: Record<PrintPackageStatusCode, string> = {
  GENERATED: '已生成',
}

export const PRINT_PACKAGE_STATUS_TONE: Record<PrintPackageStatusCode, BadgeTone> = {
  GENERATED: 'green',
}

export type PrintPackageItemStatusCode = 'READY'

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

function requirePrintPackageText(value: string | undefined): void {
  if (!value) {
    throw new Error(PRINT_PACKAGE_DATA_ERROR)
  }
}

function requirePrintPackageNumber(value: number | undefined): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(PRINT_PACKAGE_DATA_ERROR)
  }
}

function requirePrintPackageRemark(value: string | null | undefined): void {
  if (value === undefined) {
    throw new Error(PRINT_PACKAGE_DATA_ERROR)
  }
}

function validatePrintPackageItemContract(record: PrintPackageItemVO): void {
  requirePrintPackageText(record.printPackageItemId)
  requirePrintPackageText(record.studentUserId)
  requirePrintPackageText(record.studentNo)
  requirePrintPackageText(record.studentName)
  requirePrintPackageText(record.qrCode)
  requirePrintPackageText(record.barCode)
  requirePrintPackageText(record.securityCode)
  requirePrintPackageText(record.printFileId)
  strictEnumLabel({ READY: '待印刷' }, record.status, '印刷包明细状态')
}

export function validatePrintPackageContract(record: PrintPackageVO): void {
  requirePrintPackageText(record.printPackageId)
  requirePrintPackageText(record.examId)
  requirePrintPackageText(record.masterId)
  requirePrintPackageText(record.packageNo)
  requirePrintPackageText(record.packageName)
  requirePrintPackageText(record.packageFileId)
  requirePrintPackageNumber(record.itemCount)
  strictEnumLabel(PRINT_PACKAGE_STATUS_LABEL, record.status, '印刷包状态')
  strictEnumTone(PRINT_PACKAGE_STATUS_TONE, record.status, '印刷包状态')
  requirePrintPackageText(record.generatedTime)
  requirePrintPackageRemark(record.sealRemark)
  record.items?.forEach(validatePrintPackageItemContract)
}

function validatePrintPackagePageContract(page: PageResult<PrintPackageVO>): PageResult<PrintPackageVO> {
  page.list.forEach(validatePrintPackageContract)
  return page
}

export function isPaperMasterNotConfiguredError(error: MarkBusinessError): boolean {
  const code = error.code ?? error.response?.data?.code
  return Number(code) === PAPER_MASTER_NOT_CONFIGURED_CODE
}

export async function getPrintPackage(request: PrintPackageQueryRequest): Promise<PrintPackageVO> {
  const record = await http.post<PrintPackageVO>('/api/mark/exams/print-package/detail', request)
  validatePrintPackageContract(record)
  return record
}

export function generatePrintPackage(request: PrintPackageGenerateRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/print-package/generate', request)
}

export async function pagePrintPackages(
  request: PrintPackagePageRequest,
): Promise<PageResult<PrintPackageVO>> {
  const page = await http.post<PageResult<PrintPackageVO>>(
    '/api/mark/exams/print-package/page',
    request,
  )
  return validatePrintPackagePageContract(page)
}
