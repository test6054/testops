import type { PageResult } from '@/types'
import type { PortfolioTitlePromotionApplicationStatusCode } from '@/types/enums/portfolio-title-promotion-application-status-enum'
import type { PortfolioTitlePromotionTaskStatusCode } from '@/types/enums/portfolio-title-promotion-task-status-enum'
import http from '@/config/axios'

export interface PortfolioTitleHardConditionItem {
  conditionCode: string
  conditionTitle: string
  conditionType: string
  expectedValue?: string
}

export interface PortfolioTitleMatchDetailItem {
  itemCode: string
  itemTitle: string
  itemCategory: string
  satisfied: boolean
  evidenceSummary: string
  gapHint?: string
}

export interface PortfolioTitlePromotionTaskVO {
  id: string
  taskName: string
  targetTitleLevel: string
  reviewYear: string
  periodStart?: string
  periodEnd?: string
  minOfficialArchiveCount: number
  hardConditions: PortfolioTitleHardConditionItem[]
  taskStatus: string
  publishTime?: string
  updateTime: string
}

export interface PortfolioTitlePromotionApplicationVO {
  id?: string
  taskId: string
  taskName?: string
  targetTitleLevel?: string
  teacherUserId: string
  applicationNo?: string
  applicationStatus: string
  selectedOfficialRecordIds: string[]
  hardRate?: string
  materialRate?: string
  indicatorRate?: string
  matchScore?: string
  matchDetails: PortfolioTitleMatchDetailItem[]
  redlineBlocked: boolean
  redlineCoefficient?: string
  commitmentConfirmed: boolean
  bagFileNodeId?: string
  collegeOpinion?: string
  hrOpinion?: string
  expertOpinion?: string
  expertAuditTime?: string
  publicityStartTime?: string
  publicityEndTime?: string
  publicityRemark?: string
  updateTime?: string
}

export interface PortfolioTitlePromotionTaskSaveRequest {
  id?: string
  taskName: string
  targetTitleLevel: string
  reviewYear: string
  periodStart?: string
  periodEnd?: string
  minOfficialArchiveCount: number
}

export interface PortfolioTitlePromotionApplicationSaveRequest {
  id?: string
  taskId: string
  teacherUserId?: string
  selectedOfficialRecordIds: string[]
  commitmentConfirmed?: boolean
}

export const portfolioTitlePromotionApi = {
  pageTask: (data: {
    pageNum?: number
    pageSize?: number
    taskStatus?: PortfolioTitlePromotionTaskStatusCode
    reviewYear?: string
  }) => http.post<PageResult<PortfolioTitlePromotionTaskVO>>('/api/portfolio/title-promotion/task/page', data),

  getTask: (data: { id: string }) =>
    http.post<PortfolioTitlePromotionTaskVO>('/api/portfolio/title-promotion/task/get', data),

  saveTask: (data: PortfolioTitlePromotionTaskSaveRequest) =>
    http.post<string>('/api/portfolio/title-promotion/task/save', data),

  publishTask: (data: { id: string }) =>
    http.post<void>('/api/portfolio/title-promotion/task/publish', data),

  closeTask: (data: { id: string }) =>
    http.post<void>('/api/portfolio/title-promotion/task/close', data),

  pageApplication: (data: {
    pageNum?: number
    pageSize?: number
    taskId?: string
    teacherUserId?: string
    applicationStatus?: PortfolioTitlePromotionApplicationStatusCode
  }) =>
    http.post<PageResult<PortfolioTitlePromotionApplicationVO>>(
      '/api/portfolio/title-promotion/application/page',
      data,
    ),

  getApplication: (data: { id: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>('/api/portfolio/title-promotion/application/get', data),

  saveDraft: (data: PortfolioTitlePromotionApplicationSaveRequest) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/save-draft',
      data,
    ),

  previewMatch: (data: PortfolioTitlePromotionApplicationSaveRequest) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/preview-match',
      data,
    ),

  submit: (data: { id: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>('/api/portfolio/title-promotion/application/submit', data),

  collegeApprove: (data: { id: string, opinion?: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/college-approve',
      data,
    ),

  collegeReturn: (data: { id: string, opinion?: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/college-return',
      data,
    ),

  hrApprove: (data: { id: string, opinion?: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/hr-approve',
      data,
    ),

  hrReturn: (data: { id: string, opinion?: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/hr-return',
      data,
    ),

  hrReject: (data: { id: string, opinion?: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/hr-reject',
      data,
    ),

  expertReview: (data: { id: string, opinion?: string, approve: boolean }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/expert-review',
      data,
    ),

  startPublicity: (data: { id: string, days: number, remark?: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/start-publicity',
      data,
    ),

  archivePublicity: (data: { id: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/archive-publicity',
      data,
    ),
}
