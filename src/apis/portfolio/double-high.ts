import type { PortfolioTeacherLifecycleStatusCode } from '@/apis/portfolio/teacher-lifecycle'
import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/types'
import type { PageResult, QueryDto } from '@/types'
import type { PortfolioDoubleHighStageReviewStatusCode } from '@/types/enums/portfolio-double-high-stage-review-status-enum'
import type { PortfolioDoubleHighTaskStatusCode } from '@/types/enums/portfolio-double-high-task-status-enum'
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
  materialRef?: { archiveRecordIds: string[] }
  submitTime?: string
  reviewStatus?: PortfolioDoubleHighStageReviewStatusCode
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
  taskStatus: PortfolioDoubleHighTaskStatusCode
  currentStageIndex: number
  totalStageCount: number
  acceptanceFileNodeId?: string
  acceptanceFileName?: string
  acceptanceExportApprovalId?: string
  voidReason?: string
  voidUserId?: string
  voidTime?: string
  stages: PortfolioDoubleHighTaskStageVO[]
  createTime: string
  responsibleIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  responsibleMultiIdentityNote?: string
  /** 责任人生命周期状态编码（台账可见不默认过滤；结构态仅标注） */
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  /** 责任人生命周期状态标签 */
  lifecycleStatusLabel?: string
  /** 责任人档案写禁 */
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  /** 责任人是否计入当前在岗结构 */
  countsInCurrentFacultyStructure?: boolean
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
  taskStatus?: PortfolioDoubleHighTaskStatusCode
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

  /** 归属教师生命周期状态编码（台账可见不默认过滤；结构态仅标注） */
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  /** 归属教师生命周期状态标签 */
  lifecycleStatusLabel?: string
  /** 档案写禁 */
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  /** 是否计入当前在岗结构 */
  countsInCurrentFacultyStructure?: boolean
  /** 归属教师多身份并列层（ACTIVE 身份；§8.50 / US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string
}

export const portfolioDoubleHighApi = {
  getMonitor: (data: PortfolioDoubleHighMonitorGetRequest = {}) =>
    http.post<PortfolioDoubleHighMonitorVO>(`${BASE}/monitor/get`, data),
  pageTasks: (data: PortfolioDoubleHighTaskPageRequest) =>
    http.post<PageResult<PortfolioDoubleHighTaskVO>>(`${BASE}/task/page`, data),
  getTask: (data: { id: string }) => http.post<PortfolioDoubleHighTaskVO>(`${BASE}/task/get`, data),
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
  submitStage: (data: {
    id: string
    stageIndex: number
    materialRef: { archiveRecordIds: string[] }
  }) => http.post<PortfolioDoubleHighTaskVO>(`${BASE}/task/stage/submit`, data),
  enterStageReview: (data: { id: string }) =>
    http.post<PortfolioDoubleHighTaskVO>(`${BASE}/task/stage/enter-review`, data),
  reviewStage: (data: {
    id: string
    stageIndex: number
    approved: boolean
    reviewComment?: string
  }) => http.post<PortfolioDoubleHighTaskVO>(`${BASE}/task/stage/review`, data),
  voidTask: (data: { id: string, voidReason: string }) =>
    http.post<PortfolioDoubleHighTaskVO>(`${BASE}/task/void`, data),
  archiveTask: (data: { id: string }) =>
    http.post<PortfolioDoubleHighTaskVO>(`${BASE}/task/archive`, data),
}
