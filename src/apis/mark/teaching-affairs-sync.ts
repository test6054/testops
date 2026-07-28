/**
 * 教务系统/LMS 集成 API - 对接 edu-mark 模块 TeachingAffairsSyncController
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type { ExamKindCode } from '@/types/enums/exam-kind-enum'
import type { ExternalSystemTypeCode } from '@/types/enums/external-system-type-enum'
import http from '@/config/axios'
import {
  ALL_EXTERNAL_SYSTEM_TYPE_CODES,
  ExternalSystemTypeDescription,
} from '@/types/enums/external-system-type-enum'
import {
  ALL_PASSBACK_STATUS_CODES,
  PassbackStatusCode,
  PassbackStatusDescription,
} from '@/types/enums/passback-status-enum'
import { ReconcileStatusCode } from '@/types/enums/reconcile-status-enum'
import {
  ALL_SYNC_TASK_STATUS_CODES,
  SyncTaskStatusCode,
  SyncTaskStatusDescription,
} from '@/types/enums/sync-task-status-enum'
import {
  ALL_TEACHING_AFFAIRS_SYNC_TYPE_CODES,
  TeachingAffairsSyncTypeCode,
  TeachingAffairsSyncTypeDescription,
} from '@/types/enums/teaching-affairs-sync-type-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_EXTERNAL_SYSTEM_TYPE_CODES,
  ExternalSystemTypeCode,
  ExternalSystemTypeDescription,
} from '@/types/enums/external-system-type-enum'
export {
  ALL_PASSBACK_STATUS_CODES,
  PassbackStatusCode,
  PassbackStatusDescription,
} from '@/types/enums/passback-status-enum'
export {
  ALL_RECONCILE_STATUS_CODES,
  ReconcileStatusCode,
  ReconcileStatusDescription,
} from '@/types/enums/reconcile-status-enum'
export {
  ALL_SYNC_TASK_STATUS_CODES,
  SyncTaskStatusCode,
  SyncTaskStatusDescription,
} from '@/types/enums/sync-task-status-enum'
export {
  ALL_TEACHING_AFFAIRS_SYNC_TYPE_CODES,
  TeachingAffairsSyncTypeCode,
  TeachingAffairsSyncTypeDescription,
} from '@/types/enums/teaching-affairs-sync-type-enum'

/** 当前后端 createSyncTask 已开放的同步类型（与 TeachingAffairsSyncServiceImpl 一致） */
export const CREATABLE_SYNC_TYPE_OPTIONS: Array<{
  value: TeachingAffairsSyncTypeCode
  label: string
}> = [
  TeachingAffairsSyncTypeCode.GRADE_EXPORT,
  TeachingAffairsSyncTypeCode.GRADE_CORRECTION,
  TeachingAffairsSyncTypeCode.GRADE_WITHDRAW,
].map((value) => ({
  value,
  label: strictEnumLabel(
    TeachingAffairsSyncTypeDescription,
    value,
    '教务同步类型',
  ),
}))

export const SYNC_TASK_STATUS_TONE: Record<SyncTaskStatusCode, BadgeTone> = {
  [SyncTaskStatusCode.PENDING]: 'gray',
  [SyncTaskStatusCode.SYNCING]: 'blue',
  [SyncTaskStatusCode.SUCCESS]: 'green',
  [SyncTaskStatusCode.PARTIAL_SUCCESS]: 'orange',
  [SyncTaskStatusCode.FAILED]: 'red',
  [SyncTaskStatusCode.CANCELLED]: 'gray',
}

export const SYNC_TASK_MAIN_FLOW_STATUSES: SyncTaskStatusCode[] = [
  SyncTaskStatusCode.PENDING,
  SyncTaskStatusCode.SYNCING,
  SyncTaskStatusCode.SUCCESS,
]

export const SYNC_TASK_BRANCH_STATUS_DESCRIPTIONS: string[] = [
  strictEnumLabel(SyncTaskStatusDescription, SyncTaskStatusCode.PARTIAL_SUCCESS, '同步任务状态'),
  strictEnumLabel(SyncTaskStatusDescription, SyncTaskStatusCode.FAILED, '同步任务状态'),
  strictEnumLabel(SyncTaskStatusDescription, SyncTaskStatusCode.CANCELLED, '同步任务状态'),
]

export const SYNC_TASK_FLOW_HINT = `${SYNC_TASK_MAIN_FLOW_STATUSES.map(
  (status) => strictEnumLabel(SyncTaskStatusDescription, status, '同步任务状态'),
).join(' → ')} / ${SYNC_TASK_BRANCH_STATUS_DESCRIPTIONS.join(' / ')}`

