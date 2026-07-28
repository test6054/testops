/**
 * 印刷包 API — 对接 /api/mark/exams/print-package/**
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'
import { PrintPackageStatusCode } from '@/types/enums/print-package-status-enum'

/** 制卷设计未完成业务码 - 与后端 ResultCodeEnum.EXAM_MARK_LAYOUT_NOT_READY 对齐 */
export const LAYOUT_NOT_READY_CODE = 20015

type MarkBusinessError = Error & {
  code?: number | string
  response?: { data?: { code?: number | string } }
}

export const PRINT_PACKAGE_STATUS_TONE: Record<PrintPackageStatusCode, BadgeTone> = {
  [PrintPackageStatusCode.GENERATED]: 'blue',
  [PrintPackageStatusCode.RELEASED_TO_PRINTER]: 'orange',
  [PrintPackageStatusCode.PRINTED]: 'blue',
  [PrintPackageStatusCode.SEALED]: 'purple',
  [PrintPackageStatusCode.ISSUED_TO_EXAM_SITE]: 'orange',
  [PrintPackageStatusCode.RECONCILED]: 'green',
  [PrintPackageStatusCode.VOIDED]: 'gray',
}

/** 印刷包主流程 hint：按制卷形态生成完整空白物理包，考生领卷后自填身份 */
export const PRINT_PACKAGE_FLOW_HINT = '命题签审通过 → 生成完整空白物理包 → 按统一页序印制与封装 → 考生自填身份'

/** 外带已印整卷不适用系统印刷包 */
export const PRINT_PACKAGE_EXTERNAL_PRINT_HINT
  = '本场为外带已印试卷，系统只上传同款 PDF 母版用于扫描对齐，不生成印刷包。'

export {
  ALL_PRINT_PACKAGE_STATUS_CODES,
  PrintPackageStatusCode,
  PrintPackageStatusDescription,
} from '@/types/enums/print-package-status-enum'

export interface ExamPrintPackageResponse {
  printPackageId: string
  examId: string
  layoutId: string
  paperSetId: string
  paperCode: string
  packageNo: string
  packageName: string
  packageFileId: string
  questionPaperFileId: string
  answerBookletFileId?: string
  plannedCopies: number
  spoilageAllowanceCopies: number
  actualPrintedCopies?: number
  destroyedSpoilageCopies?: number
  issuedCopies?: number
  returnedUnusedCopies?: number
  /** 计划印数中未交接考点、仍在校内受控留存的份数。 */
  retainedUnissuedCopies?: number
  /** 考点实际使用份数，由发放份数扣除考点未使用回收份数得到。 */
  usedCopies?: number
  printerName?: string
  handoverOperator?: string
  status: PrintPackageStatusCode
  generatedTime: string
  releasedTime?: string
  printedTime?: string
  sealedTime?: string
  issuedTime?: string
  reconciledTime?: string
  voidedTime?: string
  sealRemark: string | null
}

export interface PrintPackageGenerateRequest {
  examId: string
  packageNo: string
  packageName: string
  paperCode: string
  plannedCopies: number
  spoilageAllowanceCopies: number
  sealRemark?: string
}

export interface PrintPackageTransitionRequest {
  examId: string
  printPackageId: string
  targetStatus: PrintPackageStatusCode
  actualPrintedCopies?: number
  destroyedSpoilageCopies?: number
  issuedCopies?: number
  returnedUnusedCopies?: number
  printerName?: string
  handoverOperator?: string
  remark?: string
}

export interface PrintPackagePageRequest extends QueryDto {
  examId: string
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

export function transitionPrintPackage(request: PrintPackageTransitionRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/print-package/transition', request)
}
