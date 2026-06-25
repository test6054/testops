/**
 * 考核评价依据合理性审核 API（CEEAA 2025强制要求）
 * 后端 Controller: AssessmentRationalityAuditController
 */
import type { AssessmentRationalityAuditStatus } from './types'
import http from '@/config/axios'

export interface RationalityAuditCourseLedgerRequest {
  trainingPlanId: string
  schoolYear: string
  semester: string
}

export interface RationalityAuditSaveRequest {
  id?: string
  qualityCourseId: string
  assessmentItemId?: string
  schoolYear?: string
  semester?: string
  auditStatus?: AssessmentRationalityAuditStatus
  auditOpinion?: string
  contentAligned?: boolean
  rubricMeasurable?: boolean
  methodReasonable?: boolean
  evidenceFileIds?: string
  remark?: string
}

export interface RationalityAuditCourseLedgerItemVO {
  id?: string
  qualityCourseId: string
  courseCode?: string
  courseName: string
  schoolYear?: string
  semester?: string
  hasAuditRecord: boolean
  auditStatus: AssessmentRationalityAuditStatus
  auditorUserId?: string
  auditOpinion?: string
  auditedTime?: string
  contentAligned?: boolean
  rubricMeasurable?: boolean
  methodReasonable?: boolean
  evidenceFileIds?: string
  remark?: string
  createTime?: string
}

export interface RationalityAuditCourseLedgerOverviewVO {
  totalCourseCount: number
  auditedCourseCount: number
  approvedCourseCount: number
  pendingCourseCount: number
  coverageRate: number
}

export interface RationalityAuditCourseLedgerVO {
  overview: RationalityAuditCourseLedgerOverviewVO
  items: RationalityAuditCourseLedgerItemVO[]
}

/** POST /api/quality/rationality-audits/create */
export function createRationalityAudit(request: RationalityAuditSaveRequest): Promise<string> {
  return http.post<string>('/api/quality/rationality-audits/create', request)
}

/** POST /api/quality/rationality-audits/update */
export function updateRationalityAudit(request: RationalityAuditSaveRequest): Promise<void> {
  return http.post<void>('/api/quality/rationality-audits/update', request)
}

/** POST /api/quality/rationality-audits/course-ledger */
export function getRationalityAuditCourseLedger(
  request: RationalityAuditCourseLedgerRequest,
): Promise<RationalityAuditCourseLedgerVO> {
  return http.post<RationalityAuditCourseLedgerVO>('/api/quality/rationality-audits/course-ledger', request)
}
