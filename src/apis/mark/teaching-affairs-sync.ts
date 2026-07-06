/**
 * 教务系统/LMS 集成 API - 对接 edu-mark 模块 TeachingAffairsSyncController
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
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
  {
    value: TeachingAffairsSyncTypeCode.GRADE_EXPORT,
    label: TeachingAffairsSyncTypeDescription[TeachingAffairsSyncTypeCode.GRADE_EXPORT],
  },
]

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
  SyncTaskStatusDescription[SyncTaskStatusCode.PARTIAL_SUCCESS],
  SyncTaskStatusDescription[SyncTaskStatusCode.FAILED],
  SyncTaskStatusDescription[SyncTaskStatusCode.CANCELLED],
]

export const SYNC_TASK_FLOW_HINT = `${SYNC_TASK_MAIN_FLOW_STATUSES.map(
  (status) => SyncTaskStatusDescription[status],
).join(' → ')} / ${SYNC_TASK_BRANCH_STATUS_DESCRIPTIONS.join(' / ')}`

/** 归档卷教务成绩完成同步门禁说明（线下/纯归档卷） */
export const ARCHIVE_TEACHING_AFFAIRS_SCORE_COMPLETION_HINT
  = '提交外部同步单号 → 教务成绩完成回写 → 与卷内成绩门禁一并满足后可提交归档'

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
    label: SyncTaskStatusDescription[value],
  }))

export const PASSBACK_STATUS_OPTIONS: Array<{ value: PassbackStatusCode, label: string }>
  = ALL_PASSBACK_STATUS_CODES.map((value) => ({
    value,
    label: PassbackStatusDescription[value],
  }))

export const RECONCILE_STATUS_TONE: Record<ReconcileStatusCode, BadgeTone> = {
  [ReconcileStatusCode.MATCHED]: 'green',
  [ReconcileStatusCode.MISMATCHED]: 'red',
  [ReconcileStatusCode.PENDING_RECONCILE]: 'orange',
}

export const EXTERNAL_SYSTEM_TYPE_OPTIONS: Array<{ value: ExternalSystemTypeCode, label: string }>
  = ALL_EXTERNAL_SYSTEM_TYPE_CODES.map((value) => ({
    value,
    label: ExternalSystemTypeDescription[value],
  }))

export const TEACHING_AFFAIRS_SYNC_TYPE_OPTIONS: Array<{
  value: TeachingAffairsSyncTypeCode
  label: string
}> = ALL_TEACHING_AFFAIRS_SYNC_TYPE_CODES.map((value) => ({
  value,
  label: TeachingAffairsSyncTypeDescription[value],
}))

// ─── DTO ─────────────────────────────────

/** 同步任务创建请求 - 对应 SyncTaskCreateRequest */
export interface SyncTaskCreateRequest {
  examId: string
  externalSystemType: ExternalSystemTypeCode
  /** 后端目前仅闭合 GRADE_EXPORT 路径 */
  syncType: TeachingAffairsSyncTypeCode
  externalCourseId?: string
  externalLineItemId?: string
}

/** 回写记录查询请求 - 对应 PassbackRecordQueryRequest（2026-05-14 GET→POST 整改） */
export interface PassbackRecordQueryRequest extends QueryDto {
  examId: string
  syncTaskId?: string
  passbackStatus?: PassbackStatusCode
}

/** 同步任务 VO - 对应 ExamTeachingAffairsSyncTask */
export interface SyncTaskVO {
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
export interface PassbackProgressVO {
  syncTaskId: string
  totalCount: number
  pendingCount: number
  sentCount: number
  successCount: number
  failedCount: number
  withdrawnCount: number
}

/** 回写记录 VO - 对应 ExamGradebookPassbackRecord */
export interface PassbackRecordVO {
  id?: string
  tenantId?: string
  examId: string
  syncTaskId?: string
  studentUserId?: string
  studentNo?: string
  studentName?: string
  finalScoreId?: string
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
export function createSyncTask(request: SyncTaskCreateRequest): Promise<SyncTaskVO> {
  return http.post<SyncTaskVO>('/api/exam/teaching-affairs/sync-task/create', request)
}

export interface SyncTaskListQueryRequest {
  examId: string
  taskStatus?: SyncTaskStatusCode
}

export function listSyncTasks(request: SyncTaskListQueryRequest): Promise<SyncTaskVO[]> {
  return http.post<SyncTaskVO[]>('/api/exam/teaching-affairs/sync-task/list', request)
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
): Promise<PageResult<PassbackRecordVO>> {
  return http.post<PageResult<PassbackRecordVO>>(
    '/api/exam/teaching-affairs/passback/list',
    request,
  )
}

/**
 * 执行对账（本地分 vs 外部分）
 * POST /api/exam/teaching-affairs/passback/reconcile
 */
export function reconcilePassback(syncTaskId: string): Promise<void> {
  return http.post<void>('/api/exam/teaching-affairs/passback/reconcile', { id: syncTaskId })
}

export function getPassbackProgress(syncTaskId: string): Promise<PassbackProgressVO> {
  return http.post<PassbackProgressVO>('/api/exam/teaching-affairs/passback/progress', {
    id: syncTaskId,
  })
}
