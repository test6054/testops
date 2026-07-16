/**
 * 考核评价依据合理性审核 API（CEEAA 2025强制要求）
 * 后端 Controller: AssessmentRationalityAuditController
 */
import type { AssessmentRationalityAuditStatusCode } from './types'
import type { PageResult, QueryDto } from '@/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'

export interface RationalityAuditCourseLedgerRequest {
  trainingPlanId: string
  schoolYear: string
  semester: SemesterCode
}

export interface RationalityAuditCourseLedgerQueryRequest extends QueryDto, RationalityAuditCourseLedgerRequest {
  auditStatus?: AssessmentRationalityAuditStatusCode
  keyword?: string
}

export interface RationalityAuditSaveRequest {
  id?: string
  qualityCourseId: string
  assessmentItemId?: string
  schoolYear?: string
  semester?: SemesterCode
  auditStatus?: AssessmentRationalityAuditStatusCode
  auditOpinion?: string
  contentAligned?: boolean
  rubricMeasurable?: boolean
  methodReasonable?: boolean
  evidenceFileIds?: string[]
  remark?: string
}

export interface RationalityAuditCourseLedgerItemVO {
  id?: string
  qualityCourseId: string
  courseCode?: string
  courseName: string
  schoolYear?: string
  semester?: SemesterCode
  hasAuditRecord: boolean
  auditStatus: AssessmentRationalityAuditStatusCode
  auditorUserId?: string
  auditOpinion?: string
  auditedTime?: string
  contentAligned?: boolean
  rubricMeasurable?: boolean
  methodReasonable?: boolean
  evidenceFileIds?: string[]
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

/** POST /api/quality/rationality-audits/create */
export function createRationalityAudit(request: RationalityAuditSaveRequest): Promise<string> {
  return http.post<string>('/api/quality/rationality-audits/create', request)
}

/** POST /api/quality/rationality-audits/update */
export function updateRationalityAudit(request: RationalityAuditSaveRequest): Promise<void> {
  return http.post<void>('/api/quality/rationality-audits/update', request)
}

/** POST /api/quality/rationality-audits/course-ledger/overview */
export function getRationalityAuditCourseLedgerOverview(
  request: RationalityAuditCourseLedgerRequest,
): Promise<RationalityAuditCourseLedgerOverviewVO> {
  return http.post<RationalityAuditCourseLedgerOverviewVO>(
    '/api/quality/rationality-audits/course-ledger/overview',
    request,
  )
}

/** POST /api/quality/rationality-audits/course-ledger/page */
export function pageRationalityAuditCourseLedger(
  request: RationalityAuditCourseLedgerQueryRequest,
): Promise<PageResult<RationalityAuditCourseLedgerItemVO>> {
  return http.post<PageResult<RationalityAuditCourseLedgerItemVO>>(
    '/api/quality/rationality-audits/course-ledger/page',
    request,
  )
}
