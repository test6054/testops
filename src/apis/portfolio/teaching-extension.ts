import type { PortfolioArchiveRecordStatusCode } from '@/types/enums/portfolio-archive-record-status-enum'
import type { PortfolioTeachingExtensionKindCode } from '@/types/enums/portfolio-teaching-extension-kind-enum'
import http from '@/config/axios'

export interface PortfolioTeachingExtensionActivityVO {
  id: string
  teacherUserId: string
  activityKind: PortfolioTeachingExtensionKindCode
  activityKindName?: string
  categoryCode: string
  categoryName?: string
  activityName: string
  activityType?: string
  startDate?: string
  endDate?: string
  creditHours?: number
  reflectionText?: string
  descriptionText?: string
  fileId?: string
  archiveRecordId?: string
  archiveRecordStatus?: PortfolioArchiveRecordStatusCode
  archiveCategoryId?: string
  updateTime?: string
  /** 生命周期状态编码 ACTIVE/SEALED/TEMP_HOLD 等 */
  lifecycleStatus?: string
  /** 生命周期状态中文标签 */
  lifecycleStatusLabel?: string
  /** 是否禁止档案写 */
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  /** 是否计入当前在岗结构 */
  countsInCurrentFacultyStructure?: boolean

}

export interface PortfolioTrainingArchivePrepareVO {
  activityId: string
  archiveRecordId: string
  categoryId: string
  archiveRecordStatus: PortfolioArchiveRecordStatusCode
  missingRequiredFieldCodes: string[]
}

export interface PortfolioTeachingExtensionCategoryVO {
  id?: string
  categoryCode: string
  categoryName: string
  preset?: boolean
}

export interface PortfolioTeachingExtensionListRequest {
  teacherId?: string
  activityKind?: PortfolioTeachingExtensionKindCode
}

export interface PortfolioTeachingExtensionSaveRequest {
  id?: string
  trainingRecommendationId?: string
  teacherId?: string
  activityKind: PortfolioTeachingExtensionKindCode
  categoryCode: string
  activityName: string
  activityType?: string
  startDate?: string
  endDate?: string
  creditHours?: number
  reflectionText?: string
  descriptionText?: string
  fileId?: string
}

export interface PortfolioTeachingExtensionDeleteRequest {
  id: string
  teacherId?: string
}

export interface PortfolioTeachingExtensionCategoryCreateRequest {
  categoryName: string
  teacherId?: string
}

export interface PortfolioTeachingExtensionCategoryDeleteRequest {
  id: string
  teacherId?: string
}

export const portfolioTeachingExtensionApi = {
  list: (request: PortfolioTeachingExtensionListRequest = {}) =>
    http.post<PortfolioTeachingExtensionActivityVO[]>(
      '/api/portfolio/teaching-extension/list',
      request,
    ),
  save: (request: PortfolioTeachingExtensionSaveRequest) =>
    http.post<string>('/api/portfolio/teaching-extension/save', request),
  delete: (request: PortfolioTeachingExtensionDeleteRequest) =>
    http.post<void>('/api/portfolio/teaching-extension/delete', request),
  prepareTrainingArchiveDraft: (id: string) =>
    http.post<PortfolioTrainingArchivePrepareVO>(
      '/api/portfolio/teaching-extension/training/prepare-archive',
      { id },
    ),
  listCategories: (request: PortfolioTeachingExtensionListRequest = {}) =>
    http.post<PortfolioTeachingExtensionCategoryVO[]>(
      '/api/portfolio/teaching-extension/category/list',
      request,
    ),
  createCategory: (request: PortfolioTeachingExtensionCategoryCreateRequest) =>
    http.post<string>('/api/portfolio/teaching-extension/category/create', request),
  deleteCategory: (request: PortfolioTeachingExtensionCategoryDeleteRequest) =>
    http.post<void>('/api/portfolio/teaching-extension/category/delete', request),
}
