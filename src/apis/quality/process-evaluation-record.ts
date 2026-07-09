import type { ConfirmationStatusCode, DataSourceModeCode } from './types'
/**
 * 过程性评价记录 API。
 * 后端对象：ProcessEvaluationRecordController /api/quality/process-records。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const RECORD = '/api/quality/process-records'

export interface ProcessEvaluationRecordVO {
  id: string
  nodeId: string
  qualityCourseId: string
  studentUserId?: string
  studentNumber?: string
  studentName?: string
  score: number
  convertedScore?: number
  evidenceFileId?: string
  sourceBatchId?: string
  sourceMode?: DataSourceModeCode
  validationResult?: string
  confirmationStatus: ConfirmationStatusCode
  confirmedUserId?: string
  confirmedTime?: string
  notes?: string
  createTime?: string
  updateTime?: string
}

export interface ProcessEvaluationRecordSaveRequest {
  nodeId: string
  qualityCourseId: string
  studentUserId?: string
  studentNumber?: string
  score: number
  convertedScore?: number
  evidenceFileId?: string
  sourceBatchId?: string
  sourceMode?: DataSourceModeCode
  validationResult?: string
  notes?: string
}

export interface ProcessEvaluationRecordUpdateRequest {
  id: string
  nodeId: string
  qualityCourseId: string
  studentUserId?: string
  studentNumber?: string
  score: number
  convertedScore?: number
  evidenceFileId?: string
  sourceBatchId?: string
  sourceMode?: DataSourceModeCode
  validationResult?: string
  notes?: string
}

export interface ProcessEvaluationRecordBatchSaveRequest {
  nodeId: string
  records: ProcessEvaluationRecordSaveRequest[]
}

export interface ProcessEvaluationRecordCourseGoalQueryRequest extends QueryDto {
  qualityCourseId: string
  courseGoalId: string
}

export interface ProcessEvaluationRecordQueryRequest extends QueryDto {
  nodeId: string
  confirmationStatus?: ConfirmationStatusCode
  keyword?: string
}

export interface ProcessEvaluationRecordConfirmRequest {
  id: string
  confirmationStatus: ConfirmationStatusCode
}

export const processRecordApi = {
  page: (data: ProcessEvaluationRecordQueryRequest) =>
    http.post<PageResult<ProcessEvaluationRecordVO>>(`${RECORD}/page`, data),
  pageConfirmedByCourseGoal: (data: ProcessEvaluationRecordCourseGoalQueryRequest) =>
    http.post<PageResult<ProcessEvaluationRecordVO>>(`${RECORD}/page-confirmed-by-course-goal`, data),
  detail: (id: string) => http.post<ProcessEvaluationRecordVO>(`${RECORD}/detail`, { id }),
  create: (data: ProcessEvaluationRecordSaveRequest) => http.post<string>(`${RECORD}/create`, data),
  batchCreate: (data: ProcessEvaluationRecordBatchSaveRequest) =>
    http.post<void>(`${RECORD}/batch-create`, data),
  update: (data: ProcessEvaluationRecordUpdateRequest) => http.post<void>(`${RECORD}/update`, data),
  delete: (id: string) => http.post<void>(`${RECORD}/delete`, { id }),
  updateConfirmationStatus: (data: ProcessEvaluationRecordConfirmRequest) =>
    http.post<void>(`${RECORD}/update-confirmation-status`, data),
}
