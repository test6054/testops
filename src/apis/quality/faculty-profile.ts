/**
 * 认证师资档案 API - 对接 FacultyProfileController
 *
 * 后端路径：/api/quality/faculty-profiles
 */
import type { PageResult, QueryDto } from '@/types'
import type { FacultyProfileStatusCode } from '@/types/enums/faculty-profile-status-enum'
import http from '@/config/axios'

const BASE = '/api/quality/faculty-profiles'

export interface FacultyProfileQueryRequest extends QueryDto {
  trainingPlanId: string
  keyword?: string
  department?: string
  title?: string
}

export interface FacultyProfileSaveRequest {
  id?: string
  trainingPlanId: string
  teacherUserId: string
  teacherName: string
  teacherNo: string
  title: string
  department: string
  hasTeachingEthicsTraining: boolean
  ethicsTrainingDate: string
  teachingEvaluation: string
  researchDirection?: string
  courses: string
  engineeringPracticeExperience: string
  engineeringAbilityEvidence: string
  teacherDevelopmentRecord: string
  teachingReformContribution: string
  graduationDesignGuidance: string
}

export interface FacultyProfileVO {
  id: string
  trainingPlanId: string
  teacherUserId: string
  teacherName: string
  teacherNo: string
  title: string
  department: string
  hasTeachingEthicsTraining: boolean
  ethicsTrainingDate: string
  teachingEvaluation: string
  researchDirection?: string
  courses: string
  engineeringPracticeExperience: string
  engineeringAbilityEvidence: string
  teacherDevelopmentRecord: string
  teachingReformContribution: string
  graduationDesignGuidance: string
  profileStatus: FacultyProfileStatusCode
  createTime?: string
  updateTime?: string
}

export const facultyProfileApi = {
  page: (data: FacultyProfileQueryRequest) =>
    http.post<PageResult<FacultyProfileVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<FacultyProfileVO>(`${BASE}/detail`, { id }),
  create: (data: FacultyProfileSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: FacultyProfileSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
}
