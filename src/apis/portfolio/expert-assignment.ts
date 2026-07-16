import type { PageResult } from '@/types'
import http from '@/config/axios'

export interface PortfolioExpertAssignmentVO {
  id: string
  evaluationTaskId: string
  expertUserId: string
  subjectTeacherIdsJson: string
  materialScopeJson: string
  accessToken?: string
  maskRequired: boolean
  assignmentStatus: string
  expireTime: string
  createTime: string
}

export interface PortfolioExpertAssignmentSubjectTeacherVO {
  teacherUserId: string
  maskedDisplayName: string
}

export interface PortfolioExpertReviewMaterialItemVO {
  teacherUserId: string
  maskedTeacherLabel: string
  archiveRecordId: string
  categoryId: string
  categoryCode?: string
  categoryName?: string
  academicYear?: string
  documentVersionNo?: number
  sourceType?: string
  hasPrimaryFile: boolean
  fileNodeId?: string
  supportMaterialCount: number
}

export interface PortfolioExpertAssignmentReviewBundleVO {
  assignmentId: string
  evaluationTaskId: string
  evaluationTaskName: string
  maskRequired: boolean
  materialScopeJson: string
  assignmentStatus: string
  expireTime: string
  readOnly: boolean
  subjectTeachers: PortfolioExpertAssignmentSubjectTeacherVO[]
  materials: PortfolioExpertReviewMaterialItemVO[]
}

export const portfolioExpertAssignmentApi = {
  create: (data: {
    evaluationTaskId: string
    expertUserId: string
    subjectTeacherIds: string[]
    materialScopeJson: string
    expireDays: number
    maskRequired: boolean
  }) => http.post<PortfolioExpertAssignmentVO>('/api/portfolio/expert-assignment/create', data),
  page: (data: {
    pageNum: number
    pageSize: number
    evaluationTaskId?: string
    expertUserId?: string
    assignmentStatus?: string
  }) =>
    http.post<PageResult<PortfolioExpertAssignmentVO>>(
      '/api/portfolio/expert-assignment/page',
      data,
    ),
  revoke: (data: { id: string }) =>
    http.post<PortfolioExpertAssignmentVO>('/api/portfolio/expert-assignment/revoke', data),
  reviewBundle: (data: { accessToken?: string; assignmentId?: string }) =>
    http.post<PortfolioExpertAssignmentReviewBundleVO>(
      '/api/portfolio/expert-assignment/review-bundle',
      data,
    ),
}
