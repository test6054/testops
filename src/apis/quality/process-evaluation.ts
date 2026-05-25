/**
 * 过程性评价 API - 节点 + 数据记录
 *
 * 后端路径：
 * - /api/quality/process-nodes     过程性评价节点 CRUD + 确认状态流转
 * - /api/quality/process-records   节点记录 CRUD + 批量 + 按课程目标查询 + 确认
 *
 * 规则：
 * 1. 节点必须 CONFIRMED 才允许录入记录
 * 2. 记录 CONFIRMED 后禁止修改/删除
 * 3. 已确认记录才进入达成度计算
 */
import type { ImportResult } from './importing'
import type { ConfirmationStatus, DataSourceMode, ProcessNodeType } from './types'
import http from '@/config/axios'

const NODE = '/api/quality/process-nodes'
const RECORD = '/api/quality/process-records'

export interface ProcessEvaluationNodeVO {
  id: string
  qualityCourseId: string
  assessmentItemId?: string
  courseGoalId?: string
  indicatorId?: string
  nodeCode: string
  nodeName: string
  nodeType: ProcessNodeType
  evidenceType?: string
  semester?: string
  weight?: number
  fullScore?: number
  coverageRequired?: number
  description?: string
  confirmationStatus: ConfirmationStatus
  createTime?: string
  updateTime?: string
}

export interface ProcessEvaluationNodeSavePayload {
  id?: string
  qualityCourseId: string
  assessmentItemId?: string
  courseGoalId?: string
  indicatorId?: string
  nodeCode: string
  nodeName: string
  nodeType: ProcessNodeType
  evidenceType?: string
  semester?: string
  weight?: number
  fullScore?: number
  coverageRequired?: number
  description?: string
}

export interface ProcessEvaluationRecordVO {
  id: string
  nodeId: string
  qualityCourseId: string
  studentUserId?: string
  studentNumber?: string
  rawScore: number
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

export interface ProcessEvaluationRecordSavePayload {
  id?: string
  nodeId: string
  qualityCourseId: string
  studentUserId?: string
  studentNumber?: string
  rawScore: number
  convertedScore?: number
  evidenceFileId?: string
  sourceBatchId?: string
  sourceMode?: DataSourceMode
  validationResult?: string
  notes?: string
}

export const processNodeApi = {
  listByCourse: (qualityCourseId: string) =>
    http.post<ProcessEvaluationNodeVO[]>(`${NODE}/list-by-course`, { id: qualityCourseId }),
  detail: (id: string) =>
    http.post<ProcessEvaluationNodeVO>(`${NODE}/detail`, { id }),
  create: (data: ProcessEvaluationNodeSavePayload) =>
    http.post<string>(`${NODE}/create`, data),
  update: (data: ProcessEvaluationNodeSavePayload) =>
    http.post<void>(`${NODE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${NODE}/delete`, { id }),
  /** 更新节点确认状态 DRAFT/SUBMITTED/CONFIRMED/RETURNED */
  updateConfirmationStatus: (id: string, confirmationStatus: ConfirmationStatus) =>
    http.post<void>(`${NODE}/update-confirmation-status`, { id, confirmationStatus }),
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
  create: (data: ProcessEvaluationRecordSavePayload) =>
    http.post<string>(`${RECORD}/create`, data),
  update: (data: ProcessEvaluationRecordSavePayload) =>
    http.post<void>(`${RECORD}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${RECORD}/delete`, { id }),
  /** DRAFT/SUBMITTED → CONFIRMED */
  confirm: (id: string) =>
    http.post<void>(`${RECORD}/confirm`, { id }),
  /** Excel 批量导入节点记录（节点必须 CONFIRMED） */
  importExcel: (nodeId: string, file: File) => {
    const formData = new FormData()
    formData.append('nodeId', nodeId)
    formData.append('file', file)
    return http.upload<ImportResult>(`${RECORD}/import-excel`, formData)
  },
  /** 下载节点记录导入 Excel 模板 */
  downloadTemplate: () =>
    http.download(`${RECORD}/template-download`),
}
