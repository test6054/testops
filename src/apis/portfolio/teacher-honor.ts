import type { PortfolioHonorLevelCode } from '@/types/enums/portfolio-honor-level-enum'
import http from '@/config/axios'

export interface PortfolioTeacherHonorVO {
  id: string
  teacherUserId: string
  recordTitle: string
  categoryCode: string
  categoryName?: string
  levelCode: PortfolioHonorLevelCode
  levelName?: string
  awardUnit?: string
  recordDate?: string
  descriptionText?: string
  fileId?: string
  updateTime?: string
  affiliationStaffNo?: string
  affiliationDepartmentId?: string

  /** 归属教师生命周期状态编码（台账可见不默认过滤；结构态仅标注） */
  lifecycleStatus?: string
  /** 归属教师生命周期状态标签 */
  lifecycleStatusLabel?: string
  /** 档案写禁 */
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  /** 是否计入当前在岗结构 */
  countsInCurrentFacultyStructure?: boolean
}

export interface PortfolioTeacherHonorCategoryVO {
  id?: string
  categoryCode: string
  categoryName: string
  preset?: boolean
}

export interface PortfolioHonorArchivePrepareVO {
  honorRecordId: string
  archiveRecordId: string
  categoryId: string
  archiveRecordStatus: string
  missingRequiredFieldCodes: string[]
}

export interface PortfolioTeacherHonorListRequest {
  teacherId?: string
}

export interface PortfolioTeacherHonorSaveRequest {
  id?: string
  teacherId?: string
  recordTitle: string
  categoryCode: string
  levelCode: PortfolioHonorLevelCode
  awardUnit?: string
  recordDate?: string
  descriptionText?: string
  fileId?: string
}

export interface PortfolioTeacherHonorDeleteRequest {
  id: string
  teacherId?: string
}

export interface PortfolioTeacherHonorCategoryCreateRequest {
  categoryName: string
  teacherId?: string
}

export interface PortfolioTeacherHonorCategoryDeleteRequest {
  id: string
  teacherId?: string
}

export const portfolioTeacherHonorApi = {
  list: (request: PortfolioTeacherHonorListRequest = {}) =>
    http.post<PortfolioTeacherHonorVO[]>('/api/portfolio/teacher-honor/list', request),
  save: (request: PortfolioTeacherHonorSaveRequest) =>
    http.post<string>('/api/portfolio/teacher-honor/save', request),
  delete: (request: PortfolioTeacherHonorDeleteRequest) =>
    http.post<void>('/api/portfolio/teacher-honor/delete', request),
  listCategories: (request: PortfolioTeacherHonorListRequest = {}) =>
    http.post<PortfolioTeacherHonorCategoryVO[]>(
      '/api/portfolio/teacher-honor/category/list',
      request,
    ),
  createCategory: (request: PortfolioTeacherHonorCategoryCreateRequest) =>
    http.post<string>('/api/portfolio/teacher-honor/category/create', request),
  deleteCategory: (request: PortfolioTeacherHonorCategoryDeleteRequest) =>
    http.post<void>('/api/portfolio/teacher-honor/category/delete', request),
  prepareArchiveDraft: (data: { id: string }) =>
    http.post<PortfolioHonorArchivePrepareVO>(
      '/api/portfolio/teacher-honor/prepare-archive-draft',
      data,
    ),
}
