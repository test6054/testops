import type { DataSourceMode, ScoreBatchStatus } from './types'
/**
 * 成绩导入批次 API - 对接 edu-quality / ScoreBatchController
 *
 * 后端路径: /api/quality/score-batches
 * 字段严格对齐 ScoreBatchVO / ScoreBatchSaveRequest / ScoreBatchQueryRequest /
 *   ScoreBatchStatusUpdateRequest / ScoreImportPreviewVO / ScoreImportRowDiagnostic。
 *
 * 主链：先 edu-storage 上传 Excel 得到 sourceFileId → 注册批次 (/create) →
 *        触发解析 (/enqueue-parse) → 状态 PARSING → PREVIEW_READY →
 *        校验 (/validate) → 确认 (/confirm)；PENDING / FAILED 可取消 (/update-status)
 */
import type { PageResult, QueryDto } from '@/types'
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
  sourceMode: DataSourceMode
  sourceFileId?: string
  externalPullTaskId?: string
  schoolYear?: string
  semester?: string
  status: ScoreBatchStatus
  totalRows?: number
  successRows?: number
  errorRows?: number
  errorSummary?: string
  confirmedBy?: string
  confirmedAt?: string
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

/** 成绩导入预览 VO - 严格对齐后端 ScoreImportPreviewVO */
export interface ScoreImportPreviewVO {
  batchId: string
  status: ScoreBatchStatus
  totalRows?: number
  successRows?: number
  errorRows?: number
  errorSummary?: string
  diagnostics: ScoreImportRowDiagnostic[]
}

/** 分页查询 - 严格对齐 ScoreBatchQueryRequest */
export interface ScoreBatchQueryRequest extends QueryDto {
  trainingPlanId?: string
  qualityCourseId?: string
  assessmentItemId?: string
  status?: ScoreBatchStatus
  sourceMode?: DataSourceMode
  keyword?: string
}

/** 创建 / 更新批次请求 - 严格对齐 ScoreBatchSaveRequest */
export interface ScoreBatchSaveRequest {
  id?: string
  qualityCourseId: string
  /** 后端 ScoreBatchServiceImpl.ensureRelationsExist 强校验考核环节存在 */
  assessmentItemId: string
  batchCode: string
  batchName: string
  sourceMode: DataSourceMode
  sourceFileId?: string
  externalPullTaskId?: string
  schoolYear?: string
  semester?: string
}

/** 取消请求 - 前端仅用于 PENDING / FAILED → CANCELLED */
export interface ScoreBatchStatusUpdateRequest {
  id: string
  status: ScoreBatchStatus
  totalRows?: number
  successRows?: number
  errorRows?: number
  errorSummary?: string
}

export const scoreBatchApi = {
  page: (data: ScoreBatchQueryRequest) => http.post<PageResult<ScoreBatchVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<ScoreBatchVO>(`${BASE}/detail`, { id }),
  preview: (id: string) => http.post<ScoreImportPreviewVO>(`${BASE}/preview`, { id }),
  /**
   * 注册成绩批次。前端流程：先调 edu-storage 上传 Excel 得到 sourceFileId，再调本接口注册。
   */
  create: (data: ScoreBatchSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: ScoreBatchSaveRequest) => http.post<void>(`${BASE}/update`, data),
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
