import type { PaperInstanceDisplayVO } from './exam-score'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
/**
 * 影像账本 API - 对接 edu-mark 模块 ImageLedgerController
 *
 * 仅服务于纸质试卷扫描影像链：
 * - 影像账本详情与考试整体对账
 * - 教师对相同 pageHash 重复扫描页的处置
 *
 * 后端规则：
 * - 所有 endpoint 均为 POST，入参统一 body
 * - 租户与操作人从 UserHold 注入，前端只传业务字段
 * - 后端 Long ID 统一用 string 表达到前端
 */
import type { PageResult, QueryDto } from '@/types'
import type { QualityDecisionCode } from '@/types/enums/quality-decision-enum'
import {
  ALL_DUPLICATE_RESOLUTION_STATUS_CODES,
  DuplicateResolutionStatusCode,
} from './duplicate-resolution-status'
import http from '@/config/axios'
import {
  ALL_LEDGER_STATUS_CODES,
  LedgerStatusCode,
} from '@/types/enums/ledger-status-enum'

export {
  ALL_LEDGER_STATUS_CODES,
  LedgerStatusCode,
  LedgerStatusDescription,
} from '@/types/enums/ledger-status-enum'

/** 账本状态徽标颜色（统一 BadgeTone） */
export const LEDGER_STATUS_TONE: Record<LedgerStatusCode, BadgeTone> = {
  [LedgerStatusCode.BALANCING]: 'blue',
  [LedgerStatusCode.BALANCED]: 'green',
  [LedgerStatusCode.INCIDENT_OPEN]: 'red',
}

// ─── 影像账本详情与对账 ─────────────────────────────────

/** 影像账本详情查询请求 - 对应 ImageLedgerDetailRequest */
export interface ImageLedgerDetailRequest {
  examId: string
}

/** 影像账本详情响应 - 对应 ImageLedgerDetailResponse */
export interface ImageLedgerDetailResponse {
  ledgerId: string
  examId: string
  ledgerStatus: LedgerStatusCode
  expectedCandidateCount: number
  /** 整卷线下试卷尚未形成页数真源时为空 */
  expectedPageCount: number | null
  scannedPageCount: number
  reconstructedPaperCount: number
  boundPaperCount: number
  missingCandidateCount: number
  duplicatePageCount: number
  balancedTime?: string
  diagnostic?: string
  pendingDuplicateCount: number
  /** MVR-264：主考写能力位（整体对账/重复处置）；与 BE isExamOwner 对齐 */
  canManageOwnerLedgerWrites?: boolean
}

/** 校验影像账本对象身份、枚举、计数与能力位，阻止残缺响应进入工作台。 */
function assertImageLedgerDetailContract(
  response: ImageLedgerDetailResponse,
  examId: string,
  requireCapability: boolean,
): void {
  const nonNegativeCounts = [
    response.expectedCandidateCount,
    response.scannedPageCount,
    response.reconstructedPaperCount,
    response.boundPaperCount,
    response.missingCandidateCount,
    response.duplicatePageCount,
    response.pendingDuplicateCount,
  ]
  if (
    !response.ledgerId
    || response.examId !== examId
    || !ALL_LEDGER_STATUS_CODES.includes(response.ledgerStatus)
    || nonNegativeCounts.some((value) => !Number.isInteger(value) || value < 0)
    || (
      response.expectedPageCount !== null
      && (!Number.isInteger(response.expectedPageCount) || response.expectedPageCount < 0)
    )
    || (requireCapability && typeof response.canManageOwnerLedgerWrites !== 'boolean')
  ) {
    throw new Error('影像账本合同异常：对象身份、状态、计数或权限能力位不可用')
  }
}

/**
 * 查询影像账本详情和对账状态
 * POST /api/mark/exams/image-ledger/detail
 */
export async function getImageLedgerDetail(
  request: ImageLedgerDetailRequest,
): Promise<ImageLedgerDetailResponse | null> {
  const response = await http.post<ImageLedgerDetailResponse | null>(
    '/api/mark/exams/image-ledger/detail',
    request,
  )
  if (response !== null) {
    assertImageLedgerDetailContract(response, request.examId, true)
  }
  return response
}

/** 影像账本对账请求 - 对应 ImageLedgerBalanceRequest */
export interface ImageLedgerBalanceRequest {
  examId: string
}

/**
 * 执行或重新执行考试整体对账
 * POST /api/mark/exams/image-ledger/balance
 */
