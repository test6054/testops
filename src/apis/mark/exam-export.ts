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
import http from '@/config/axios'

// ─── 状态与类型枚举 ─────────────────────────────────

/** 导出任务状态编码 - 对应后端 ExportTaskStatus */
export type ExportTaskStatusCode
  = | 'PENDING'
    | 'GENERATING'
    | 'COMPLETED'
    | 'FAILED'

export const EXPORT_STATUS_LABEL: Record<ExportTaskStatusCode, string> = {
  PENDING: '待执行',
  GENERATING: '生成中',
  COMPLETED: '已完成',
  FAILED: '失败',
}

/** 导出任务状态 BadgeTone 映射（用于 UiTag/UiBadge 等 ui-guide 组件） */
export const EXPORT_STATUS_TONE: Record<ExportTaskStatusCode, 'gray' | 'blue' | 'green' | 'red'> = {
  PENDING: 'gray',
  GENERATING: 'blue',
  COMPLETED: 'green',
  FAILED: 'red',
}

/** 导出类型编码 */
export type ExportTypeCode
  = | 'SCORE_EXCEL'
    | 'SCORE_PDF'
    | 'ANALYSIS_REPORT'
    | 'IMAGE_ARCHIVE'

export const EXPORT_TYPE_LABEL: Record<ExportTypeCode, string> = {
  SCORE_EXCEL: '成绩 Excel',
  SCORE_PDF: '成绩 PDF',
  ANALYSIS_REPORT: '分析报告',
  IMAGE_ARCHIVE: '影像归档包',
}

/** 导出范围编码 */
export type ExportScopeCode = 'EXAM' | 'CLASS' | 'QUESTION' | 'STUDENT'

export const EXPORT_SCOPE_LABEL: Record<ExportScopeCode, string> = {
  EXAM: '整场考试',
  CLASS: '指定班级',
  QUESTION: '指定题目',
  STUDENT: '指定学生',
}

// ─── DTO ─────────────────────────────────

/** 导出任务结构化范围条件 - 对应 ExportScopeConditionRequest */
export interface ExportScopeConditionRequest {
  /** 班级 ID 集合，导出范围为 CLASS 时使用 */
  classIds?: string[]
  /** 题目模板 ID 集合，导出范围为 QUESTION 时使用 */
  questionTemplateIds?: string[]
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
  fileSize: string
}

/** 导出任务失败请求 - 对应 ExportFailRequest */
export interface ExportFailRequest {
  taskId: string
  errorMessage: string
}

/** 导出任务范围明细响应 - 对应 ExportScopeItemResponse */
export interface ExportScopeItemVO {
  scopeType: ExportScopeCode
  targetId: string
  targetCode?: string
  targetName: string
}

/** 导出任务响应公共字段 - 对应 ExportTaskResponse */
export interface ExportTaskBaseVO {
  taskId: string
  examId: string
  examName: string
  examNo?: string
  exportType: ExportTypeCode
  exportScope: ExportScopeCode
  scopeSummary: string
  scopeItems: ExportScopeItemVO[]
  startedTime?: string
}

/** 等待执行导出任务 - 后端状态为 PENDING */
export interface ExportTaskPendingVO extends ExportTaskBaseVO {
  taskStatus: 'PENDING'
}

/** 生成中导出任务 - 后端状态为 GENERATING */
export interface ExportTaskGeneratingVO extends ExportTaskBaseVO {
  taskStatus: 'GENERATING'
  startedTime: string
}

/** 已完成导出任务 - 后端状态为 COMPLETED，文件字段必须完整 */
export interface ExportTaskCompletedVO extends ExportTaskBaseVO {
  taskStatus: 'COMPLETED'
  fileName: string
  fileId: string
  fileSize: string
  startedTime: string
  completedTime: string
}

/** 失败导出任务 - 后端状态为 FAILED，失败说明必须完整 */
export interface ExportTaskFailedVO extends ExportTaskBaseVO {
  taskStatus: 'FAILED'
  errorMessage: string
  startedTime: string
}

/** 导出任务响应 - 对应 ExportTaskResponse 的状态判别联合 */
export type ExportTaskVO
  = | ExportTaskPendingVO
    | ExportTaskGeneratingVO
    | ExportTaskCompletedVO
    | ExportTaskFailedVO

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
export function listExportTasks(request: ExportTaskQueryRequest): Promise<PageResult<ExportTaskVO>> {
  return http.post<PageResult<ExportTaskVO>>('/api/mark/exams/export/list', request)
}

/**
 * 查询单个导出任务详情
 * POST /api/mark/exams/export/detail
 */
export function getExportTask(request: ExportDetailRequest): Promise<ExportTaskVO> {
  return http.post<ExportTaskVO>('/api/mark/exams/export/detail', request)
}

/**
 * 标记导出任务进入生成阶段（仅 worker / 运维使用）
 * POST /api/mark/exams/export/start
 */
export function startExportTask(request: ExportDetailRequest): Promise<ExportTaskVO> {
  return http.post<ExportTaskVO>('/api/mark/exams/export/start', request)
}

/**
 * 标记导出任务完成并写入文件元信息（仅 worker / 运维使用）
 * POST /api/mark/exams/export/complete
 */
export function completeExportTask(request: ExportCompleteRequest): Promise<ExportTaskVO> {
  return http.post<ExportTaskVO>('/api/mark/exams/export/complete', request)
}

/**
 * 标记导出任务失败（仅 worker / 运维使用）
 * POST /api/mark/exams/export/fail
 */
export function failExportTask(request: ExportFailRequest): Promise<ExportTaskVO> {
  return http.post<ExportTaskVO>('/api/mark/exams/export/fail', request)
}
