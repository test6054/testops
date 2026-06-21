import type { ImportResult } from './importing'
import type { ConfirmationStatus, DataSourceMode } from './types'
/**
 * 过程性评价记录 API。
 * 后端对象：ProcessEvaluationRecordController /api/quality/process-records。
 */
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
  sourceMode?: DataSourceMode
  validationResult?: string
  confirmationStatus: ConfirmationStatus
  confirmedBy?: string
  confirmedAt?: string
  notes?: string
  createTime?: string
  updateTime?: string
}

export interface ProcessEvaluationRecordSaveRequest {
  id?: string
  nodeId: string
  qualityCourseId: string
  studentUserId?: string
  studentNumber?: string
  score: number
  convertedScore?: number
  evidenceFileId?: string
  sourceBatchId?: string
  sourceMode?: DataSourceMode
  validationResult?: string
  notes?: string
}

export const processRecordApi = {
  listByNode: (nodeId: string, confirmationStatus?: ConfirmationStatus) =>
    http.post<ProcessEvaluationRecordVO[]>(`${RECORD}/list-by-node`, { nodeId, confirmationStatus }),
  listConfirmedByCourseGoal: (qualityCourseId: string, courseGoalId: string) =>
    http.post<ProcessEvaluationRecordVO[]>(`${RECORD}/list-confirmed-by-course-goal`, {
      qualityCourseId,
      courseGoalId,
    }),
  detail: (id: string) =>
    http.post<ProcessEvaluationRecordVO>(`${RECORD}/detail`, { id }),
  create: (data: ProcessEvaluationRecordSaveRequest) =>
    http.post<string>(`${RECORD}/create`, data),
  update: (data: ProcessEvaluationRecordSaveRequest) =>
    http.post<void>(`${RECORD}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${RECORD}/delete`, { id }),
  /** DRAFT/SUBMITTED -> CONFIRMED */
  confirm: (id: string) =>
    http.post<void>(`${RECORD}/confirm`, { id }),
  /** Excel 批量导入节点记录。 */
  importExcel: (nodeId: string, file: File) => {
    const formData = new FormData()
    formData.append('nodeId', nodeId)
    formData.append('file', file)
    return http.upload<ImportResult>(`${RECORD}/import-excel`, formData)
  },
  /** 下载节点记录导入 Excel 模板。 */
  downloadTemplate: () =>
    http.download(`${RECORD}/template-download`),
}
