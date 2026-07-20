import type { PageResult } from '@/types'
import type { PortfolioEthicsEventTypeCode } from '@/types/enums/portfolio-ethics-event-type-enum'
import type { PortfolioEthicsImpactScopeCode } from '@/types/enums/portfolio-ethics-impact-scope-enum'
import type { PortfolioEthicsReviewConclusionCode } from '@/types/enums/portfolio-ethics-review-conclusion-enum'
import type { PortfolioEthicsSanctionStatusCode } from '@/types/enums/portfolio-ethics-sanction-status-enum'
import http from '@/config/axios'

export interface PortfolioEthicsSanctionVO {
  id: string
  teacherId: string
  eventType: string
  handlingBasis: string
  sanctionStartDate: string
  sanctionEndDate: string
  impactScope: string
  releaseCondition: string
  reviewDepartment: string
  sanctionStatus: string
  constraintActive: boolean
  publicSummary: string
  detailDescription?: string
  lastReviewConclusion?: string
  lastReviewOpinion?: string
  lastReviewedTime?: string
  updateTime: string
  lifecycleStatus?: string
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean

}

export interface PortfolioEthicsConstraintStatusVO {
  teacherId: string
  constrained: boolean
  redlineCoefficient: string
  activeSanctionCount: number
  publicSummary?: string
  lifecycleStatus?: string
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
}

export interface PortfolioEthicsReviewLogVO {
  id: string
  sanctionId: string
  fromStatus: string
  toStatus: string
  reviewConclusion: string
  reviewOpinion?: string
  previousEndDate?: string
  newEndDate?: string
  createUser: string
  createTime: string
}

export interface PortfolioEthicsSanctionSaveRequest {
  id?: string
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
}

export interface PortfolioEthicsReviewSubmitRequest {
  sanctionId: string
  reviewConclusion: PortfolioEthicsReviewConclusionCode
  reviewOpinion?: string
  newSanctionEndDate?: string
}

export const portfolioEthicsSanctionApi = {
  page: (data: {
    pageNum?: number
    pageSize?: number
    teacherId?: string
    sanctionStatus?: PortfolioEthicsSanctionStatusCode
    constraintActive?: number
  }) => http.post<PageResult<PortfolioEthicsSanctionVO>>('/api/portfolio/ethics-sanction/page', data),

  get: (data: { id: string }) =>
    http.post<PortfolioEthicsSanctionVO>('/api/portfolio/ethics-sanction/get', data),

  save: (data: PortfolioEthicsSanctionSaveRequest) =>
    http.post<string>('/api/portfolio/ethics-sanction/save', data),

  submitReview: (data: PortfolioEthicsReviewSubmitRequest) =>
    http.post<PortfolioEthicsSanctionVO>('/api/portfolio/ethics-sanction/review/submit', data),

  listReviewLogs: (data: { id: string }) =>
    http.post<PortfolioEthicsReviewLogVO[]>('/api/portfolio/ethics-sanction/review-log/list', data),

  getConstraint: (data: { teacherId: string }) =>
    http.post<PortfolioEthicsConstraintStatusVO>('/api/portfolio/ethics-sanction/constraint/get', data),
}

export type { PortfolioEthicsSanctionStatusCode }
