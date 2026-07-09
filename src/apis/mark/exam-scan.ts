import type { DuplicateResolutionStatusCode } from './duplicate-resolution-status'
import type { EffectiveStatusCode } from './effective-status'
import type { ExamFileRefVO } from './exam'
import type { PaperInstanceDisplayVO } from './exam-score'
import type { GradeStatusCode } from './grade-status'
import type { ScannerKioskScanModeCode } from './scanner-kiosk'
import type { TaskStatusCode } from './task-status'
/**
 * 阅卷考试扫描批次与扫描异常 API - 对接 /api/mark/exams/scanner-batches/* 与 scan-attentions。
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type { ScanAttentionQueryGroupCode } from '@/types/enums/scan-attention-query-group-enum'
import type { ScanAttentionSourceTypeCode } from '@/types/enums/scan-attention-source-type-enum'
import {
  ALL_SCAN_ATTENTION_SOURCE_TYPE_CODES,
  ScanAttentionSourceTypeDescription,
} from '@/types/enums/scan-attention-source-type-enum'
import type { ScanBatchOrderAuditCode } from '@/types/enums/scan-batch-order-audit-enum'
import type { ScanBatchWorkbenchBindingStatusCode } from '@/types/enums/scan-batch-workbench-binding-status-enum'
import type { ScanBatchWorkbenchPageStatusFilterCode } from '@/types/enums/scan-batch-workbench-page-status-filter-enum'
import type { ScanBatchWorkbenchRegisterStatusCode } from '@/types/enums/scan-batch-workbench-register-status-enum'
import type { ScanBatchWorkbenchRosterMatchStatusCode } from '@/types/enums/scan-batch-workbench-roster-match-status-enum'
import type { ScanBatchWorkbenchTopActionCode } from '@/types/enums/scan-batch-workbench-top-action-enum'
import http from '@/config/axios'
import {
  ALL_QUALITY_DECISION_CODES,
  QualityDecisionCode,
  QualityDecisionDescription,
} from '@/types/enums/quality-decision-enum'
import {
  ALL_SCAN_ATTENTION_TYPE_CODES,
  ScanAttentionTypeCode,
  ScanAttentionTypeDescription,
} from '@/types/enums/scan-attention-type-enum'
import {
  ALL_SCAN_BATCH_STATUS_CODES,
  ScanBatchStatusCode,
  ScanBatchStatusDescription,
} from '@/types/enums/scan-batch-status-enum'
import type { ExamScannerScanConfigVO } from '@/apis/mark/scanner-kiosk'
import type { PageRegisterStateCode } from '@/types/enums/page-register-state-enum'

export {
  ALL_QUALITY_DECISION_CODES,
  QualityDecisionCode,
  QualityDecisionDescription,
} from '@/types/enums/quality-decision-enum'

export {
  ALL_SCAN_ATTENTION_QUERY_GROUP_CODES,
  ScanAttentionQueryGroupCode,
  ScanAttentionQueryGroupDescription,
} from '@/types/enums/scan-attention-query-group-enum'

export {
  ALL_SCAN_ATTENTION_SOURCE_TYPE_CODES,
  ScanAttentionSourceTypeCode,
  ScanAttentionSourceTypeDescription,
} from '@/types/enums/scan-attention-source-type-enum'

export {
  ALL_SCAN_ATTENTION_TYPE_CODES,
  ScanAttentionTypeCode,
  ScanAttentionTypeDescription,
} from '@/types/enums/scan-attention-type-enum'

/** 扫描页质量判定徽标色调 */
export const QUALITY_DECISION_TONE: Record<QualityDecisionCode, BadgeTone> = {
  [QualityDecisionCode.PASS]: 'green',
  [QualityDecisionCode.BLOCKED]: 'red',
}

export const QUALITY_DECISION_OPTIONS: Array<{ label: string; value: QualityDecisionCode }> =
  ALL_QUALITY_DECISION_CODES.map((value) => ({
    value,
    label: QualityDecisionDescription[value],
  }))

