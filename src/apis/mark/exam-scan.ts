import type { DuplicateResolutionStatusCode } from './duplicate-resolution-status'
import type { EffectiveStatusCode } from './effective-status'
import type { ExamFileRefVO } from './exam'
import type { PaperInstanceDisplayVO } from './exam-score'
import type { GradeStatusCode } from './grade-status'
import type { ScannerKioskScanMode } from './scanner-kiosk'
import type { TaskStatusCode } from './task-status'
/**
 * 阅卷考试扫描批次与扫描异常 API - 对接 /api/mark/exams/scanner-batches/* 与 scan-attentions。
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'
import { assertUserFacingText } from '@/utils/contract-guard'

const SCAN_ATTENTION_DATA_ERROR = '扫描异常数据异常，请刷新后重试'

/** 扫描页质量判定 - 与后端 QualityDecision 枚举完全一致 */
export type QualityDecisionCode = 'PASS' | 'BLOCKED'

/** 扫描页质量判定文案 */
export const QUALITY_DECISION_LABEL: Record<QualityDecisionCode, string> = {
  PASS: '质量通过',
  BLOCKED: '质量阻断',
}

/** 扫描页质量判定徽标色调 */
export const QUALITY_DECISION_TONE: Record<QualityDecisionCode, BadgeTone> = {
  PASS: 'green',
  BLOCKED: 'red',
}

/** 阅卷原始扫描页引用 - 与后端 ScannedPageRef 字段对齐 */
export interface MarkingScanPageRefVO {
  pageId: string
  pageSeq: number
  templatePageNo: number
  fileId?: string
  qualityStatus: QualityDecisionCode
  identityMaskedView?: boolean
  /** 题目区域 ROI X（像素） */
  roiX?: number
  /** 题目区域 ROI Y（像素） */
  roiY?: number
  /** 题目区域 ROI 宽度（像素） */
  roiWidth?: number
  /** 题目区域 ROI 高度（像素） */
  roiHeight?: number
  /** 页面图像像素宽度（用于前端百分比定位） */
  pageImageWidth?: number
  /** 页面图像像素高度（用于前端百分比定位） */
  pageImageHeight?: number
}

/** 批改处理任务状态 - 见 task-status.ts */

/** 重复影像处置状态 - 见 duplicate-resolution-status.ts */

/** 扫描异常待办查询请求 - 对应 ScanAttentionQueryRequest */
export type ScanAttentionTypeCode
  = | 'QUALITY_BLOCK'
    | 'PROCESSING_BLOCK'
    | 'DUPLICATE_PENDING'
    | 'RECOGNITION_REVIEW'
    | 'BINDING_CONFLICT'
    | 'MISSING_CANDIDATE_ROSTER'

/** 扫描异常查询分组 - 对应 ScanAttentionQueryGroup */
export type ScanAttentionQueryGroupCode = 'ABNORMAL' | 'DUPLICATE'

/** 扫描异常来源类型 - 对应后端扫描异常聚合 SQL 固定来源 */
export type ScanAttentionSourceTypeCode
  = | 'SCANNED_PAGE'
    | 'PROCESSING_TASK'
    | 'DUPLICATE_RESOLUTION'
    | 'GRADE_RESULT'
    | 'PAPER_INSTANCE'
    | 'IMAGE_LEDGER'

/** 扫描异常类型文案 - 与后端 ScanAttentionType.message 完全一致 */
export const SCAN_ATTENTION_TYPE_LABEL: Record<ScanAttentionTypeCode, string> = {
  QUALITY_BLOCK: '质量阻断',
  PROCESSING_BLOCK: '处理阻断',
  DUPLICATE_PENDING: '重复影像',
  RECOGNITION_REVIEW: '识别复核',
  BINDING_CONFLICT: '身份绑定冲突',
  MISSING_CANDIDATE_ROSTER: '缺少考生名单',
}

