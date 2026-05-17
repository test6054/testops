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
export interface ImageLedgerDetailPayload {
  examId: string
}

/** 影像账本详情响应 - 对应 ImageLedgerDetailResponse */
export interface ImageLedgerDetailVO {
  ledgerId?: string
  examId: string
  ledgerStatus?: string
  expectedCandidateCount?: number
  expectedPageCount?: number
  scannedPageCount?: number
  reconstructedPaperCount?: number
  boundPaperCount?: number
  missingCandidateCount?: number
  duplicatePageCount?: number
  balancedTime?: string
  diagnostic?: string
  pendingDuplicateCount?: number
}

/** 账本状态文案映射 */
export const LEDGER_STATUS_LABEL: Record<string, string> = {
  BALANCING: '对账中',
  BALANCED: '已平账',
  INCIDENT_OPEN: '存在异常',
}

/** 账本状态徽标颜色（统一 BadgeTone） */
export const LEDGER_STATUS_COLOR: Record<string, BadgeTone> = {
  BALANCING: 'blue',
  BALANCED: 'green',
  INCIDENT_OPEN: 'red',
}

/**
 * 查询影像账本详情和对账状态
 * POST /api/mark/exams/image-ledger/detail
 */
export function getImageLedgerDetail(
  payload: ImageLedgerDetailPayload,
): Promise<ImageLedgerDetailVO> {
  return http.post<ImageLedgerDetailVO>('/api/mark/exams/image-ledger/detail', payload)
}

/** 影像账本对账请求 - 对应 ImageLedgerBalanceRequest */
export interface ImageLedgerBalancePayload {
  examId: string
}

/**
 * 执行或重新执行考试整体对账
 * POST /api/mark/exams/image-ledger/balance
 */
export function executeImageLedgerBalance(
  payload: ImageLedgerBalancePayload,
): Promise<ImageLedgerDetailVO> {
  return http.post<ImageLedgerDetailVO>('/api/mark/exams/image-ledger/balance', payload)
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

/** 重复影像处置记录 - 对应 ExamPaperDuplicateResolution */
export interface ExamPaperDuplicateResolutionVO {
  id: string
  tenantId?: string
  examId: string
  pageHash?: string
  firstPageId?: string
  secondPageId?: string
  firstPaperInstanceId?: string
  secondPaperInstanceId?: string
  selectedPaperInstanceId?: string
  resolutionStatus?: DuplicateResolutionStatusCode
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
  payload: ImageLedgerDetailPayload,
): Promise<ExamPaperDuplicateResolutionVO[]> {
  return http.post<ExamPaperDuplicateResolutionVO[]>(
    '/api/mark/exams/binding/duplicate-page',
    payload,
  )
}

/** 重复影像处置请求 - 对应 DuplicateResolveRequest */
export interface DuplicateResolvePayload {
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
export function resolveDuplicate(payload: DuplicateResolvePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/binding/resolve-duplicate', payload)
}
