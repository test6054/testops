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
  studentUserId: string
  studentNumber: string
  studentName: string
  classId?: string
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
  id?: string
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

export interface ScoreRecordRubricScoreRequest {
  rubricItemId: string
  score: number
}

export interface ScoreRecordValidQueryRequest extends QueryDto {
  assessmentItemId: string
  qualityCourseId: string
}

export const scoreRecordApi = {
  listByBatch: (batchId: string) =>
    http.post<ScoreRecordVO[]>(`${BASE}/list-by-batch`, { id: batchId }),
  /** 查询某考核环节下批次已确认且样本有效的全部成绩，用于达成度计算 */
  listValidByItem: (request: ScoreRecordValidQueryRequest) =>
    http.post<PageResult<ScoreRecordVO>>(`${BASE}/list-valid-by-item`, request),
  detail: (id: string) =>
    http.post<ScoreRecordVO>(`${BASE}/detail`, { id }),
  create: (data: ScoreRecordSaveRequest) =>
    http.post<string>(`${BASE}/create`, data),
  update: (data: ScoreRecordSaveRequest) =>
    http.post<void>(`${BASE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${BASE}/delete`, { id }),
}
