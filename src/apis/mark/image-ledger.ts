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
  return http.post<unknown>('/api/mark/exams/image-ledger/detail', payload).then(validateImageLedgerDetail)
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
  return http.post<unknown>('/api/mark/exams/image-ledger/balance', payload).then(validateImageLedgerDetail)
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
  return http.post<unknown>(
    '/api/mark/exams/binding/duplicate-page',
    payload,
  ).then(validateDuplicateResolutionList)
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
  return http.post<unknown>('/api/mark/exams/binding/resolve-duplicate', payload).then(validateBooleanResult)
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`影像账本接口缺少 ${fieldName}`)
  }
  return value
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new TypeError(`影像账本接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`影像账本接口 ${fieldName} 格式错误`)
  }
  return value
}

function validateImageLedgerDetail(value: unknown): ImageLedgerDetailVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('影像账本详情返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    ledgerId: optionalString(record.ledgerId, 'ledgerId'),
    examId: requireString(record.examId, 'examId'),
    ledgerStatus: optionalString(record.ledgerStatus, 'ledgerStatus'),
    expectedCandidateCount: requireFiniteNumber(record.expectedCandidateCount, 'expectedCandidateCount'),
    expectedPageCount: requireFiniteNumber(record.expectedPageCount, 'expectedPageCount'),
    scannedPageCount: requireFiniteNumber(record.scannedPageCount, 'scannedPageCount'),
    reconstructedPaperCount: requireFiniteNumber(record.reconstructedPaperCount, 'reconstructedPaperCount'),
    boundPaperCount: requireFiniteNumber(record.boundPaperCount, 'boundPaperCount'),
    missingCandidateCount: requireFiniteNumber(record.missingCandidateCount, 'missingCandidateCount'),
    duplicatePageCount: requireFiniteNumber(record.duplicatePageCount, 'duplicatePageCount'),
    balancedTime: optionalString(record.balancedTime, 'balancedTime'),
    diagnostic: optionalString(record.diagnostic, 'diagnostic'),
    pendingDuplicateCount: requireFiniteNumber(record.pendingDuplicateCount, 'pendingDuplicateCount'),
  }
}

function validateDuplicateResolutionStatus(value: unknown): DuplicateResolutionStatusCode | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (value !== 'PENDING' && value !== 'RESOLVED') {
    throw new TypeError('重复影像处置状态格式错误')
  }
  return value
}

function validateDuplicateResolution(value: unknown): ExamPaperDuplicateResolutionVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('重复影像处置记录返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    id: requireString(record.id, 'id'),
    examId: requireString(record.examId, 'examId'),
    pageHash: optionalString(record.pageHash, 'pageHash'),
    firstPageId: optionalString(record.firstPageId, 'firstPageId'),
    secondPageId: optionalString(record.secondPageId, 'secondPageId'),
    firstPaperInstanceId: optionalString(record.firstPaperInstanceId, 'firstPaperInstanceId'),
    secondPaperInstanceId: optionalString(record.secondPaperInstanceId, 'secondPaperInstanceId'),
    selectedPaperInstanceId: optionalString(record.selectedPaperInstanceId, 'selectedPaperInstanceId'),
    resolutionStatus: validateDuplicateResolutionStatus(record.resolutionStatus),
    resolutionReason: optionalString(record.resolutionReason, 'resolutionReason'),
    resolvedBy: optionalString(record.resolvedBy, 'resolvedBy'),
    resolvedTime: optionalString(record.resolvedTime, 'resolvedTime'),
    createTime: optionalString(record.createTime, 'createTime'),
    updateTime: optionalString(record.updateTime, 'updateTime'),
  }
}

function validateDuplicateResolutionList(value: unknown): ExamPaperDuplicateResolutionVO[] {
  if (!Array.isArray(value)) {
    throw new TypeError('重复影像处置列表返回格式错误')
  }
  return value.map(validateDuplicateResolution)
}

function validateBooleanResult(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError('重复影像处置结果返回格式错误')
  }
  return value
}