/** 扫描异常类型徽标色调 */
export const SCAN_ATTENTION_TYPE_TONE: Record<ScanAttentionTypeCode, BadgeTone> = {
  QUALITY_BLOCK: 'red',
  PROCESSING_BLOCK: 'orange',
  DUPLICATE_PENDING: 'purple',
  RECOGNITION_REVIEW: 'blue',
  BINDING_CONFLICT: 'gray',
  MISSING_CANDIDATE_ROSTER: 'orange',
}

/** 扫描异常来源类型文案 - 与后端 ScanAttentionSourceType 展示约定一致 */
export const SCAN_ATTENTION_SOURCE_TYPE_LABEL: Record<ScanAttentionSourceTypeCode, string> = {
  SCANNED_PAGE: '扫描页',
  PROCESSING_TASK: '处理任务',
  DUPLICATE_RESOLUTION: '重复扫描处置',
  GRADE_RESULT: '阅卷结果',
  PAPER_INSTANCE: '试卷实例',
  IMAGE_LEDGER: '影像账本',
}

/** 扫描异常待办查询请求 - 对应 ScanAttentionQueryRequest */
export interface ScanAttentionQueryRequest extends QueryDto {
  examId: string
  scanBatchId?: string
  paperInstanceId?: string
  attentionType?: ScanAttentionTypeCode
  queryGroup?: ScanAttentionQueryGroupCode
}

/** 扫描异常待办项 - 对应 ScanAttentionItemResponse */
export interface ScanAttentionItemVO {
  id: string
  attentionType: ScanAttentionTypeCode
  sourceType: ScanAttentionSourceTypeCode
  sourceId: string
  sourceDisplayName: string
  examId: string
  scanBatchId?: string
  scanBatchDisplayName: string
  paperInstanceId?: string
  candidateRosterId?: string
  studentUserId?: string
  studentNo?: string
  studentName?: string
  classId?: string
  className?: string
  identitySliceFileId?: string
  /** 原始扫描页引用，身份绑定冲突处置时用于和手写身份区切片对照 */
  sourceScanPage?: MarkingScanPageRefVO
  anonymousNo?: string
  paperDisplay: PaperInstanceDisplayVO
  pageId?: string
  pageDisplayName: string
  questionTemplateId?: string
  questionDisplayName: string
  qualityDecision?: QualityDecisionCode
  processingStatus?: TaskStatusCode
  duplicateResolutionStatus?: DuplicateResolutionStatusCode
  gradeStatus?: GradeStatusCode
  diagnostic?: string
  updateTime?: string
}

/** 扫描批次状态码 - 对应后端 ScanBatchStatus 枚举。 */
export type ScanBatchStatusCode
  = | 'IN_PROGRESS'
    | 'RECEIVED'
    | 'BLOCKED'
    | 'BOUND'
    | 'COMPLETED'
    | 'DISCARDED'

/** 扫描批次状态文案映射 - 与后端 ScanBatchStatus.message 完整一致 */
export const SCAN_BATCH_STATUS_LABEL: Record<ScanBatchStatusCode, string> = {
  IN_PROGRESS: '进行中',
  RECEIVED: '已接收',
  BLOCKED: '已阻断',
  BOUND: '已绑定',
  COMPLETED: '已完成',
  DISCARDED: '已废弃',
}

/** 扫描批次状态 BadgeTone 映射 */
export const SCAN_BATCH_STATUS_TONE: Record<ScanBatchStatusCode, BadgeTone> = {
  IN_PROGRESS: 'blue',
  RECEIVED: 'blue',
  BLOCKED: 'red',
  BOUND: 'green',
  COMPLETED: 'green',
  DISCARDED: 'gray',
}

