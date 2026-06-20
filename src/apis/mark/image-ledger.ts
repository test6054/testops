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
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'

// ─── 影像账本详情与对账 ─────────────────────────────────

/** 影像账本详情查询请求 - 对应 ImageLedgerDetailRequest */
export interface ImageLedgerDetailRequest {
  examId: string
}

/** 影像账本详情响应 - 对应 ImageLedgerDetailResponse */
export interface ImageLedgerDetailVO {
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
}

/**
 * 归一化影像账本详情：后端在未初始化账本时仅返回 examId 占位，不得当作有效账本渲染。
 */
export function normalizeImageLedgerDetail(
  detail: ImageLedgerDetailVO | null | undefined,
): ImageLedgerDetailVO | null {
  if (!detail?.ledgerId) return null
  return detail
}

/** 账本页数是否已形成可对账统计 */
export function hasImageLedgerPageStats(
  ledger: Pick<ImageLedgerDetailVO, 'scannedPageCount' | 'expectedPageCount'>,
): boolean {
  return typeof ledger.scannedPageCount === 'number'
    && Number.isFinite(ledger.scannedPageCount)
    && typeof ledger.expectedPageCount === 'number'
    && Number.isFinite(ledger.expectedPageCount)
}

/** 影像账本状态 - 对应后端 LedgerStatus 枚举 */
export type LedgerStatusCode = 'BALANCING' | 'BALANCED' | 'INCIDENT_OPEN'

/** 账本状态文案映射 */
export const LEDGER_STATUS_LABEL: Record<LedgerStatusCode, string> = {
  BALANCING: '对账中',
  BALANCED: '已平账',
  INCIDENT_OPEN: '存在异常',
}

/** 账本状态徽标颜色（统一 BadgeTone） */
export const LEDGER_STATUS_COLOR: Record<LedgerStatusCode, BadgeTone> = {
  BALANCING: 'blue',
  BALANCED: 'green',
  INCIDENT_OPEN: 'red',
}

/**
 * 查询影像账本详情和对账状态
 * POST /api/mark/exams/image-ledger/detail
 */
export function getImageLedgerDetail(
  request: ImageLedgerDetailRequest,
): Promise<ImageLedgerDetailVO | null> {
  return http.post<ImageLedgerDetailVO | null>('/api/mark/exams/image-ledger/detail', request)
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
): Promise<ImageLedgerDetailVO> {
  return http.post<ImageLedgerDetailVO>('/api/mark/exams/image-ledger/balance', request)
}

// ─── 重复影像处置 ─────────────────────────────────────

/** 重复处置状态 */
export type DuplicateResolutionStatusCode = 'PENDING' | 'RESOLVED'

/** 重复处置状态文案映射 */
export const DUPLICATE_RESOLUTION_STATUS_LABEL: Record<DuplicateResolutionStatusCode, string> = {
  PENDING: '待处置',
  RESOLVED: '已处置',
}

/** 重复处置状态徽标颜色（统一 BadgeTone） */
export const DUPLICATE_RESOLUTION_STATUS_COLOR: Record<DuplicateResolutionStatusCode, BadgeTone> = {
  PENDING: 'orange',
  RESOLVED: 'green',
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
  resolvedBy?: string
  resolvedTime?: string
  createTime?: string
  updateTime?: string
}

/**
 * 查询待处置的重复影像记录
 * POST /api/mark/exams/binding/duplicate-page
 */
export function listPendingDuplicates(
  request: ImageLedgerDetailRequest,
): Promise<ExamPaperDuplicateResolutionVO[]> {
  return http.post<ExamPaperDuplicateResolutionVO[]>(
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
