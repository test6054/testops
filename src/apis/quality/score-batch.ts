import type { ScoreBatchStatus } from './types'
/**
 * 成绩导入批次 API - 对接 edu-quality / ScoreBatchController
 *
 * 后端路径: /api/quality/score-batches
 * 字段严格对齐 ScoreBatchVO / ScoreBatchSaveRequest / ScoreBatchQueryRequest /
 *   ScoreBatchStatusUpdateRequest / ScoreImportPreviewVO / ScoreImportRowDiagnostic。
 *
 * 主链：先 edu-storage 上传 Excel 得到 sourceFileId → 注册批次 (/create) →
 *        触发解析 (/enqueue-parse) → 状态 PARSING → PREVIEW_READY →
 *        校验 (/validate) → 确认 (/confirm) → 归档 / 驳回 (/update-status)
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/score-batches'

/** 成绩批次 VO - 严格对齐后端 ScoreBatchVO */
export interface ScoreBatchVO {
  id: string
  qualityCourseId: string
  /** 后端 LEFT JOIN t_quality_course.course_code */
  qualityCourseCode?: string
  /** 后端 LEFT JOIN t_quality_course.course_name */
  qualityCourseName?: string
  assessmentItemId?: string
  /** 后端 LEFT JOIN t_quality_assessment_item.item_code */
  assessmentItemCode?: string
  /** 后端 LEFT JOIN t_quality_assessment_item.item_name */
  assessmentItemName?: string
  batchCode: string
  batchName: string
  /** 取值见 ScoreBatchSourceModeEnum；后端 String 透传 */
  sourceMode: string
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
  rawScore?: number
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
export interface ScoreBatchQueryPayload extends QueryDto {
  qualityCourseId?: string
  assessmentItemId?: string
  status?: ScoreBatchStatus
  sourceMode?: string
  keyword?: string
}

/** 创建 / 更新批次请求 - 严格对齐 ScoreBatchSaveRequest */
export interface ScoreBatchSavePayload {
  id?: string
  qualityCourseId: string
  /** 后端 ScoreBatchServiceImpl.ensureRelationsExist 强校验考核环节存在 */
  assessmentItemId: string
  batchCode: string
  batchName: string
  sourceMode: string
  sourceFileId?: string
  externalPullTaskId?: string
  schoolYear?: string
  semester?: string
}

/** 状态流转请求 - 严格对齐 ScoreBatchStatusUpdateRequest */
export interface ScoreBatchStatusUpdatePayload {
  id: string
  status: ScoreBatchStatus
  totalRows?: number
  successRows?: number
  errorRows?: number
  errorSummary?: string
}

export const scoreBatchApi = {
  page: (data: ScoreBatchQueryPayload) =>
    http.post<PageResult<ScoreBatchVO>>(`${BASE}/page`, data),
  detail: (id: string) =>
    http.post<ScoreBatchVO>(`${BASE}/detail`, { id }),
  preview: (id: string) =>
    http.post<ScoreImportPreviewVO>(`${BASE}/preview`, { id }),
  /**
   * 注册成绩批次。前端流程：先调 edu-storage 上传 Excel 得到 sourceFileId，再调本接口注册。
   */
  create: (data: ScoreBatchSavePayload) =>
    http.post<string>(`${BASE}/create`, data),
  update: (data: ScoreBatchSavePayload) =>
    http.post<void>(`${BASE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${BASE}/delete`, { id }),
  /** 触发解析（PENDING / FAILED 状态可用） */
  enqueueParse: (id: string) =>
    http.post<void>(`${BASE}/enqueue-parse`, { id }),
  /** 校验：PREVIEW_READY → VALIDATED */
  validate: (id: string) =>
    http.post<void>(`${BASE}/validate`, { id }),
  /** 确认：VALIDATED → CONFIRMED */
  confirm: (id: string) =>
    http.post<void>(`${BASE}/confirm`, { id }),
  /** 状态流转（驳回 / 归档等） */
  updateStatus: (data: ScoreBatchStatusUpdatePayload) =>
    http.post<void>(`${BASE}/update-status`, data),
}
