import type { PortfolioTeacherLifecycleStatusCode } from '@/apis/portfolio/teacher-lifecycle'
import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/types'
import http from '@/config/axios'

export interface PortfolioTeacherCohortProfileVO {
  teacherId: string
  jobLevel?: string
  majorGroupCode?: string
  majorGroupName?: string
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
  /** 归属教师多身份并列层（ACTIVE 身份；§8.50 / US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string
}

export interface PortfolioTeacherCohortProfileSaveRequest {
  teacherId: string
  jobLevel?: string
  majorGroupCode?: string
  majorGroupName?: string
}

export const portfolioTeacherCohortProfileApi = {
  get: (id: string) =>
    http.post<PortfolioTeacherCohortProfileVO>('/api/portfolio/teacher-cohort-profile/get', { id }),
  save: (data: PortfolioTeacherCohortProfileSaveRequest) =>
    http.post<void>('/api/portfolio/teacher-cohort-profile/save', data),
}
