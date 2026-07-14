import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

export interface PortfolioDoubleHighDimensionScoreVO {
  dimensionCode: string
  dimensionName: string
  weightPercent: string
  dimensionScore: string
  weightedScore: string
}

export interface PortfolioDoubleHighMonitorVO {
  statisticScopeLabel: string
  constructionPeriodLabel?: string
  baselinePeriodLabel?: string
  dataCutoffTime: string
  dataSourceNote: string
  constructionIndex: string
  baselineConstructionIndex?: string
  periodValueAdded?: string
  taskTotalCount: number
  taskTerminalCount: number
  taskCompletionRatePercent: string
  dimensionScores: PortfolioDoubleHighDimensionScoreVO[]
}

export interface PortfolioDoubleHighTaskStageVO {
  id: string
  stageIndex: number
  stageName: string
  stageDeadline?: string
  materialRefJson?: string
  submitTime?: string
  reviewStatus?: string
  reviewComment?: string
  reviewedTime?: string
}

export interface PortfolioDoubleHighTaskVO {
  id: string
  taskCode: string
  taskTitle: string
  taskSource: string
  departmentId?: string
  portfolioOrgId?: string
  publisherUserId: string
  responsibleUserId?: string
  constructionPeriodLabel: string
  baselinePeriodLabel?: string
  periodStartDate?: string
  periodEndDate?: string
  acceptanceCriteria?: string
  taskStatus: string
  currentStageIndex: number
  totalStageCount: number
  acceptanceFileNodeId?: string
  acceptanceFileName?: string
  voidReason?: string
  voidUserId?: string
  voidTime?: string
  stages: PortfolioDoubleHighTaskStageVO[]
  createTime: string
}

export interface PortfolioDoubleHighMonitorGetRequest {
  departmentId?: string
  portfolioOrgId?: string
  constructionPeriodLabel?: string
  baselinePeriodLabel?: string
}

export interface PortfolioDoubleHighTaskPageRequest extends QueryDto {
  departmentId?: string
  portfolioOrgId?: string
  taskStatus?: string
  constructionPeriodLabel?: string
  keyword?: string
}

const BASE = '/api/portfolio/policy/double-high'

export interface PortfolioDoubleHighEvidenceArchiveVO {
  archiveRecordId: string
  teacherId: string
  categoryName?: string
  recordTitle?: string
  academicYear?: string
  fileNodeId?: string
  hasDownloadableFile: boolean
}

export const portfolioDoubleHighApi = {
  getMonitor: (data: PortfolioDoubleHighMonitorGetRequest = {}) =>
    http.post<PortfolioDoubleHighMonitorVO>(`${BASE}/monitor/get`, data),
  pageTasks: (data: PortfolioDoubleHighTaskPageRequest) =>
    http.post<PageResult<PortfolioDoubleHighTaskVO>>(`${BASE}/task/page`, data),
  getTask: (data: { id: string }) =>
    http.post<PortfolioDoubleHighTaskVO>(`${BASE}/task/get`, data),
  listEvidenceArchives: (data: { id: string }) =>
    http.post<PortfolioDoubleHighEvidenceArchiveVO[]>(`${BASE}/task/evidence-archives/list`, data),
  createTask: (data: {
    taskCode: string
    taskTitle: string
    taskSource: string
    departmentId?: string
    portfolioOrgId?: string
    constructionPeriodLabel: string
    baselinePeriodLabel?: string
    periodStartDate?: string
    periodEndDate?: string
    acceptanceCriteria?: string
    stages: Array<{ stageIndex: number, stageName: string, stageDeadline?: string }>
  }) => http.post<PortfolioDoubleHighTaskVO>(`${BASE}/task/create`, data),
  claimTask: (data: { id: string }) =>
    http.post<PortfolioDoubleHighTaskVO>(`${BASE}/task/claim`, data),
  startTask: (data: { id: string }) =>
    http.post<PortfolioDoubleHighTaskVO>(`${BASE}/task/start`, data),
  submitStage: (data: { id: string, stageIndex: number, materialRefJson: string }) =>
    http.post<PortfolioDoubleHighTaskVO>(`${BASE}/task/stage/submit`, data),
  enterStageReview: (data: { id: string }) =>
    http.post<PortfolioDoubleHighTaskVO>(`${BASE}/task/stage/enter-review`, data),
  reviewStage: (data: { id: string, stageIndex: number, approved: boolean, reviewComment?: string }) =>
    http.post<PortfolioDoubleHighTaskVO>(`${BASE}/task/stage/review`, data),
  voidTask: (data: { id: string, voidReason: string }) =>
    http.post<PortfolioDoubleHighTaskVO>(`${BASE}/task/void`, data),
  archiveTask: (data: { id: string }) =>
    http.post<PortfolioDoubleHighTaskVO>(`${BASE}/task/archive`, data),
}
