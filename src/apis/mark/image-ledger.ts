/**
 * 影像账本与 IQA API - 对接 edu-mark 模块 ImageLedgerController
 *
 * 后端规则：
 * - 所有 endpoint 均为 POST，入参统一 body
 * - 租户与操作人从 UserHold 注入，前端只传业务字段
 * - 后端 Long ID 统一用 string 表达到前端
 */
import http from '@/config/axios'

// ─── 影像账本详情与平账 ─────────────────────────────────

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
  iqaBlockedPageCount?: number
  labelConflictPageCount?: number
  balancedTime?: string
  diagnostic?: string
  pendingRepairCount?: number
  pendingDuplicateCount?: number
}

/** 账本状态文案映射 */
export const LEDGER_STATUS_LABEL: Record<string, string> = {
  PENDING: '待平账',
  PARTIAL: '部分平账',
  BALANCED: '已平账',
  BLOCKED: '阻断中',
  CLOSED: '已关闭',
}

/** 账本状态徽标颜色 */
export const LEDGER_STATUS_COLOR: Record<string, string> = {
  PENDING: 'default',
  PARTIAL: 'cyan',
  BALANCED: 'green',
  BLOCKED: 'red',
  CLOSED: 'default',
}

/**
 * 查询影像账本详情和平账状态
 * POST /api/mark/exams/image-ledger/detail
 */
export function getImageLedgerDetail(
  payload: ImageLedgerDetailPayload,
): Promise<ImageLedgerDetailVO> {
  return http.post<ImageLedgerDetailVO>('/api/mark/exams/image-ledger/detail', payload)
}

/** 平账范围编码 */
export type BalanceScopeCode = 'FULL' | 'BATCH'

/** 影像账本平账请求 - 对应 ImageLedgerBalanceRequest */
export interface ImageLedgerBalancePayload {
  examId: string
  /** 平账范围：FULL 全量 / BATCH 指定批次 */
  balanceScope?: BalanceScopeCode
  /** balanceScope=BATCH 时必填 */
  batchId?: string
}

/**
 * 执行或重新执行批次平账
 * POST /api/mark/exams/image-ledger/balance
 */
export function executeImageLedgerBalance(
  payload: ImageLedgerBalancePayload,
): Promise<ImageLedgerDetailVO> {
  return http.post<ImageLedgerDetailVO>('/api/mark/exams/image-ledger/balance', payload)
}

// ─── IQA 指标与修复 ─────────────────────────────────

/** IQA 指标查询请求 - 对应 QualityMetricPageRequest */
export interface QualityMetricPagePayload {
  examId: string
  batchId?: string
  blockedOnly?: boolean
}

/** 页面 IQA 指标 - 对应 ExamImageQualityMetric */
export interface ExamImageQualityMetricVO {
  id: string
  tenantId?: string
  examId: string
  batchId?: string
  pageId?: string
  dpi?: number
  resolutionWidth?: number
  resolutionHeight?: number
  blurScore?: number
  skewAngle?: number
  brightnessScore?: number
  contrastScore?: number
  shadowScore?: number
  cropRisk?: number
  pageHash?: string
  normalizedHash?: string
  overallPass?: boolean
  diagnostic?: string
  createTime?: string
  updateTime?: string
}

/**
 * 查询 IQA 指标和阻断页
 * POST /api/mark/exams/quality/metric-page
 */
export function listQualityMetrics(
  payload: QualityMetricPagePayload,
): Promise<ExamImageQualityMetricVO[]> {
  return http.post<ExamImageQualityMetricVO[]>('/api/mark/exams/quality/metric-page', payload)
}

/** 修复类型编码 */
export type RepairTypeCode = 'RESCAN' | 'ORIENTATION_FIX' | 'CROP_FIX' | 'RETURN'

/** 修复状态编码 */
export type RepairStatusCode = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

/** 修复类型文案映射 */
export const REPAIR_TYPE_LABEL: Record<RepairTypeCode, string> = {
  RESCAN: '重扫',
  ORIENTATION_FIX: '方向校正',
  CROP_FIX: '裁切修复',
  RETURN: '退回',
}

/** 修复状态文案映射 */
export const REPAIR_STATUS_LABEL: Record<RepairStatusCode, string> = {
  PENDING: '待处理',
  IN_PROGRESS: '处理中',
  COMPLETED: '已完成',
  FAILED: '失败',
  CANCELLED: '已取消',
}

/** 修复状态徽标颜色 */
export const REPAIR_STATUS_COLOR: Record<RepairStatusCode, string> = {
  PENDING: 'orange',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  FAILED: 'red',
  CANCELLED: 'default',
}