/** 扫描异常类型徽标色调 */
export const SCAN_ATTENTION_TYPE_TONE: Record<ScanAttentionTypeCode, BadgeTone> = {
  [ScanAttentionTypeCode.QUALITY_BLOCK]: 'red',
  [ScanAttentionTypeCode.PROCESSING_BLOCK]: 'orange',
  [ScanAttentionTypeCode.DUPLICATE_PENDING]: 'purple',
  [ScanAttentionTypeCode.RECOGNITION_REVIEW]: 'blue',
  [ScanAttentionTypeCode.BINDING_CONFLICT]: 'gray',
  [ScanAttentionTypeCode.MISSING_CANDIDATE_ROSTER]: 'orange',
}

export const SCAN_ATTENTION_TYPE_OPTIONS: Array<{ label: string; value: ScanAttentionTypeCode }> =
  ALL_SCAN_ATTENTION_TYPE_CODES.map((value) => ({
    value,
    label: ScanAttentionTypeDescription[value],
  }))

/** 扫描异常来源类型文案 - 与后端 ScanAttentionSourceType 展示约定一致 */
export const SCAN_ATTENTION_SOURCE_TYPE_OPTIONS: Array<{
  label: string
  value: ScanAttentionSourceTypeCode
}> = ALL_SCAN_ATTENTION_SOURCE_TYPE_CODES.map((value) => ({
  value,
  label: ScanAttentionSourceTypeDescription[value],
}))

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
export interface ScanAttentionQueryRequest extends QueryDto {
  examId: string
  scanBatchId?: string
  paperInstanceId?: string
  attentionType?: ScanAttentionTypeCode
  queryGroup?: ScanAttentionQueryGroupCode
}

/** 扫描异常待办项 - 对应 ScanAttentionItemResponse */
export interface ScanAttentionItemResponse {
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
  layoutQuestionId?: string
  questionDisplayName: string
  qualityDecision: QualityDecisionCode
  processingStatus: TaskStatusCode
  duplicateResolutionStatus: DuplicateResolutionStatusCode
  gradeStatus: GradeStatusCode
  diagnostic?: string
  updateTime?: string
}

export {
  ALL_SCAN_BATCH_ORDER_AUDIT_CODES,
  ScanBatchOrderAuditCode,
  ScanBatchOrderAuditDescription,
} from '@/types/enums/scan-batch-order-audit-enum'

export {
  ALL_SCAN_BATCH_STATUS_CODES,
  ScanBatchStatusCode,
  ScanBatchStatusDescription,
} from '@/types/enums/scan-batch-status-enum'

/** 扫描批次状态 BadgeTone 映射 */
export const SCAN_BATCH_STATUS_TONE: Record<ScanBatchStatusCode, BadgeTone> = {
  [ScanBatchStatusCode.IN_PROGRESS]: 'blue',
  [ScanBatchStatusCode.RECEIVED]: 'blue',
  [ScanBatchStatusCode.BLOCKED]: 'red',
  [ScanBatchStatusCode.BOUND]: 'green',
  [ScanBatchStatusCode.COMPLETED]: 'green',
  [ScanBatchStatusCode.DISCARDED]: 'gray',
}

export const SCAN_BATCH_STATUS_OPTIONS: Array<{ value: ScanBatchStatusCode; label: string }> =
  ALL_SCAN_BATCH_STATUS_CODES.map((value) => ({
    value,
    label: ScanBatchStatusDescription[value],
  }))

/** 扫描监控主链路状态说明（批次入账 → 绑定 → 完成；异常与重复须逐条处置） */
export const SCAN_MONITOR_FLOW_HINT = `${ScanBatchStatusDescription[ScanBatchStatusCode.IN_PROGRESS]} → ${ScanBatchStatusDescription[ScanBatchStatusCode.RECEIVED]} → ${ScanBatchStatusDescription[ScanBatchStatusCode.BOUND]} → ${ScanBatchStatusDescription[ScanBatchStatusCode.COMPLETED]} · 异常与重复须逐条处置`

/** 扫描批次视图 - 对应 ExamScannerBatchResponse */
export interface ExamScannerBatchResponse {
  /** 扫描批次ID */
  scanBatchId: string
  examId: string
  /** 扫描录入模式 */
  scanMode?: ScannerKioskScanModeCode
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
  /** 是否存在待处置 collate attention */
  orderAuditAttentionPending?: boolean
  /** 批次扫描参数快照（含 DPI） */
  scanConfig?: ExamScannerScanConfigVO
  /** 批次内已绑定答卷份数 */
  boundPaperCount?: number
  /** 批次操作员用户 ID */
  operatorUserId?: string
  /** 批次操作员展示名 */
  operatorDisplayName?: string
  /** 页登记状态；后端未算出时为 null（A3） */
  pageRegisterState?: PageRegisterStateCode | null
}

