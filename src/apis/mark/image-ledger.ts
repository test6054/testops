import type { DuplicateResolutionStatusCode } from './duplicate-resolution-status'
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
import http from '@/config/axios'
import { LedgerStatusCode } from '@/types/enums/ledger-status-enum'

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
  expectedPageCount: number
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

/**
 * 查询影像账本详情和对账状态
 * POST /api/mark/exams/image-ledger/detail
 */
export function getImageLedgerDetail(
  request: ImageLedgerDetailRequest,
): Promise<ImageLedgerDetailResponse | null> {
  return http.post<ImageLedgerDetailResponse | null>('/api/mark/exams/image-ledger/detail', request)
}

/** 影像账本对账请求 - 对应 ImageLedgerBalanceRequest */
export interface ImageLedgerBalanceRequest {
  examId: string
}

/**
 * 执行或重新执行考试整体对账
 * POST /api/mark/exams/image-ledger/balance
 */
export function executeImageLedgerBalance(
  request: ImageLedgerBalanceRequest,
): Promise<ImageLedgerDetailResponse> {
  return http.post<ImageLedgerDetailResponse>('/api/mark/exams/image-ledger/balance', request)
}

// ─── 重复影像处置 ─────────────────────────────────────

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

export function pagePendingDuplicates(
  request: DuplicateResolutionPageRequest,
): Promise<PageResult<ExamPaperDuplicateResolutionVO>> {
  return http.post<PageResult<ExamPaperDuplicateResolutionVO>>(
    '/api/mark/exams/binding/duplicate-page',
    request,
  )
}

/** 重复影像处置请求 - 对应 DuplicateResolveRequest */
export interface DuplicateResolveRequest {
  examId: string
  resolutionId: string
  /** 教师选择保留的试卷实例ID，必须是该记录中两份之一 */
  selectedPaperInstanceId: string
  resolutionReason: string
}

/**
 * 处置重复影像：教师选择保留某一张试卷实例
 * POST /api/mark/exams/binding/resolve-duplicate
 */
export function resolveDuplicate(request: DuplicateResolveRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/binding/resolve-duplicate', request)
}
