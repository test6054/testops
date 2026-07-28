import type { PortfolioTeacherLifecycleStatusCode } from '@/apis/portfolio/teacher-lifecycle'
import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import type { PortfolioEthicsEventTypeCode } from '@/types/enums/portfolio-ethics-event-type-enum'
import type { PortfolioEthicsImpactScopeCode } from '@/types/enums/portfolio-ethics-impact-scope-enum'
import type { PortfolioEthicsReviewConclusionCode } from '@/types/enums/portfolio-ethics-review-conclusion-enum'
import type { PortfolioEthicsSanctionStatusCode } from '@/types/enums/portfolio-ethics-sanction-status-enum'
import http from '@/config/axios'

export interface PortfolioEthicsSanctionVO {
  id: string
  teacherId: string
  /** edu-user 教师姓名；有快照时优先快照 */
  teacherName?: string
  /** edu-user 教师工号；有快照时优先快照 */
  teacherNumber?: string
  eventType: PortfolioEthicsEventTypeCode
  handlingBasis: string
  sanctionStartDate: string
  sanctionEndDate: string
  impactScope: PortfolioEthicsImpactScopeCode
  releaseCondition: string
  reviewDepartment: string
  sanctionStatus: PortfolioEthicsSanctionStatusCode
  constraintActive: boolean
  publicSummary: string
  detailDescription?: string
  lastReviewConclusion?: PortfolioEthicsReviewConclusionCode
  lastReviewOpinion?: string
  lastReviewedTime?: string
  updateTime: string
  statusVersion: number
  decisionDocNo?: string
  decisionFileId?: string
  decisionIssuingOrg?: string
  decisionDate?: string
  evidenceFingerprint?: string
  teacherNameSnapshot?: string
  teacherNumberSnapshot?: string
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
  /** 归属教师多身份并列层（US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份说明 */
  ownerMultiIdentityNote?: string
}

export interface PortfolioEthicsConstraintStatusVO {
  teacherId: string
  constrained: boolean
  redlineCoefficient: string
  activeSanctionCount: number
  publicSummary?: string
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
  /** 归属教师多身份并列层（US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份说明 */
  ownerMultiIdentityNote?: string
}

export interface PortfolioEthicsReviewLogVO {
  id: string
  sanctionId: string
  fromStatus: PortfolioEthicsSanctionStatusCode
  toStatus: PortfolioEthicsSanctionStatusCode
  reviewConclusion: PortfolioEthicsReviewConclusionCode
  reviewOpinion?: string
  previousEndDate?: string
  newEndDate?: string
  createUser: string
  createTime: string
}

export interface PortfolioEthicsSanctionSaveRequest {
  teacherId: string
  eventType: PortfolioEthicsEventTypeCode
  handlingBasis: string
  sanctionStartDate: string
  sanctionEndDate: string
  impactScope: PortfolioEthicsImpactScopeCode
  releaseCondition: string
  reviewDepartment: string
  publicSummary: string
  detailDescription?: string
  decisionDocNo: string
  decisionFileId: string
  decisionIssuingOrg: string
  decisionDate: string
}

export interface PortfolioEthicsReviewSubmitRequest {
  sanctionId: string
  reviewConclusion: PortfolioEthicsReviewConclusionCode
  reviewOpinion?: string
  newSanctionEndDate?: string
  statusVersion: number
}

export interface PortfolioEthicsEarlyReviewRequest {
  sanctionId: string
  statusVersion: number
}

export const portfolioEthicsSanctionApi = {
  page: (data: {
    pageNum?: number
    pageSize?: number
    teacherId?: string
    sanctionStatus?: PortfolioEthicsSanctionStatusCode
    constraintActive?: number
  }) =>
    http.post<PageResult<PortfolioEthicsSanctionVO>>('/api/portfolio/ethics-sanction/page', data),

  get: (data: { id: string }) =>
    http.post<PortfolioEthicsSanctionVO>('/api/portfolio/ethics-sanction/get', data),

  save: (data: PortfolioEthicsSanctionSaveRequest) =>
    http.post<string>('/api/portfolio/ethics-sanction/save', data),

  requestEarlyReview: (data: PortfolioEthicsEarlyReviewRequest) =>
    http.post<PortfolioEthicsSanctionVO>('/api/portfolio/ethics-sanction/review/early', data),

  submitReview: (data: PortfolioEthicsReviewSubmitRequest) =>
    http.post<PortfolioEthicsSanctionVO>('/api/portfolio/ethics-sanction/review/submit', data),

  listReviewLogs: (data: { id: string }) =>
    http.post<PortfolioEthicsReviewLogVO[]>('/api/portfolio/ethics-sanction/review-log/list', data),

  getConstraint: (data: { teacherId: string }) =>
    http.post<PortfolioEthicsConstraintStatusVO>(
      '/api/portfolio/ethics-sanction/constraint/get',
      data,
    ),
}

export type { PortfolioEthicsSanctionStatusCode }