/** 影像修复提交请求 - 对应 RepairSubmitRequest */
export interface RepairSubmitPayload {
  examId: string
  pageId: string
  repairType: RepairTypeCode
  afterFileId?: string
  repairReason: string
}

/** 影像修复动作 - 对应 ExamRepairAction */
export interface ExamRepairActionVO {
  id: string
  tenantId?: string
  examId: string
  pageId?: string
  repairType?: RepairTypeCode
  beforeFileId?: string
  afterFileId?: string
  beforeHash?: string
  afterHash?: string
  repairReason?: string
  repairStatus?: RepairStatusCode
  repairedBy?: string
  repairedTime?: string
  createTime?: string
  updateTime?: string
}

/**
 * 提交重扫、修复或补扫动作
 * POST /api/mark/exams/quality/repair-submit
 */
export function submitRepairAction(payload: RepairSubmitPayload): Promise<ExamRepairActionVO> {
  return http.post<ExamRepairActionVO>('/api/mark/exams/quality/repair-submit', payload)
}

// ─── 质检覆盖 ─────────────────────────────────────

/** 质检覆盖目标类型 */
export type OverrideTargetType = 'PAGE' | 'BATCH' | 'PAPER_INSTANCE'

/** 质检覆盖类型 */
export type OverrideType = 'QUALITY_PASS' | 'FORCE_PROCEED' | 'BLOCK_CONFIRM'

/** 质检覆盖请求 - 对应 QualityOverrideRequest */
export interface QualityOverridePayload {
  examId: string
  targetType: OverrideTargetType
  targetId: string
  overrideType: OverrideType
  riskReason: string
}

/**
 * 质检覆盖放行或阻断
 * POST /api/mark/exams/quality/override
 */
export function submitQualityOverride(payload: QualityOverridePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/quality/override', payload)
}

// ─── 重复处置 ─────────────────────────────────────

/** 重复类型 */
export type DuplicateTypeCode = 'DUPLICATE_PAPER' | 'DUPLICATE_PAGE' | 'DUPLICATE_SLICE'

/** 重复处置状态 */
export type DuplicateResolutionStatusCode = 'PENDING' | 'RESOLVED' | 'VOIDED'

/** 重复类型文案映射 */
export const DUPLICATE_TYPE_LABEL: Record<DuplicateTypeCode, string> = {
  DUPLICATE_PAPER: '重复试卷',
  DUPLICATE_PAGE: '重复页面',
  DUPLICATE_SLICE: '重复切片',
}

/** 重复处置状态文案映射 */
export const DUPLICATE_RESOLUTION_STATUS_LABEL: Record<DuplicateResolutionStatusCode, string> = {
  PENDING: '待处置',
  RESOLVED: '已处置',
  VOIDED: '已作废',
}

/** 重复处置状态徽标颜色 */
export const DUPLICATE_RESOLUTION_STATUS_COLOR: Record<DuplicateResolutionStatusCode, string> = {
  PENDING: 'orange',
  RESOLVED: 'green',
  VOIDED: 'red',
}

/** 重复处置记录 - 对应 ExamPaperDuplicateResolution */
export interface ExamPaperDuplicateResolutionVO {
  id: string
  tenantId?: string
  examId: string
  duplicateGroupId?: string
  studentUserId?: string
  attemptId?: string
  duplicateType?: DuplicateTypeCode
  evidencePayload?: string
  selectedPaperInstanceId?: string
  voidedTargetIds?: string
  resolutionStatus?: DuplicateResolutionStatusCode
  resolutionReason?: string
  resolvedBy?: string
  resolvedTime?: string
  createTime?: string
  updateTime?: string
}

/**
 * 查询待处置的重复试卷/页面/切片记录
 * POST /api/mark/exams/binding/duplicate-page
 */
export function listPendingDuplicates(
  payload: ImageLedgerDetailPayload,
): Promise<ExamPaperDuplicateResolutionVO[]> {
  return http.post<ExamPaperDuplicateResolutionVO[]>('/api/mark/exams/binding/duplicate-page', payload)
}

/** 重复处置请求 - 对应 DuplicateResolveRequest */
export interface DuplicateResolvePayload {
  examId: string
  resolutionId: string
  selectedPaperInstanceId?: string
  voidedTargetIds?: string[]
  resolutionReason: string
}

/**
 * 处置重复试卷/页面/切片
 * POST /api/mark/exams/binding/resolve-duplicate
 */
export function resolveDuplicate(payload: DuplicateResolvePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/binding/resolve-duplicate', payload)
}
