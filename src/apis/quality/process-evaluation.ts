import type { ConfirmationStatus, ProcessNodeType } from './types'
/**
 * 过程性评价节点 API。
 * 后端对象：ProcessEvaluationNodeController /api/quality/process-nodes。
 */
import http from '@/config/axios'

const NODE = '/api/quality/process-nodes'

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

export interface ProcessEvaluationNodeSaveRequest {
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

export const processNodeApi = {
  listByCourse: (qualityCourseId: string) =>
    http.post<ProcessEvaluationNodeVO[]>(`${NODE}/list-by-course`, { id: qualityCourseId }),
  detail: (id: string) =>
    http.post<ProcessEvaluationNodeVO>(`${NODE}/detail`, { id }),
  create: (data: ProcessEvaluationNodeSaveRequest) =>
    http.post<string>(`${NODE}/create`, data),
  update: (data: ProcessEvaluationNodeSaveRequest) =>
    http.post<void>(`${NODE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${NODE}/delete`, { id }),
  /** 更新节点确认状态 DRAFT/SUBMITTED/CONFIRMED/RETURNED */
  updateConfirmationStatus: (id: string, confirmationStatus: ConfirmationStatus) =>
    http.post<void>(`${NODE}/update-confirmation-status`, { id, confirmationStatus }),
}