export async function executeImageLedgerBalance(
  request: ImageLedgerBalanceRequest,
): Promise<ImageLedgerDetailResponse> {
  const response = await http.post<ImageLedgerDetailResponse>(
    '/api/mark/exams/image-ledger/balance',
    request,
  )
  assertImageLedgerDetailContract(response, request.examId, false)
  return response
}

// ─── 重复影像处置 ─────────────────────────────────────

/** 重复影像单侧页证据 - 对应 DuplicatePageEvidenceVO */
export interface DuplicatePageEvidenceVO {
  pageId: string
  paperInstanceId: string
  paperDisplay: PaperInstanceDisplayVO
  scanBatchId?: string
  scanBatchDisplayName?: string
  templatePageNo?: number
  pageSeq?: number
  qualityStatus?: QualityDecisionCode
  scannedTime?: string
  sideLabel: string
}

/** 重复影像处置记录 - 对应 ExamPaperDuplicateResolutionVO */
export interface ExamPaperDuplicateResolutionVO {
  id: string
  examId: string
  pageHash: string
  firstPageId: string
  secondPageId: string
  firstPaperInstanceId: string
  secondPaperInstanceId: string
  selectedPaperInstanceId?: string
  resolutionStatus: DuplicateResolutionStatusCode
  resolutionReason?: string
  firstPageEvidence: DuplicatePageEvidenceVO
  secondPageEvidence: DuplicatePageEvidenceVO
  resolvedUserId?: string
  resolvedTime?: string
  createTime?: string
  updateTime?: string
}

/**
 * 分页查询待处置的重复影像记录
 * POST /api/mark/exams/binding/duplicate-page
 */
export interface DuplicateResolutionPageRequest extends QueryDto {
  examId: string
}

export async function pagePendingDuplicates(
  request: DuplicateResolutionPageRequest,
): Promise<PageResult<ExamPaperDuplicateResolutionVO>> {
  const response = await http.post<PageResult<ExamPaperDuplicateResolutionVO>>(
    '/api/mark/exams/binding/duplicate-page',
    request,
  )
  const resolutionIds = Array.isArray(response.list)
    ? new Set(response.list.map((item) => item.id))
    : new Set<string>()
  if (
    !Array.isArray(response.list)
    || !Number.isInteger(response.total)
    || response.total < 0
    || !Number.isInteger(response.pageNum)
    || response.pageNum < 1
    || !Number.isInteger(response.pageSize)
    || response.pageSize < 1
    || !Number.isInteger(response.pages)
    || response.pages < 0
    || response.list.length > response.pageSize
    || resolutionIds.size !== response.list.length
    || response.list.some(
      (item) =>
        !item.id
        || item.examId !== request.examId
        || !ALL_DUPLICATE_RESOLUTION_STATUS_CODES.includes(item.resolutionStatus)
        || item.resolutionStatus !== DuplicateResolutionStatusCode.PENDING
        || !item.firstPageEvidence
        || !item.secondPageEvidence
        || item.firstPageEvidence.pageId !== item.firstPageId
        || item.secondPageEvidence.pageId !== item.secondPageId
        || item.firstPageEvidence.paperInstanceId !== item.firstPaperInstanceId
        || item.secondPageEvidence.paperInstanceId !== item.secondPaperInstanceId
        || !item.firstPageEvidence.paperDisplay?.primaryText
        || !item.secondPageEvidence.paperDisplay?.primaryText,
    )
  ) {
    throw new Error('重复影像分页合同异常：分页、考试身份或双侧证据不可用')
  }
  return response
}

/** 重复影像处置请求 - 对应 DuplicateResolveRequest */
export interface DuplicateResolveRequest {
  examId: string
  resolutionId: string
  /** 教师选择保留的扫描页 ID，必须是该记录双侧页之一 */
  selectedPageId: string
  /** 教师选择保留的试卷实例ID，必须是该记录中两份之一 */
  selectedPaperInstanceId: string
  resolutionReason: string
}

/**
 * 处置重复影像：教师按证据侧选择保留扫描页（同卷仅废未保留页，异卷废未保留答卷）
 * POST /api/mark/exams/binding/resolve-duplicate
 */
export async function resolveDuplicate(request: DuplicateResolveRequest): Promise<boolean> {
  const response = await http.post<boolean>('/api/mark/exams/binding/resolve-duplicate', request)
  if (response !== true) {
    throw new Error('重复影像处置合同异常：服务端未确认写入成功')
  }
  return response
}