/** 扫描批次视图 - 对应 ExamScannerBatchResponse */
export interface ExamScannerBatchVO {
  /** 扫描批次ID */
  scanBatchId: string
  examId: string
  /** 扫描录入模式 */
  scanMode?: ScannerKioskScanMode
  batchNo: string
  batchExternalNo?: string
  scannerDeviceId?: string
  scannerStationId?: string
  /** 来源文件引用集合 */
  sourceFiles: ExamFileRefVO[]
  /** 来源文件数量 */
  sourceFileCount: number
  /** 补扫目标页号 */
  targetPageNo?: number
  /** 补扫原因 */
  supplementReason?: string
  pageCount: number
  /** 服务端已落库页数 */
  receivedPageCount?: number
  /** 待落库页数 */
  pendingUploadCount?: number
  /** 批次内未处置异常项数量 */
  attentionItemCount?: number
  status: ScanBatchStatusCode
  statusMessage: string
  diagnostic?: string
  scanStartTime: string
  scanEndTime: string
  createTime?: string
  updateTime?: string
  /** 批次内事件数量 */
  eventCount: number
  /** 是否替换目标页（仅 SUPPLEMENT 模式有意义） */
  replaceTargetPage: boolean
  /** 批次封存时间（与 discardedTime 互斥） */
  sealedTime?: string
  /** 批次封存执行人 ID */
  sealedUserId?: string
  /** 批次废弃时间 */
  discardedTime?: string
  /** 批次废弃执行人 ID */
  discardedUserId?: string
  /** 批次废弃原因（教师可见） */
  discardReason?: string
  /** 顺序审计是否通过 */
  orderAuditPassed?: boolean
  /** 顺序审计时间 */
  orderAuditTime?: string
  /** 顺序审计异常项数量 */
  orderAuditIssueCount?: number
}

/** 扫描批次创建响应 - 对应 ExamScannerBatchCreateResponse（orphan 补救等场景复用） */
export interface ExamScannerBatchCreateVO {
  scanBatchId: string
  batchNo: string
  eventCount: number
  fileCount: number
  pageCount: number
  scanStartTime: string
  scanEndTime: string
}

/** 扫描批次工作台 KPI 查询请求 - 对应 ExamScannerBatchWorkbenchSummaryRequest */
export interface ExamScannerBatchWorkbenchSummaryRequest {
  examId: string
}

/** 扫描批次工作台 KPI 响应 - 对应 ExamScannerBatchWorkbenchSummaryResponse */
export interface ExamScannerBatchWorkbenchSummaryVO {
  batchTotal: number
  inProgressCount: number
  blockedCount: number
  orphanPendingEventCount: number
  orphanPendingPageCount: number
  attentionCount: number
}

/** 扫描批次详情查询请求 - 对应 ExamScannerBatchDetailRequest */
export interface ExamScannerBatchDetailRequest {
  examId: string
  scanBatchId: string
}

/** 扫描批次扫描页分页查询请求 - 对应 ExamScannerBatchPagesPageRequest */
export interface ExamScannerBatchPagesPageRequest extends QueryDto {
  examId: string
  scanBatchId: string
}

/** 扫描批次扫描页列表项 - 对应 ExamScannerBatchPageItemVO */
export interface ExamScannerBatchPageItemVO {
  pageId: string
  examId: string
  scanBatchId: string
  paperInstanceId?: string
  pageSeq: number
  templatePageNo: number
  fileId?: string
  qualityStatus: QualityDecisionCode
  diagnostic?: string
  effectiveStatus: EffectiveStatusCode
  createTime?: string
  updateTime?: string
}

/** orphan 扫描事件统计查询请求 - 对应 ExamScannerBatchOrphanStatsRequest */
export interface ExamScannerBatchOrphanStatsRequest {
  examId: string
}

/** orphan 扫描事件统计响应 - 对应 ExamScannerBatchOrphanStatsResponse */
export interface ExamScannerBatchOrphanStatsVO {
  orphanPendingEventCount: number
  orphanPendingPageCount: number
}

/** orphan 扫描事件一键补救请求 - 对应 ExamScannerBatchRecoverOrphanRequest */
export interface ExamScannerBatchRecoverOrphanRequest {
  examId: string
}

/** orphan 扫描事件一键补救失败项 - 对应 ExamScannerBatchRecoverOrphanFailureItem */
export interface ExamScannerBatchRecoverOrphanFailureVO {
  scannerDeviceId: string
  scannerStationId?: string
  eventCount?: number
  pageCount?: number
  failureMessage: string
}

