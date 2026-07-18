import type { PageResult } from '@/types'
import http from '@/config/axios'

/** 对齐后端 PortfolioExpertMaterialScope */
export interface PortfolioExpertMaterialScope {
  categoryCodes: string[]
  categoryIds?: string[]
}

export interface PortfolioExpertAssignmentVO {
  id: string
  evaluationTaskId: string
  evaluationTaskName?: string
  expertUserId: string
  subjectTeacherIds: string[]
  materialScope: PortfolioExpertMaterialScope
  accessToken?: string
  maskRequired: boolean
  assignmentStatus: string
  expireTime: string
  createTime: string
}

export interface PortfolioExpertAssignmentSubjectTeacherVO {
  /** 脱敏稳定引用，如 T01；maskRequired 时作为行键 */
  subjectRef?: string
  /** 脱敏时后端不返回 */
  teacherUserId?: string
  maskedDisplayName: string
}

export interface PortfolioExpertReviewMaterialItemVO {
  /** 脱敏材料稳定引用，如 M0001；maskRequired 时作为行键 */
  materialRef?: string
  /** 脱敏时后端不返回 */
  teacherUserId?: string
  maskedTeacherLabel: string
  /** 脱敏时后端不返回 */
  archiveRecordId?: string
  /** 脱敏时后端不返回 */
  categoryId?: string
  categoryCode?: string
  categoryName?: string
  academicYear?: string
  documentVersionNo?: number
  sourceType?: string
  hasPrimaryFile: boolean
  fileNodeId?: string
  supportMaterialCount: number
  /** 是否关联正式 AI 初审结果 */
  hasAiPreReview?: boolean
  /** AI 初审结论编码 */
  aiPreReviewConclusionCode?: string
  /** AI 初审结果标题；maskRequired 时不返回 */
  aiPreReviewResultTitle?: string
  /** AI 初审摘要；maskRequired 时不返回 */
  aiPreReviewSummary?: string
  /** 身份用途切片 CAMPUS / EXTERNAL / SHARED */
  identityScope?: string
  /** 是否可用于校内硬性条件 */
  usableForCampusHardCriteria?: boolean
}

export interface PortfolioExpertAssignmentReviewBundleVO {
  assignmentId: string
  evaluationTaskId: string
  evaluationTaskName: string
  maskRequired: boolean
  materialScope: PortfolioExpertMaterialScope
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
    materialScope: PortfolioExpertMaterialScope
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
  reviewBundle: (data: { accessToken?: string, assignmentId?: string }) =>
    http.post<PortfolioExpertAssignmentReviewBundleVO>(
      '/api/portfolio/expert-assignment/review-bundle',
      data,
    ),
}
