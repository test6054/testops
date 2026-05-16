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
 *   - taskId / examId / fileId 在前端均以 string 形式传输（保持 Long ID 字符串语义）。
 */
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

/** 导出任务创建请求 - 对应 ExportCreateRequest */
export interface ExportCreatePayload {
  examId: string
  exportType: ExportTypeCode
  exportScope: ExportScopeCode
  /** 范围条件载荷 JSON 字符串，例如 '{"classIds":["101"]}' */
  scopePayload?: string
}

/** 导出任务查询请求 - 对应 ExportTaskQueryRequest */
export interface ExportTaskQueryPayload {
  examId: string
}

/** 导出任务详情请求 - 对应 ExportDetailRequest */
export interface ExportDetailPayload {
  taskId: string
}

/** 导出任务完成请求 - 对应 ExportCompleteRequest */
export interface ExportCompletePayload {
  taskId: string
  fileId: string
  fileName: string
  fileSize: number
}

/** 导出任务失败请求 - 对应 ExportFailRequest */
export interface ExportFailPayload {
  taskId: string
  errorMessage: string
}

/** 导出任务响应 - 对应 ExportTaskResponse */
export interface ExportTaskVO {
  taskId: string
  examId: string
  exportType: ExportTypeCode
  exportScope: ExportScopeCode
  scopePayload?: string
  fileName?: string
  fileId?: string
  fileSize?: number
  taskStatus: ExportTaskStatusCode
  errorMessage?: string
  startedTime?: string
  completedTime?: string
}

// ─── API ─────────────────────────────────

/**
 * 创建导出任务（PENDING）
 * POST /api/mark/exams/export/create
 */
export function createExportTask(payload: ExportCreatePayload): Promise<string> {
  return http.post<string>('/api/mark/exams/export/create', payload)
}

/**
 * 按考试查询导出任务列表
 * POST /api/mark/exams/export/list
 */
export function listExportTasks(payload: ExportTaskQueryPayload): Promise<ExportTaskVO[]> {
  return http.post<ExportTaskVO[]>('/api/mark/exams/export/list', payload)
}

/**
 * 查询单个导出任务详情
 * POST /api/mark/exams/export/detail
 */
export function getExportTask(payload: ExportDetailPayload): Promise<ExportTaskVO> {
  return http.post<ExportTaskVO>('/api/mark/exams/export/detail', payload)
}

/**
 * 标记导出任务进入生成阶段（仅 worker / 运维使用）
 * POST /api/mark/exams/export/start
 */
export function startExportTask(payload: ExportDetailPayload): Promise<ExportTaskVO> {
  return http.post<ExportTaskVO>('/api/mark/exams/export/start', payload)
}

/**
 * 标记导出任务完成并写入文件元信息（仅 worker / 运维使用）
 * POST /api/mark/exams/export/complete
 */
export function completeExportTask(payload: ExportCompletePayload): Promise<ExportTaskVO> {
  return http.post<ExportTaskVO>('/api/mark/exams/export/complete', payload)
}

/**
 * 标记导出任务失败（仅 worker / 运维使用）
 * POST /api/mark/exams/export/fail
 */
export function failExportTask(payload: ExportFailPayload): Promise<ExportTaskVO> {
  return http.post<ExportTaskVO>('/api/mark/exams/export/fail', payload)
}