/** MVR-205：成绩回写执行前置提示（按同步类型区分） */
export const GRADE_EXPORT_PASSBACK_PRECONDITION_HINT
  = '导出/更正回写仅含已发布正式分；撤回回写仅含已撤回且曾成功对接教务的成绩。终分撤回/更正/重发会自动入队对应任务'

export const PASSBACK_STATUS_TONE: Record<PassbackStatusCode, BadgeTone> = {
  [PassbackStatusCode.PENDING]: 'gray',
  [PassbackStatusCode.SENT]: 'blue',
  [PassbackStatusCode.SUCCESS]: 'green',
  [PassbackStatusCode.FAILED]: 'red',
  [PassbackStatusCode.WITHDRAWN]: 'orange',
}

export const SYNC_TASK_STATUS_OPTIONS: Array<{ value: SyncTaskStatusCode, label: string }>
  = ALL_SYNC_TASK_STATUS_CODES.map((value) => ({
    value,
    label: strictEnumLabel(SyncTaskStatusDescription, value, '同步任务状态'),
  }))

export const PASSBACK_STATUS_OPTIONS: Array<{ value: PassbackStatusCode, label: string }>
  = ALL_PASSBACK_STATUS_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PassbackStatusDescription, value, '回写状态'),
  }))

export const RECONCILE_STATUS_TONE: Record<ReconcileStatusCode, BadgeTone> = {
  [ReconcileStatusCode.MATCHED]: 'green',
  [ReconcileStatusCode.MISMATCHED]: 'red',
  [ReconcileStatusCode.PENDING_RECONCILE]: 'orange',
}

export const EXTERNAL_SYSTEM_TYPE_OPTIONS: Array<{ value: ExternalSystemTypeCode, label: string }>
  = ALL_EXTERNAL_SYSTEM_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(ExternalSystemTypeDescription, value, '外部系统类型'),
  }))

export const TEACHING_AFFAIRS_SYNC_TYPE_OPTIONS: Array<{
  value: TeachingAffairsSyncTypeCode
  label: string
}> = ALL_TEACHING_AFFAIRS_SYNC_TYPE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(TeachingAffairsSyncTypeDescription, value, '教务同步类型'),
}))

// ─── DTO ─────────────────────────────────

/** 同步任务创建请求 - 对应 SyncTaskCreateRequest */
export interface SyncTaskCreateRequest {
  examId: string
  externalSystemType: ExternalSystemTypeCode
  /** GRADE_EXPORT / GRADE_CORRECTION / GRADE_WITHDRAW */
  syncType: TeachingAffairsSyncTypeCode
  /** 外部课程编号，成绩回写任务必填 */
  externalCourseId: string
  externalLineItemId?: string
}

/** 回写记录查询请求 - 对应 PassbackRecordQueryRequest（2026-05-14 GET→POST 整改） */
export interface PassbackRecordQueryRequest extends QueryDto {
  examId: string
  syncTaskId?: string
  passbackStatus?: PassbackStatusCode
}

/** 同步任务 VO - 对应 ExamTeachingAffairsSyncTask */
export interface ExamTeachingAffairsSyncTask {
  id?: string
  tenantId?: string
  examId: string
  externalSystemType: ExternalSystemTypeCode
  syncType: TeachingAffairsSyncTypeCode
  externalCourseId?: string
  externalLineItemId?: string
  taskStatus: SyncTaskStatusCode
  lastSyncTime?: string
  lastErrorCode?: string
  lastErrorMessage?: string
  retryCount: number
  maxRetryCount: number
  createTime?: string
  updateTime?: string
}

/** 回写进度 VO - 对应 PassbackProgressResponse */
export interface PassbackProgressResponse {
  syncTaskId: string
  totalCount: number
  pendingCount: number
  sentCount: number
  successCount: number
  failedCount: number
  withdrawnCount: number
}

/** 对账结果 VO - 对应 PassbackReconcileResponse */
export interface PassbackReconcileResponse {
  syncTaskId: string
  taskStatus: SyncTaskStatusCode
  matchedCount: number
  mismatchedCount: number
  missingExternalScoreCount: number
  failedPassbackCount: number
  expectedCoverageCount: number
  passbackRecordCount: number
  missingCoverageCount: number
  orphanPassbackCount: number
  coverageComplete: boolean
  reconcileClosed: boolean
  missingCoverageStudentUserIds?: string[]
  summaryMessage: string
}

/** 回写记录 VO - 对应 ExamGradebookPassbackRecord */
export interface PassbackRecordResponse {
  id?: string
  tenantId?: string
  examId: string
  syncTaskId?: string
  studentUserId?: string
  studentNo?: string
  studentName?: string
  finalScoreId?: string
  /** 考试性质快照：正考/补考/重修/重考/缓考 */
  examKind: ExamKindCode
  /** 原正考考试 ID；正考为空 */
  sourceExamId?: string
  localScore?: number
  externalResultId?: string
  passbackStatus: PassbackStatusCode
  reconcileStatus: ReconcileStatusCode
  externalScore?: number
  errorCode?: string
  errorMessage?: string
  passbackTime?: string
  reconcileTime?: string
}