/** orphan 扫描事件一键补救响应 - 对应 ExamScannerBatchRecoverOrphanResponse */
export interface ExamScannerBatchRecoverOrphanVO {
  recoveredBatches: ExamScannerBatchCreateVO[]
  failedGroups?: ExamScannerBatchRecoverOrphanFailureVO[]
}

/** 扫描批次分页查询请求 - 对应 ExamScannerBatchQueryRequest */
export interface ExamScannerBatchQueryRequest extends QueryDto {
  examId: string
  scannerDeviceId?: string
  /** 扫描批次关键词（批次号、外部批次号、设备ID、工位ID模糊匹配） */
  keyword?: string
  status?: ScanBatchStatusCode
  scanStartTimeFrom?: string
  scanStartTimeTo?: string
  /**
   * 是否包含已废弃（DISCARDED）批次。
   *
   * 缺省（false / 不传）时后端列表自动屏蔽 DISCARDED 批次；教师在"扫描审计"页面
   * 显式查看废弃记录时传 true。
   */
  includeDiscarded?: boolean
}

/** 扫描批次顺序审计异常码 - 与后端 ScanBatchOrderAuditCode 完全一致 */
export type ScanBatchOrderAuditCode
  = | 'PAGE_COUNT_MISMATCH'
    | 'SEQ_GAP'
    | 'TEMPLATE_MISMATCH'
    | 'SPLIT_BOUNDARY'
    | 'LEGACY_BULK'
    | 'DUPLEX_INCOMPLETE'
    | 'INSTANCE_COUNT_MISMATCH'
    | 'DIRECT_PAGE_GROUP'

export const SCAN_BATCH_ORDER_AUDIT_CODE_LABEL: Record<ScanBatchOrderAuditCode, string> = {
  PAGE_COUNT_MISMATCH: '落库页数不一致',
  SEQ_GAP: '进纸序号不连续',
  TEMPLATE_MISMATCH: '模板页位错误',
  SPLIT_BOUNDARY: '切卷边界错误',
  LEGACY_BULK: '整批单卷误登记',
  DUPLEX_INCOMPLETE: '双面配对不完整',
  INSTANCE_COUNT_MISMATCH: '试卷实例数不一致',
  DIRECT_PAGE_GROUP: '页数不能整卷分组',
}

/** 扫描批次顺序审计异常项 */
export interface ScanBatchOrderAuditIssueVO {
  auditCode: ScanBatchOrderAuditCode
  message: string
  pageSeq?: number
  templatePageNo?: number
  paperInstanceId?: string
}

/** 扫描批次顺序审计结果 */
export interface ScanBatchOrderAuditVO {
  scanBatchId: string
  examId: string
  passed: boolean
  auditTime?: string
  pagesPerPaper?: number
  declaredPageCount?: number
  receivedPageCount?: number
  expectedPaperInstanceCount?: number
  actualPaperInstanceCount?: number
  issues: ScanBatchOrderAuditIssueVO[]
}

/** 扫描批次顺序审计查询请求 */
export interface ScanBatchOrderAuditQueryRequest {
  examId: string
  scanBatchId: string
}

/** 教师 Web 端封存扫描批次请求 */
export interface ExamScannerBatchTeacherSealRequest {
  scanBatchId: string
}

/** 扫描异常待办项契约校验。 */
export function validateScanAttentionItemContract(record: ScanAttentionItemVO): void {
  assertUserFacingText(record.id, SCAN_ATTENTION_DATA_ERROR)
  assertUserFacingText(record.examId, SCAN_ATTENTION_DATA_ERROR)
  assertUserFacingText(record.sourceId, SCAN_ATTENTION_DATA_ERROR)
  assertUserFacingText(record.sourceDisplayName, SCAN_ATTENTION_DATA_ERROR)
  assertUserFacingText(record.scanBatchDisplayName, SCAN_ATTENTION_DATA_ERROR)
  assertUserFacingText(record.pageDisplayName, SCAN_ATTENTION_DATA_ERROR)
  assertUserFacingText(record.paperDisplay?.primaryText, SCAN_ATTENTION_DATA_ERROR)
}

