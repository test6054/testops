import type { ConfirmationStatusCode, ProcessNodeTypeCode } from './types'
/**
 * 过程性评价节点 API。
 * 后端对象：ProcessEvaluationNodeController /api/quality/process-nodes。
 */
import type { PageResult, QueryDto } from '@/types'
import type { ProcessEvaluationEvidenceTypeCode } from '@/types/enums/process-evaluation-evidence-type-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
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
  nodeType: ProcessNodeTypeCode
  evidenceType?: ProcessEvaluationEvidenceTypeCode
  semester?: SemesterCode
  weight?: number
  fullScore?: number
  coverageRequired?: number
  description?: string
  confirmationStatus: ConfirmationStatusCode
  createTime?: string
  updateTime?: string
}

export interface ProcessEvaluationNodeSaveRequest {
  qualityCourseId: string
  assessmentItemId?: string
  courseGoalId?: string
  indicatorId?: string
  nodeCode: string
  nodeName: string
  nodeType: ProcessNodeTypeCode
  evidenceType?: ProcessEvaluationEvidenceTypeCode
  semester?: SemesterCode
  weight?: number
  fullScore?: number
  coverageRequired?: number
  description?: string
}

export interface ProcessEvaluationNodeUpdateRequest {
  id: string
  qualityCourseId: string
  assessmentItemId?: string
  courseGoalId?: string
  indicatorId?: string
  nodeCode: string
  nodeName: string
  nodeType: ProcessNodeTypeCode
  evidenceType?: ProcessEvaluationEvidenceTypeCode
  semester?: SemesterCode
  weight?: number
  fullScore?: number
  coverageRequired?: number
  description?: string
}

export interface ProcessEvaluationNodeConfirmRequest {
  id: string
  confirmationStatus: ConfirmationStatusCode
}

export interface ProcessEvaluationNodeQueryRequest extends QueryDto {
  qualityCourseId?: string
  confirmationStatus?: ConfirmationStatusCode
  keyword?: string
}

export const processNodeApi = {
  page: (data: ProcessEvaluationNodeQueryRequest) =>
    http.post<PageResult<ProcessEvaluationNodeVO>>(`${NODE}/page`, data),
  detail: (id: string) =>
    http.post<ProcessEvaluationNodeVO>(`${NODE}/detail`, { id }),
  create: (data: ProcessEvaluationNodeSaveRequest) => http.post<string>(`${NODE}/create`, data),
  update: (data: ProcessEvaluationNodeUpdateRequest) => http.post<void>(`${NODE}/update`, data),
  delete: (id: string) => http.post<void>(`${NODE}/delete`, { id }),
  /** 更新节点确认状态 DRAFT/SUBMITTED/CONFIRMED/RETURNED */
  updateConfirmationStatus: (data: ProcessEvaluationNodeConfirmRequest) =>
    http.post<void>(`${NODE}/update-confirmation-status`, data),
}