/** 扫描批次创建响应 - 对应 ExamScannerBatchCreateResponse（orphan 补救等场景复用） */
export interface ExamScannerBatchCreateResponse {
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
export interface ExamScannerBatchWorkbenchSummaryResponse {
  batchTotal: number
  inProgressCount: number
  blockedCount: number
  orphanPendingEventCount: number
  orphanPendingPageCount: number
  attentionCount: number
  /** 当前考试 ACTIVE 模板是否为扫描推导模板 */
  scanDerivedTemplateActive?: boolean
  activePaperTemplateName?: string
  activePaperTemplateTotalPages?: number
  /** 整卷作答且尚无 ACTIVE 模板 */
  fullPaperFirstScanTemplatePending?: boolean
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
export interface ExamScannerBatchOrphanStatsResponse {
  orphanPendingEventCount: number
  orphanPendingPageCount: number
}

/** orphan 扫描事件一键补救请求 - 对应 ExamScannerBatchRecoverOrphanRequest */
export interface ExamScannerBatchRecoverOrphanRequest {
  examId: string
}

/** orphan 扫描事件一键补救失败项 - 对应 ExamScannerBatchRecoverOrphanFailureItem */
export interface ExamScannerBatchRecoverOrphanFailureItem {
  scannerDeviceId: string
  scannerStationId?: string
  eventCount?: number
  pageCount?: number
  failureMessage: string
}

/** orphan 扫描事件一键补救响应 - 对应 ExamScannerBatchRecoverOrphanResponse */
export interface ExamScannerBatchRecoverOrphanResponse {
  recoveredBatches: ExamScannerBatchCreateResponse[]
  failedGroups?: ExamScannerBatchRecoverOrphanFailureItem[]
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

/** 扫描批次顺序审计异常项 */
export interface ScanBatchOrderAuditIssueResponse {
  auditCode: ScanBatchOrderAuditCode
  message: string
  pageSeq?: number
  templatePageNo?: number
  paperInstanceId?: string
}

/** 扫描批次顺序审计结果 */
export interface ScanBatchOrderAuditResponse {
  scanBatchId: string
  examId: string
  passed: boolean
  auditTime?: string
  pagesPerPaper?: number
  declaredPageCount?: number
  receivedPageCount?: number
  expectedPaperInstanceCount?: number
  actualPaperInstanceCount?: number
  issues: ScanBatchOrderAuditIssueResponse[]
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

/** 查询扫描批次工作台 KPI。 */
export function getScannerBatchWorkbenchSummary(
  request: ExamScannerBatchWorkbenchSummaryRequest,
): Promise<ExamScannerBatchWorkbenchSummaryResponse> {
  return http.post<ExamScannerBatchWorkbenchSummaryResponse>(
    '/api/mark/exams/scanner-batches/workbench-summary',
    request,
  )
}

/** 查询扫描批次详情。 */
export function getScannerBatchDetail(
  request: ExamScannerBatchDetailRequest,
): Promise<ExamScannerBatchResponse> {
  return http.post<ExamScannerBatchResponse>('/api/mark/exams/scanner-batches/detail', request)
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
): Promise<ExamScannerBatchOrphanStatsResponse> {
  return http.post<ExamScannerBatchOrphanStatsResponse>(
    '/api/mark/exams/scanner-batches/orphan-stats',
    request,
  )
}

/** 按设备分组一键补救 orphan PENDING 扫描事件。 */
export function recoverOrphanScanEvents(
  request: ExamScannerBatchRecoverOrphanRequest,
): Promise<ExamScannerBatchRecoverOrphanResponse> {
  return http.post<ExamScannerBatchRecoverOrphanResponse>(
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
): Promise<ScanBatchOrderAuditResponse> {
  return http.post<ScanBatchOrderAuditResponse>(
    '/api/mark/exams/scanner-batches/order-audit',
    request,
  )
}

/** 忽略 D2 collate attention 请求 */
export interface ScanBatchCollateAttentionDismissRequest {
  examId: string
  scanBatchId: string
}

/** 忽略 PARTIAL_TAIL / DIRECT_PAGE_GROUP collate attention。 */
export function dismissScanBatchCollateAttention(
  request: ScanBatchCollateAttentionDismissRequest,
): Promise<boolean> {
  return http.post<boolean>(
    '/api/mark/exams/scanner-batches/order-audit/dismiss-attention',
    request,
  )
}

/** 分页查询扫描批次。 */
export function pageScannerBatches(
  request: ExamScannerBatchQueryRequest,
): Promise<PageResult<ExamScannerBatchResponse>> {
  return http.post<PageResult<ExamScannerBatchResponse>>(
    '/api/mark/exams/scanner-batches/page',
    request,
  )
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
  pageRegisterPending?: boolean
  pageRegisterDiagnostic?: string
  retriedCount?: number
  skippedCount?: number
  sourceFileCount?: number
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

export {
  ALL_SCAN_BATCH_WORKBENCH_BINDING_STATUS_CODES,
  ScanBatchWorkbenchBindingStatusCode,
  ScanBatchWorkbenchBindingStatusDescription,
} from '@/types/enums/scan-batch-workbench-binding-status-enum'

export {
  ALL_SCAN_BATCH_WORKBENCH_PAGE_STATUS_FILTER_CODES,
  ScanBatchWorkbenchPageStatusFilterCode,
  ScanBatchWorkbenchPageStatusFilterDescription,
} from '@/types/enums/scan-batch-workbench-page-status-filter-enum'

export {
  ALL_SCAN_BATCH_WORKBENCH_REGISTER_STATUS_CODES,
  ScanBatchWorkbenchRegisterStatusCode,
  ScanBatchWorkbenchRegisterStatusDescription,
} from '@/types/enums/scan-batch-workbench-register-status-enum'

export {
  ALL_SCAN_BATCH_WORKBENCH_ROSTER_MATCH_STATUS_CODES,
  ScanBatchWorkbenchRosterMatchStatusCode,
  ScanBatchWorkbenchRosterMatchStatusDescription,
  ScanBatchWorkbenchRosterMatchStatusTone,
} from '@/types/enums/scan-batch-workbench-roster-match-status-enum'

export {
  ALL_SCAN_BATCH_WORKBENCH_TOP_ACTION_CODES,
  ScanBatchWorkbenchTopActionCode,
  ScanBatchWorkbenchTopActionDescription,
} from '@/types/enums/scan-batch-workbench-top-action-enum'

/** 扫描批次工作台聚合查询请求 - 对应 ExamScannerBatchWorkbenchRequest */
export interface ExamScannerBatchWorkbenchRequest {
  examId: string
  scanBatchId: string
}

/** 扫描批次工作台页轨行 - 对应 ExamScannerBatchWorkbenchPageVO */
export interface ExamScannerBatchWorkbenchPageVO {
  pageKey: string
  registerStatus: ScanBatchWorkbenchRegisterStatusCode
  bindingStatus: ScanBatchWorkbenchBindingStatusCode
  hasException?: boolean
  fileOrder: number
  pageSeq?: number
  templatePageNo?: number
  pageId?: string
  fileId?: string
  previewUrl?: string
  fileSizeBytes?: number
  fileName?: string
  identitySliceFileId?: string
  identitySlicePreviewUrl?: string
  qualityStatus?: QualityDecisionCode
  effectiveStatus?: EffectiveStatusCode
  diagnostic?: string
  paperInstanceId?: string
  candidateName?: string
  studentNo?: string
  classId?: string
  className?: string
  ocrStudentNo?: string
  ocrClassId?: string
  ocrClassName?: string
  ocrStudentName?: string
  recognitionTaskStatus?: TaskStatusCode
  rosterMatchStatus?: ScanBatchWorkbenchRosterMatchStatusCode
  rosterMatchDiagnostic?: string
  attentionCount?: number
}

/** 扫描批次工作台聚合响应 - 对应 ExamScannerBatchWorkbenchResponse */
export interface ExamScannerBatchWorkbenchResponse {
  batch: ExamScannerBatchResponse
  signalBandMessage?: string
  signalBandTone?: string
  /** 影像账本扫描进度（与监控看板同源，B5/T18） */
  progressPercent?: number
  progressDisplay?: string
  /** 批次内页登记进度（已登记页 / 已收件原件） */
  registrationProgressPercent?: number
  sourceReceivedCount?: number
  pageRegisteredCount?: number
  paperBoundCount?: number
  topActions?: ScanBatchWorkbenchTopActionCode[]
  initialPageKey?: string
  initialPageItems?: ExamScannerBatchWorkbenchPageVO[]
}

/** 页轨游标查询请求 - 对应 ScannerBatchWorkbenchPageQueryRequest */
export interface ScannerBatchWorkbenchPageQueryRequest {
  examId: string
  scanBatchId: string
  pageStatusFilter?: ScanBatchWorkbenchPageStatusFilterCode
  keyword?: string
  pageSize?: number
  /** 不透明游标，仅透传 nextCursor */
  cursor?: string
}

/** 页轨游标查询响应 - 对应 ScannerBatchWorkbenchPageQueryResponse */
export interface ScannerBatchWorkbenchPageQueryResponse {
  items: ExamScannerBatchWorkbenchPageVO[]
  nextCursor?: string | null
  totalCount?: number
  pendingCount?: number
  registeredCount?: number
  exceptionCount?: number
}

/** 单页 Inspector 查询请求 - 对应 ExamScannerBatchPageInspectorRequest */
export interface ExamScannerBatchPageInspectorRequest {
  examId: string
  scanBatchId: string
  pageKey: string
}

/** 单页 Inspector 响应 - 对应 ExamScannerBatchPageInspectorVO */
export interface ExamScannerBatchPageInspectorVO {
  page: ExamScannerBatchWorkbenchPageVO
  inspectorHint?: string
  exceptionSummary?: string
}

const scanBatchWorkbenchMockEnabled =
  import.meta.env.DEV && import.meta.env.VITE_SCAN_BATCH_WORKBENCH_MOCK === 'true'

/** 查询扫描批次工作台聚合。 */
export async function getScannerBatchWorkbench(
  request: ExamScannerBatchWorkbenchRequest,
): Promise<ExamScannerBatchWorkbenchResponse> {
  if (scanBatchWorkbenchMockEnabled) {
    const { mockGetScannerBatchWorkbench } = await import('@/mocks/scan-batch-workbench-mock')
    return mockGetScannerBatchWorkbench(request)
  }
  return http.post<ExamScannerBatchWorkbenchResponse>(
    '/api/mark/exams/scanner-batches/workbench',
    request,
  )
}

/** 游标分页查询扫描批次页轨。 */
export async function pageScannerBatchWorkbenchPages(
  request: ScannerBatchWorkbenchPageQueryRequest,
): Promise<ScannerBatchWorkbenchPageQueryResponse> {
  if (scanBatchWorkbenchMockEnabled) {
    const { mockPageScannerBatchWorkbenchPages } = await import('@/mocks/scan-batch-workbench-mock')
    return mockPageScannerBatchWorkbenchPages(request)
  }
  return http.post<ScannerBatchWorkbenchPageQueryResponse>(
    '/api/mark/exams/scanner-batches/workbench/pages',
    request,
  )
}

/** 查询扫描批次单页 Inspector。 */
export async function getScannerBatchPageInspector(
  request: ExamScannerBatchPageInspectorRequest,
): Promise<ExamScannerBatchPageInspectorVO> {
  if (scanBatchWorkbenchMockEnabled) {
    const { mockGetScannerBatchPageInspector } = await import('@/mocks/scan-batch-workbench-mock')
    return mockGetScannerBatchPageInspector(request)
  }
  return http.post<ExamScannerBatchPageInspectorVO>(
    '/api/mark/exams/scanner-batches/workbench/page-inspector',
    request,
  )
}

/** 查询扫描异常待办列表。 */
export function listScanAttentions(
  request: ScanAttentionQueryRequest,
): Promise<PageResult<ScanAttentionItemResponse>> {
  return http.post<PageResult<ScanAttentionItemResponse>>(
    '/api/mark/exams/scan-attentions',
    request,
  )
}