/** 查询扫描批次工作台 KPI。 */
export function getScannerBatchWorkbenchSummary(
  request: ExamScannerBatchWorkbenchSummaryRequest,
): Promise<ExamScannerBatchWorkbenchSummaryVO> {
  return http.post<ExamScannerBatchWorkbenchSummaryVO>(
    '/api/mark/exams/scanner-batches/workbench-summary',
    request,
  )
}

/** 查询扫描批次详情。 */
export function getScannerBatchDetail(
  request: ExamScannerBatchDetailRequest,
): Promise<ExamScannerBatchVO> {
  return http.post<ExamScannerBatchVO>('/api/mark/exams/scanner-batches/detail', request)
}

/** 分页查询扫描批次内扫描页。 */
export function pageScannerBatchPages(
  request: ExamScannerBatchPagesPageRequest,
): Promise<PageResult<ExamScannerBatchPageItemVO>> {
  return http.post<PageResult<ExamScannerBatchPageItemVO>>(
    '/api/mark/exams/scanner-batches/pages/page',
    request,
  )
}

/** 查询 orphan PENDING 扫描事件统计。 */
export function getScannerBatchOrphanStats(
  request: ExamScannerBatchOrphanStatsRequest,
): Promise<ExamScannerBatchOrphanStatsVO> {
  return http.post<ExamScannerBatchOrphanStatsVO>(
    '/api/mark/exams/scanner-batches/orphan-stats',
    request,
  )
}

/** 按设备分组一键补救 orphan PENDING 扫描事件。 */
export function recoverOrphanScanEvents(
  request: ExamScannerBatchRecoverOrphanRequest,
): Promise<ExamScannerBatchRecoverOrphanVO> {
  return http.post<ExamScannerBatchRecoverOrphanVO>(
    '/api/mark/exams/scanner-batches/recover-orphan-events',
    request,
  )
}

/** 教师在 Web 端封存已 commit 的扫描批次。 */
export function sealScanBatchByTeacher(
  request: ExamScannerBatchTeacherSealRequest,
): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/scanner-batches/seal', request)
}

/** 查询扫描批次顺序审计结果。 */
export function getScanBatchOrderAudit(
  request: ScanBatchOrderAuditQueryRequest,
): Promise<ScanBatchOrderAuditVO> {
  return http.post<ScanBatchOrderAuditVO>('/api/mark/exams/scanner-batches/order-audit', request)
}

/** 分页查询扫描批次。 */
export function pageScannerBatches(
  request: ExamScannerBatchQueryRequest,
): Promise<PageResult<ExamScannerBatchVO>> {
  return http.post<PageResult<ExamScannerBatchVO>>('/api/mark/exams/scanner-batches/page', request)
}

/** 扫描批次自动页登记重试请求 - 对应 ExamScanBatchPageRegisterRetryRequest */
export interface ExamScanBatchPageRegisterRetryRequest {
  examId: string
  scanBatchId: string
}

/** 扫描批次自动页登记重试响应 - 对应 ExamScanBatchPageRegisterRetryResponse */
export interface ExamScanBatchPageRegisterRetryResponse {
  examId?: string
  scanBatchId?: string
  batchStatus?: ScanBatchStatusCode
  pageRegisterBlocked?: boolean
  pageRegisterDiagnostic?: string
}

/** 重试页登记阻断批次的自动页登记。 */
export function retryScanBatchPageRegister(
  request: ExamScanBatchPageRegisterRetryRequest,
): Promise<ExamScanBatchPageRegisterRetryResponse> {
  return http.post<ExamScanBatchPageRegisterRetryResponse>(
    '/api/mark/exams/scanner-batches/page-register/retry',
    request,
  )
}

/** 查询扫描异常待办列表。 */
export function listScanAttentions(
  request: ScanAttentionQueryRequest,
): Promise<PageResult<ScanAttentionItemVO>> {
  return http.post<PageResult<ScanAttentionItemVO>>('/api/mark/exams/scan-attentions', request)
}
