/**
 * 成绩明细 API - 对应 ScoreRecordController
 * 后端路径：/api/quality/score-records
 *
 * 成绩明细是直接评价的数据底座；达成度计算会按 (assessmentItem, qualityCourse) 抽取 validFlag=true 的明细。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/score-records'

export interface ScoreRecordVO {
  id: string
  batchId: string
  batchCode: string
  batchName: string
  assessmentItemId: string
  assessmentItemCode: string
  assessmentItemName: string
  qualityCourseId: string
  qualityCourseCode: string
  qualityCourseName: string
  studentUserId?: string
  studentNumber: string
  studentName: string
  classId?: string
  className?: string
  score: number
  fullScore: number
  validFlag: boolean
  invalidReason?: string
  rubricScores: ScoreRecordRubricScoreVO[]
  /** 逗号分隔异常码 */
  errorCodes?: string
  createTime?: string
  updateTime?: string
}

export interface ScoreRecordRubricScoreVO {
  id: string
  scoreRecordId: string
  rubricItemId: string
  rubricCode?: string
  rubricName: string
  score: number
  fullScore: number
  sortOrder: number
}

export interface ScoreRecordSaveRequest {
  batchId: string
  assessmentItemId: string
  qualityCourseId: string
  studentUserId?: string
  studentNumber?: string
  studentName?: string
  classId?: string
  score: number
  fullScore: number
  validFlag?: boolean
  invalidReason?: string
  rubricScores?: ScoreRecordRubricScoreRequest[]
  errorCodes?: string
}

export interface ScoreRecordUpdateRequest {
  id: string
  batchId: string
  assessmentItemId: string
  qualityCourseId: string
  studentUserId?: string
  studentNumber?: string
  studentName?: string
  classId?: string
  score: number
  fullScore: number
  validFlag?: boolean
  invalidReason?: string
  rubricScores?: ScoreRecordRubricScoreRequest[]
  errorCodes?: string
}

export interface ScoreRecordBatchSaveRequest {
  batchId: string
  records: ScoreRecordSaveRequest[]
}

export interface ScoreRecordRubricScoreRequest {
  rubricItemId: string
  score: number
}

export interface ScoreRecordValidQueryRequest extends QueryDto {
  assessmentItemId: string
  qualityCourseId: string
}

export interface ScoreRecordPageRequest extends QueryDto {
  batchId: string
  validFlag?: boolean
}

export interface ScoreRecordBatchSummaryVO {
  totalCount: string
  validCount: string
  invalidCount: string
  erroredCount: string
  avgScoreRatioPercent?: number | null
}

export const scoreRecordApi = {
  pageByBatch: (data: ScoreRecordPageRequest) =>
    http.post<PageResult<ScoreRecordVO>>(`${BASE}/page-by-batch`, data),
  getBatchSummary: (batchId: string) =>
    http.post<ScoreRecordBatchSummaryVO>(`${BASE}/batch-summary`, { id: batchId }),
  pageValidByItem: (request: ScoreRecordValidQueryRequest) =>
    http.post<PageResult<ScoreRecordVO>>(`${BASE}/page-valid-by-item`, request),
  detail: (id: string) =>
    http.post<ScoreRecordVO>(`${BASE}/detail`, { id }),
  create: (data: ScoreRecordSaveRequest) =>
    http.post<string>(`${BASE}/create`, data),
  batchCreate: (data: ScoreRecordBatchSaveRequest) =>
    http.post<void>(`${BASE}/batch-create`, data),
  update: (data: ScoreRecordUpdateRequest) =>
    http.post<void>(`${BASE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${BASE}/delete`, { id }),
}
