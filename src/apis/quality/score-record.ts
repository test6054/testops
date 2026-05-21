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
  /**
   * @deprecated 前端不再调用本端点。批量录入请走「成绩 Excel 导入」批次链路：
   * `/quality/score-batch` 页面 → 模板下载 → Excel 上传 → 异步解析 → 预览 → 校验 → 确认。
   * 后端端点保留供内部 service 在批次状态流转期间使用。
   */
  batchCreate: (batchId: string, records: ScoreRecordSavePayload[]) =>
    http.post<void>(`${BASE}/batch-create`, { batchId, records }),
  update: (data: ScoreRecordSavePayload) =>
    http.post<void>(`${BASE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${BASE}/delete`, { id }),
}
