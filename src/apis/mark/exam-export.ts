/**
 * 考试导出任务 API - 对接 edu-mark 模块 ExamExportController
 *
 * 业务链：
 *   1. createExportTask 教师/管理员触发，写入任务（PENDING）
 *   2. 后端 worker / 调度器 读取 PENDING → 调用 startExportTask 标记 GENERATING
 *   3. worker 生成文件、上传到 edu-storage → completeExportTask 写 fileId/fileSize
 *   4. 异常路径走 failExportTask 写 errorMessage
 *   5. 前端轮询 listExportTasks / getExportTask 看进度，COMPLETED 后用 fileId 走通用下载链
 *
 * 注意：
 *   - 与 edu-user 通用导出中心（`@/apis/edu/export.ts`）严格区分。
 *   - start/complete/fail 三个端点保留以备运维或 worker 调用，前端 UI 不直接暴露。
 *   - taskId / fileId 仅作为内部接口参数使用，页面展示使用考试名称、范围名称和文件名。
 */
import type { PageResult, QueryDto } from '@/types'
import type { ExportScopeCode } from '@/types/enums/export-scope-enum'
import type { ExportTypeCode } from '@/types/enums/export-type-enum'
import http from '@/config/axios'
import { ExportTaskStatusCode, ExportTaskStatusDescription } from '@/types/enums/export-task-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

/** 导出任务状态 BadgeTone 映射（用于 UiTag/UiBadge 等 ui-guide 组件） */
export const EXPORT_STATUS_TONE: Record<ExportTaskStatusCode, 'gray' | 'blue' | 'green' | 'red'> = {
  [ExportTaskStatusCode.PENDING]: 'gray',
  [ExportTaskStatusCode.GENERATING]: 'blue',
  [ExportTaskStatusCode.COMPLETED]: 'green',
  [ExportTaskStatusCode.FAILED]: 'red',
  [ExportTaskStatusCode.CANCELLED]: 'gray',
}

/** 导出任务主流程状态链（不含 FAILED 分支），供列表页流程 hint 展示 */
export const EXPORT_MAIN_FLOW_STATUSES: ExportTaskStatusCode[] = [
  ExportTaskStatusCode.PENDING,
  ExportTaskStatusCode.GENERATING,
  ExportTaskStatusCode.COMPLETED,
]

/** 导出任务主流程 hint */
export const EXPORT_FLOW_HINT = `${EXPORT_MAIN_FLOW_STATUSES.map(
  (status) => strictEnumLabel(ExportTaskStatusDescription, status, '导出任务状态'),
).join(' → ')} / ${strictEnumLabel(ExportTaskStatusDescription, ExportTaskStatusCode.FAILED, '导出任务状态')}`

export {
  ALL_EXPORT_SCOPE_CODES,
  ExportScopeCode,
  ExportScopeDescription,
} from '@/types/enums/export-scope-enum'
export {
  ALL_EXPORT_TASK_STATUS_CODES,
  ExportTaskStatusCode,
  ExportTaskStatusDescription,
} from '@/types/enums/export-task-status-enum'
export {
  ALL_EXPORT_TYPE_CODES,
  ExportTypeCode,
  ExportTypeDescription,
} from '@/types/enums/export-type-enum'

// ─── DTO ─────────────────────────────────

/** 导出任务结构化范围条件 - 对应 ExportScopeConditionRequest */
export interface ExportScopeConditionRequest {
  /** 班级 ID 集合，导出范围为 CLASS 时使用 */
  classIds?: string[]
  /** 制卷题目 ID 集合，导出范围为 QUESTION 时使用 */
  layoutQuestionIds?: string[]
  /** 学生用户 ID 集合，导出范围为 STUDENT 时使用 */
  studentUserIds?: string[]
}

/** 导出任务创建请求 - 对应 ExportCreateRequest */
export interface ExportCreateRequest {
  examId: string
  exportType: ExportTypeCode
  exportScope: ExportScopeCode
  /** 结构化范围条件，EXAM 范围不传 */
  scopeCondition?: ExportScopeConditionRequest
}

