import type { DataSourceModeCode, ScoreBatchStatusCode } from './types'
/**
 * 成绩导入批次 API - 对接 edu-quality / ScoreBatchController
 *
 * 后端路径: /api/quality/score-batches
 * 字段严格对齐 ScoreBatchVO / ScoreBatchSaveRequest / ScoreBatchQueryRequest /
 *   ScoreBatchStatusUpdateRequest / ScoreImportPreviewVO / ScoreImportRowDiagnostic。
 *
 * Excel 导入主链：platform stage(QUALITY_SCORE_IMPORT) → platform excel-import(QUALITY_SCORE_BATCH)
 * → Handler 内 create + enqueueParse → 状态 PARSING → PREVIEW_READY → validate → confirm。
 * 列表页 preview/validate/confirm/enqueueParse 仍走本模块 REST。
 */
import type { PageResult, QueryDto } from '@/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'

const BASE = '/api/quality/score-batches'

/** 成绩批次 VO - 严格对齐后端 ScoreBatchVO */
export interface ScoreBatchVO {
  id: string
  qualityCourseId: string
  /** 后端 LEFT JOIN t_quality_course.course_code */
  qualityCourseCode: string
  /** 后端 LEFT JOIN t_quality_course.course_name */
  qualityCourseName: string
  assessmentItemId: string
  /** 后端 LEFT JOIN t_quality_assessment_item.item_code */
  assessmentItemCode: string
  /** 后端 LEFT JOIN t_quality_assessment_item.item_name */
  assessmentItemName: string
  batchCode: string
  batchName: string
  /** 取值见后端 DataSourceModeEnum */
  sourceMode: DataSourceModeCode
  sourceFileId?: string
  externalPullTaskId?: string
  schoolYear?: string
  semester?: SemesterCode
  status: ScoreBatchStatusCode
  totalRows?: number
  successRows?: number
  errorRows?: number
  errorSummary?: string
  confirmedUserId?: string
  confirmedTime?: string
  createTime?: string
  updateTime?: string
}

/** 成绩导入行诊断 - 严格对齐后端 ScoreImportRowDiagnostic */
export interface ScoreImportRowDiagnostic {
  rowIndex: number
  studentNumber?: string
  studentName?: string
  className?: string
  score?: number
  valid?: boolean
  errorCodes: string[]
  errorMessages: string[]
}

/** 成绩导入预览 VO - 严格对齐后端 ScoreImportPreviewVO（摘要；错误行走 score-records/page-by-batch） */
export interface ScoreImportPreviewVO {
  batchId: string
  status: ScoreBatchStatusCode
  totalRows?: number
  successRows?: number
  errorRows?: number
  errorSummary?: string
}

/** 分页查询 - 严格对齐 ScoreBatchQueryRequest */
export interface ScoreBatchQueryRequest extends QueryDto {
  trainingPlanId?: string
  qualityCourseId?: string
  assessmentItemId?: string
  status?: ScoreBatchStatusCode
  sourceMode?: DataSourceModeCode
  keyword?: string
}

/** 创建批次请求 - 严格对齐 ScoreBatchSaveRequest */
export interface ScoreBatchSaveRequest {
  qualityCourseId: string
  /** 后端 ScoreBatchServiceImpl.ensureRelationsExist 强校验考核环节存在 */
  assessmentItemId: string
  batchCode: string
  batchName: string
  sourceMode: DataSourceModeCode
  sourceFileId?: string
  externalPullTaskId?: string
  schoolYear?: string
  semester?: SemesterCode
}

/** 更新批次请求 - 严格对齐 ScoreBatchUpdateRequest */
export interface ScoreBatchUpdateRequest {
  id: string
  qualityCourseId: string
  assessmentItemId: string
  batchCode: string
  batchName: string
  sourceMode: DataSourceModeCode
  sourceFileId?: string
  externalPullTaskId?: string
  schoolYear?: string
  semester?: SemesterCode
}

/** 取消请求 - 前端仅用于 PENDING / FAILED → CANCELLED */
export interface ScoreBatchStatusUpdateRequest {
  id: string
  status: ScoreBatchStatusCode
  totalRows?: number
  successRows?: number
  errorRows?: number
  errorSummary?: string
}

/** 按状态分组统计 - 对齐后端 QualityStatusStatRow */
export interface QualityStatusStatRow {
  status: ScoreBatchStatusCode
  recordCount: number
}

/** 按状态分组统计响应 - 对齐后端 QualityStatusCountsResponse */
export interface QualityStatusCountsResponse {
  totalCount: number
  statusCounts: QualityStatusStatRow[]
}

export const scoreBatchApi = {
  page: (data: ScoreBatchQueryRequest) =>
    http.post<PageResult<ScoreBatchVO>>(`${BASE}/page`, data),
  statusCounts: (data: ScoreBatchQueryRequest) =>
    http.post<QualityStatusCountsResponse>(`${BASE}/status-counts`, data),
  detail: (id: string) =>
    http.post<ScoreBatchVO>(`${BASE}/detail`, { id }),
  preview: (id: string) => http.post<ScoreImportPreviewVO>(`${BASE}/preview`, { id }),
  /**
   * 注册成绩批次（platform Excel 导入由 ScoreBatchExcelImportSceneHandler 内部调用，页面不直调）。
   */
  create: (data: ScoreBatchSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: ScoreBatchUpdateRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  /** 触发解析（PENDING / FAILED 状态可用） */
  enqueueParse: (id: string) => http.post<void>(`${BASE}/enqueue-parse`, { id }),
  /** 校验：PREVIEW_READY → VALIDATED */
  validate: (id: string) => http.post<void>(`${BASE}/validate`, { id }),
  /** 确认：VALIDATED → CONFIRMED */
  confirm: (id: string) => http.post<void>(`${BASE}/confirm`, { id }),
  /** 取消批次：PENDING / FAILED → CANCELLED */
  updateStatus: (data: ScoreBatchStatusUpdateRequest) =>
    http.post<void>(`${BASE}/update-status`, data),
}
