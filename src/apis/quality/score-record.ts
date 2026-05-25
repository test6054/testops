/**
 * 成绩明细 API - 对应 ScoreRecordController
 * 后端路径：/api/quality/score-records
 *
 * 成绩明细是直接评价的数据底座；达成度计算会按 (assessmentItem, qualityCourse) 抽取 validFlag=true 的明细。
 */
import http from '@/config/axios'

const BASE = '/api/quality/score-records'

export interface ScoreRecordVO {
  id: string
  batchId: string
  assessmentItemId: string
  qualityCourseId: string
  studentUserId?: string
  studentNumber?: string
  studentName?: string
  classId?: string
  rawScore: number
  fullScore: number
  /** JSON：{ rubricItemId: score } */
  rubricBreakdown?: string
  validFlag?: boolean
  invalidReason?: string
  /** 逗号分隔异常码 */
  errorCodes?: string
  createTime?: string
  updateTime?: string
}

export interface ScoreRecordSavePayload {
  id?: string
  batchId: string
  assessmentItemId: string
  qualityCourseId: string
  studentUserId?: string
  studentNumber?: string
  studentName?: string
  classId?: string
  rawScore: number
  fullScore: number
  rubricBreakdown?: string
  validFlag?: boolean
  invalidReason?: string
  errorCodes?: string
}

export const scoreRecordApi = {
  listByBatch: (batchId: string) =>
    http.post<ScoreRecordVO[]>(`${BASE}/list-by-batch`, { id: batchId }),
  /** 查询某考核环节下批次已确认且样本有效的全部成绩，用于达成度计算 */
  listValidByItem: (assessmentItemId: string, qualityCourseId: string) =>
    http.post<ScoreRecordVO[]>(`${BASE}/list-valid-by-item`, {
      assessmentItemId,
      qualityCourseId,
    }),
  detail: (id: string) =>
    http.post<ScoreRecordVO>(`${BASE}/detail`, { id }),
  create: (data: ScoreRecordSavePayload) =>
    http.post<string>(`${BASE}/create`, data),
  update: (data: ScoreRecordSavePayload) =>
    http.post<void>(`${BASE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${BASE}/delete`, { id }),
}
