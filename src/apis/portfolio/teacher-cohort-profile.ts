import http from '@/config/axios'

export interface PortfolioTeacherCohortProfileVO {
  teacherId: string
  jobLevel?: string
  majorGroupCode?: string
  majorGroupName?: string
  lifecycleStatus?: string
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
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