// ─── API ─────────────────────────────────

/**
 * 创建同步任务
 * POST /api/exam/teaching-affairs/sync-task/create
 */
export function createSyncTask(request: SyncTaskCreateRequest): Promise<ExamTeachingAffairsSyncTask> {
  return http.post<ExamTeachingAffairsSyncTask>('/api/exam/teaching-affairs/sync-task/create', request)
}

/** 同步任务分页查询请求 - 对应 SyncTaskPageRequest */
export interface SyncTaskPageRequest extends QueryDto {
  examId: string
  taskStatus?: SyncTaskStatusCode
}

/**
 * 分页查询同步任务
 * POST /api/exam/teaching-affairs/sync-task/page
 */
/** 教务同步任务分页响应 - 对应 TeachingAffairsSyncTaskPageResponse */
export interface TeachingAffairsSyncTaskPageResponse {
  /** MVR-326：与 BE isExamOwner / requireExamOwnerPermission 同源 */
  canManageOwnerTeachingAffairsWrites?: boolean
  list: ExamTeachingAffairsSyncTask[]
  total: number
  pageNum?: number
  pageSize?: number
  pages?: number
}

export function pageSyncTasks(
  request: SyncTaskPageRequest,
  config?: import('@/config/axios/types').ExtendedAxiosRequestConfig,
): Promise<TeachingAffairsSyncTaskPageResponse> {
  return http.post<TeachingAffairsSyncTaskPageResponse>(
    '/api/exam/teaching-affairs/sync-task/page',
    request,
    config,
  )
}

export function executeGradePassback(syncTaskId: string): Promise<void> {
  return http.post<void>('/api/exam/teaching-affairs/sync-task/execute', { id: syncTaskId })
}

export function retrySyncTask(syncTaskId: string): Promise<void> {
  return http.post<void>('/api/exam/teaching-affairs/sync-task/retry', { id: syncTaskId })
}

export function cancelSyncTask(syncTaskId: string): Promise<void> {
  return http.post<void>('/api/exam/teaching-affairs/sync-task/cancel', { id: syncTaskId })
}

/**
 * 查询回写记录列表（2026-05-14 已 GET→POST 整改）
 * POST /api/exam/teaching-affairs/passback/list
 */
export function listPassbackRecords(
  request: PassbackRecordQueryRequest,
  config?: import('@/config/axios/types').ExtendedAxiosRequestConfig,
): Promise<PageResult<PassbackRecordResponse>> {
  return http.post<PageResult<PassbackRecordResponse>>(
    '/api/exam/teaching-affairs/passback/list',
    request,
    config,
  )
}

/**
 * 执行对账（分值匹配 + 应报覆盖完整性）
 * POST /api/exam/teaching-affairs/passback/reconcile
 */
export function reconcilePassback(syncTaskId: string): Promise<PassbackReconcileResponse> {
  return http.post<PassbackReconcileResponse>('/api/exam/teaching-affairs/passback/reconcile', { id: syncTaskId })
}

/** 标记回写已投递请求 - 对应 PassbackMarkSentRequest */
export interface PassbackMarkSentRequest {
  syncTaskId: string
  passbackRecordIds: string[]
}

/**
 * 主考将 PENDING 回写标记为 SENT
 * POST /api/exam/teaching-affairs/passback/mark-sent
 */
export function markPassbackSent(request: PassbackMarkSentRequest): Promise<number> {
  return http.post<number>('/api/exam/teaching-affairs/passback/mark-sent', request)
}

/**
 * 主考将卡住的 SENT 回写置为 FAILED
 * POST /api/exam/teaching-affairs/passback/fail-sent-timeout
 */
export function failSentPassbackTimeout(passbackRecordId: string): Promise<void> {
  return http.post<void>('/api/exam/teaching-affairs/passback/fail-sent-timeout', {
    id: passbackRecordId,
  })
}

export function getPassbackProgress(syncTaskId: string): Promise<PassbackProgressResponse> {
  return http.post<PassbackProgressResponse>('/api/exam/teaching-affairs/passback/progress', {
    id: syncTaskId,
  })
}

/** P1-17：已发送待回执提示（超过 24 小时自动置失败） */
export const SENT_PASSBACK_TIMEOUT_HINT
  = '已发送记录等待教务回执；超过 24 小时未回执将自动置失败并解锁重试。期末报送紧急时可手工「超时置失败」。'
