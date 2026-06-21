/**
 * 教务系统/LMS 集成 API - 对接 edu-mark 模块 TeachingAffairsSyncController
 *
 * 业务能力（按照 docs/17 §L4）：
 *   1. 同步任务生命周期 - createSyncTask / listSyncTasks / executeGradePassback
 *      / retrySyncTask / cancelSyncTask
 *   2. 成绩回写记录与对账 - listPassbackRecords / reconcilePassback
 *
 * 端点说明：
 *   - createSyncTask（POST + DTO）/ listPassbackRecords（POST + DTO，2026-05-14 已 GET→POST 整改）
 *   - listSyncTasks 保留 GET（≤ 2 参数符合约定）
 *   - executeGradePassback / retrySyncTask / cancelSyncTask / reconcilePassback
 *     是 syncTaskId 单参数 POST，使用 query 形式
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

// ─── 状态枚举 ─────────────────────────────────

/** 外部系统类型 - 对应 ExternalSystemType */
export type ExternalSystemTypeCode = 'SIS' | 'LMS' | 'GRADEBOOK'

export const EXTERNAL_SYSTEM_TYPE_LABEL: Record<ExternalSystemTypeCode, string> = {
  SIS: '教务系统 (SIS)',
  LMS: '学习管理系统 (LMS)',
  GRADEBOOK: '成绩册',
}

/** 同步任务类型 - 对应 TeachingAffairsSyncType */
export type TeachingAffairsSyncTypeCode
  = | 'ROSTER_IMPORT'
    | 'GRADE_EXPORT'
    | 'GRADE_CORRECTION'
    | 'GRADE_WITHDRAW'

export const SYNC_TYPE_LABEL: Record<TeachingAffairsSyncTypeCode, string> = {
  ROSTER_IMPORT: '名单导入',
  GRADE_EXPORT: '成绩回写',
  GRADE_CORRECTION: '成绩更正',
  GRADE_WITHDRAW: '成绩撤销',
}

/** 当前后端 createSyncTask 已开放的同步类型（与 TeachingAffairsSyncServiceImpl 一致） */
export const CREATABLE_SYNC_TYPE_LABEL: Partial<Record<TeachingAffairsSyncTypeCode, string>> = {
  GRADE_EXPORT: SYNC_TYPE_LABEL.GRADE_EXPORT,
}

/** 同步任务状态 - 对应 SyncTaskStatus */
export type SyncTaskStatusCode
  = | 'PENDING'
    | 'SYNCING'
    | 'SUCCESS'
    | 'PARTIAL_SUCCESS'
    | 'FAILED'
    | 'CANCELLED'

export const SYNC_TASK_STATUS_LABEL: Record<SyncTaskStatusCode, string> = {
  PENDING: '待执行',
  SYNCING: '同步中',
  SUCCESS: '完成',
  PARTIAL_SUCCESS: '部分成功',
  FAILED: '失败',
  CANCELLED: '已取消',
}

export const SYNC_TASK_STATUS_COLOR: Record<SyncTaskStatusCode, BadgeTone> = {
  PENDING: 'gray',
  SYNCING: 'blue',
  SUCCESS: 'green',
  PARTIAL_SUCCESS: 'orange',
  FAILED: 'red',
  CANCELLED: 'gray',
}

/** 回写状态 - 对应 PassbackStatus */
export type PassbackStatusCode = 'PENDING' | 'SENT' | 'SUCCESS' | 'FAILED' | 'WITHDRAWN'

export const PASSBACK_STATUS_LABEL: Record<PassbackStatusCode, string> = {
  PENDING: '待发送',
  SENT: '已发送',
  SUCCESS: '回写成功',
  FAILED: '回写失败',
  WITHDRAWN: '已撤回',
}

export const PASSBACK_STATUS_COLOR: Record<PassbackStatusCode, BadgeTone> = {
  PENDING: 'gray',
  SENT: 'blue',
  SUCCESS: 'green',
  FAILED: 'red',
  WITHDRAWN: 'orange',
}

/** 对账状态 - 对应 ReconcileStatus */
export type ReconcileStatusCode = 'MATCHED' | 'MISMATCHED' | 'PENDING_RECONCILE'

export const RECONCILE_STATUS_LABEL: Record<ReconcileStatusCode, string> = {
  MATCHED: '一致',
  MISMATCHED: '不一致',
  PENDING_RECONCILE: '待对账',
}

export const RECONCILE_STATUS_COLOR: Record<ReconcileStatusCode, BadgeTone> = {
  MATCHED: 'green',
  MISMATCHED: 'red',
  PENDING_RECONCILE: 'orange',
}

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

/**
 * 查询同步任务列表（≤ 2 参数 GET 保留）
 * GET /api/exam/teaching-affairs/sync-task/list?examId=&taskStatus=
 */
export function listSyncTasks(examId: string, taskStatus?: SyncTaskStatusCode): Promise<SyncTaskVO[]> {
  return http.get<SyncTaskVO[]>('/api/exam/teaching-affairs/sync-task/list', {
    params: { examId, taskStatus },
  })
}

/**
 * 执行成绩回写
 * POST /api/exam/teaching-affairs/sync-task/execute?syncTaskId=
 */
export function executeGradePassback(syncTaskId: string): Promise<void> {
  return http.post<void>('/api/exam/teaching-affairs/sync-task/execute', null, {
    params: { syncTaskId },
  })
}

/**
 * 重试失败 / 部分成功的同步任务
 * POST /api/exam/teaching-affairs/sync-task/retry?syncTaskId=
 */
export function retrySyncTask(syncTaskId: string): Promise<void> {
  return http.post<void>('/api/exam/teaching-affairs/sync-task/retry', null, {
    params: { syncTaskId },
  })
}

/**
 * 取消未完成的同步任务
 * POST /api/exam/teaching-affairs/sync-task/cancel?syncTaskId=
 */
export function cancelSyncTask(syncTaskId: string): Promise<void> {
  return http.post<void>('/api/exam/teaching-affairs/sync-task/cancel', null, {
    params: { syncTaskId },
  })
}

/**
 * 查询回写记录列表（2026-05-14 已 GET→POST 整改）
 * POST /api/exam/teaching-affairs/passback/list
 */
export function listPassbackRecords(request: PassbackRecordQueryRequest): Promise<PageResult<PassbackRecordVO>> {
  return http.post<PageResult<PassbackRecordVO>>('/api/exam/teaching-affairs/passback/list', request)
}

/**
 * 执行对账（本地分 vs 外部分）
 * POST /api/exam/teaching-affairs/passback/reconcile?syncTaskId=
 */
export function reconcilePassback(syncTaskId: string): Promise<void> {
  return http.post<void>('/api/exam/teaching-affairs/passback/reconcile', null, {
    params: { syncTaskId },
  })
}

/**
 * 查询回写进度汇总（同步任务下各 PassbackStatus 的记录计数）
 * GET /api/exam/teaching-affairs/passback/progress?syncTaskId=
 */
export function getPassbackProgress(syncTaskId: string): Promise<PassbackProgressVO> {
  return http.get<PassbackProgressVO>('/api/exam/teaching-affairs/passback/progress', {
    params: { syncTaskId },
  })
}