/** 导出任务创建响应 - 对应 ExportCreateResponse */
export interface ExportCreateResponse {
  taskId: string
}

/** 导出任务查询请求 - 对应 ExportTaskQueryRequest */
export interface ExportTaskQueryRequest extends QueryDto {
  examId: string
  /** 任务状态筛选，不传表示全部 */
  taskStatus?: ExportTaskStatusCode
  /** 导出类型筛选，不传表示全部 */
  exportType?: ExportTypeCode
}

/** 导出任务状态汇总 - 对应 ExportTaskStatusSummaryResponse */
export interface ExportTaskStatusSummaryResponse {
  totalCount: number
  pendingCount: number
  generatingCount: number
  completedCount: number
  failedCount: number
}

/** 导出任务详情请求 - 对应 ExportDetailRequest */
export interface ExportDetailRequest {
  taskId: string
}

/** 导出任务完成请求 - 对应 ExportCompleteRequest */
export interface ExportCompleteRequest {
  taskId: string
  fileId: string
  fileName: string
  fileSize: number
}

/** 导出任务失败请求 - 对应 ExportFailRequest */
export interface ExportFailRequest {
  taskId: string
  errorMessage: string
}

/** 导出任务范围明细响应 - 对应 ExportScopeItemResponse */
export interface ExportScopeItemResponse {
  scopeType: ExportScopeCode
  targetId: string
  targetCode?: string
  targetName: string
}

/** 导出任务响应 - 对应 ExportTaskResponse */
export interface ExportTaskResponse {
  taskId: string
  examId: string
  examName: string
  examNo?: string
  exportType: ExportTypeCode
  exportScope: ExportScopeCode
  scopeSummary: string
  scopeItems: ExportScopeItemResponse[]
  taskStatus: ExportTaskStatusCode
  fileName?: string
  fileId?: string
  fileSize?: number
  errorMessage?: string
  startedTime?: string
  completedTime?: string
}

// ─── API ─────────────────────────────────

/**
 * 创建导出任务（PENDING）
 * POST /api/mark/exams/export/create
 */
export function createExportTask(request: ExportCreateRequest): Promise<ExportCreateResponse> {
  return http.post<ExportCreateResponse>('/api/mark/exams/export/create', request)
}

/**
 * 按考试查询导出任务列表
 * POST /api/mark/exams/export/list
 */
export function listExportTasks(
  request: ExportTaskQueryRequest,
): Promise<PageResult<ExportTaskResponse>> {
  return http.post<PageResult<ExportTaskResponse>>('/api/mark/exams/export/list', request)
}

/**
 * 查询单场考试导出任务状态汇总
 * POST /api/mark/exams/export/status-summary
 */
export function getExportTaskStatusSummary(examId: string): Promise<ExportTaskStatusSummaryResponse> {
  return http.post<ExportTaskStatusSummaryResponse>('/api/mark/exams/export/status-summary', { examId })
}

/**
 * 查询单个导出任务详情
 * POST /api/mark/exams/export/detail
 */
export function getExportTask(request: ExportDetailRequest): Promise<ExportTaskResponse> {
  return http.post<ExportTaskResponse>('/api/mark/exams/export/detail', request)
}

/**
 * 标记导出任务进入生成阶段（仅 worker / 运维使用）
 * POST /api/mark/exams/export/start
 */
export function startExportTask(request: ExportDetailRequest): Promise<ExportTaskResponse> {
  return http.post<ExportTaskResponse>('/api/mark/exams/export/start', request)
}

/**
 * 标记导出任务完成并写入文件元信息（仅 worker / 运维使用）
 * POST /api/mark/exams/export/complete
 */
export function completeExportTask(request: ExportCompleteRequest): Promise<ExportTaskResponse> {
  return http.post<ExportTaskResponse>('/api/mark/exams/export/complete', request)
}

/**
 * 标记导出任务失败（仅 worker / 运维使用）
 * POST /api/mark/exams/export/fail
 */
export function failExportTask(request: ExportFailRequest): Promise<ExportTaskResponse> {
  return http.post<ExportTaskResponse>('/api/mark/exams/export/fail', request)
}
