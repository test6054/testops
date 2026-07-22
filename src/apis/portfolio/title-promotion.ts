import type { PortfolioTeacherLifecycleStatusCode } from '@/apis/portfolio/teacher-lifecycle'
import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import type { PortfolioTitleCriteriaChangeActionCode } from '@/types/enums/portfolio-title-criteria-change-action-enum'
import type { PortfolioTitleCriteriaCheckTypeCode } from '@/types/enums/portfolio-title-criteria-check-type-enum'
import type { PortfolioTitleCriteriaGateKindCode } from '@/types/enums/portfolio-title-criteria-gate-kind-enum'
import type { PortfolioTitleCriteriaPathCode } from '@/types/enums/portfolio-title-criteria-path-code-enum'
import type { PortfolioTitleCriteriaSatisfyModeCode } from '@/types/enums/portfolio-title-criteria-satisfy-mode-enum'
import type { PortfolioTitleEvidenceTypeCode } from '@/types/enums/portfolio-title-evidence-type-enum'
import type { PortfolioTitleJobCategoryCode } from '@/types/enums/portfolio-title-job-category-enum'
import type { PortfolioTitlePromotionApplicationStatusCode } from '@/types/enums/portfolio-title-promotion-application-status-enum'
import type { PortfolioTitlePromotionFlowStageStatusCode } from '@/types/enums/portfolio-title-promotion-flow-stage-status-enum'
import type { PortfolioTitlePromotionTaskStatusCode } from '@/types/enums/portfolio-title-promotion-task-status-enum'
import http from '@/config/axios'

export interface PortfolioTitleTaskCriteriaVO {
  id: string
  taskId: string
  criteriaCode: string
  criteriaTitle: string
  criteriaDescription?: string
  gateKind: PortfolioTitleCriteriaGateKindCode
  checkType: PortfolioTitleCriteriaCheckTypeCode
  satisfyMode: PortfolioTitleCriteriaSatisfyModeCode
  groupCode?: string
  groupMinimumCount?: number
  pathCode: PortfolioTitleCriteriaPathCode
  jobCategory?: PortfolioTitleJobCategoryCode
  expectedValue?: string
  evidenceCategoryCode?: string
  blockOnFail: boolean
  sourceTemplateId?: string
  frozen: boolean
  sortNo?: number
  autoEvaluable?: boolean
}

export interface PortfolioTitleCriteriaTemplateVO {
  id: string
  templateCode: string
  templateTitle: string
  criteriaDescription?: string
  gateKind: PortfolioTitleCriteriaGateKindCode
  checkType: PortfolioTitleCriteriaCheckTypeCode
  satisfyMode: PortfolioTitleCriteriaSatisfyModeCode
  groupCode?: string
  groupMinimumCount?: number
  pathCode: PortfolioTitleCriteriaPathCode
  jobCategory?: PortfolioTitleJobCategoryCode
  expectedValue?: string
  evidenceCategoryCode?: string
  blockOnFail: boolean
  enabled: boolean
  sortNo?: number
  updateTime?: string
}

export interface PortfolioTitleCriteriaResultItemVO {
  taskCriteriaId: string
  criteriaCode: string
  criteriaTitle: string
  criteriaDescription?: string
  gateKind: PortfolioTitleCriteriaGateKindCode
  checkType: PortfolioTitleCriteriaCheckTypeCode
  groupCode?: string
  groupMinimumCount?: number
  satisfyMode?: PortfolioTitleCriteriaSatisfyModeCode
  expectedValue?: string
  evidenceCategoryCode?: string
  satisfied: boolean
  blockOnFail: boolean
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
  taskCriteria: PortfolioTitleTaskCriteriaVO[]
  taskStatus: PortfolioTitlePromotionTaskStatusCode
  publishTime?: string
  updateTime: string
}

export interface PortfolioTitlePromotionApplicationVO {
  id?: string
  taskId: string
  taskName?: string
  targetTitleLevel?: string
  teacherUserId: string
  /** edu-user 教师姓名 */
  teacherName?: string
  /** edu-user 教师工号 */
  teacherNumber?: string
  applicationNo?: string
  applicationStatus: PortfolioTitlePromotionApplicationStatusCode
  pathCode?: PortfolioTitleCriteriaPathCode
  jobCategory?: PortfolioTitleJobCategoryCode
  hardRate?: string
  materialRate?: string
  performanceRate?: string
  matchScore?: string
  hardPass: boolean
  performancePass: boolean
  criteriaResults?: PortfolioTitleCriteriaResultItemVO[]
  evidenceItems?: PortfolioTitleEvidenceItem[]
  canSubmit?: boolean
  commitmentRequired?: boolean
  blockingCriteriaIds?: string[]
  redlineBlocked: boolean
  redlineCoefficient?: string
  commitmentConfirmed: boolean
  selectionConfirmed?: boolean
  bagFileNodeId?: string
  collegeOpinion?: string
  hrOpinion?: string
  expertOpinion?: string
  expertAuditTime?: string
  publicityStartTime?: string
  publicityEndTime?: string
  publicityRemark?: string
  updateTime?: string
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
  /** 归属教师多身份并列层（US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份说明 */
  ownerMultiIdentityNote?: string
}

export interface PortfolioTitleEvidenceItem {
  taskCriteriaId: string
  evidenceType: PortfolioTitleEvidenceTypeCode
  evidenceRefId?: string
  evidenceNote?: string
}

export interface PortfolioTitleTaskCriteriaItem {
  id?: string
  criteriaCode: string
  criteriaTitle: string
  criteriaDescription?: string
  gateKind: PortfolioTitleCriteriaGateKindCode
  checkType: PortfolioTitleCriteriaCheckTypeCode
  satisfyMode: PortfolioTitleCriteriaSatisfyModeCode
  groupCode?: string
  groupMinimumCount?: number
  pathCode: PortfolioTitleCriteriaPathCode
  jobCategory?: PortfolioTitleJobCategoryCode
  expectedValue?: string
  evidenceCategoryCode?: string
  blockOnFail: boolean
  sourceTemplateId?: string
  sortNo?: number
}

export interface PortfolioTitlePromotionTaskSaveRequest {
  id?: string
  taskName: string
  targetTitleLevel: string
  reviewYear: string
  periodStart?: string
  periodEnd?: string
}

export interface PortfolioTitlePromotionApplicationSaveRequest {
  id?: string
  taskId: string
  teacherUserId?: string
  pathCode: PortfolioTitleCriteriaPathCode
  jobCategory?: PortfolioTitleJobCategoryCode
  commitmentConfirmed?: boolean
  selectionConfirmed?: boolean
  evidenceItems: PortfolioTitleEvidenceItem[]
}

export interface PortfolioTitleTaskCriteriaChangeItemVO {
  id: string
  changeAction: PortfolioTitleCriteriaChangeActionCode
  taskCriteriaId?: string
  criteriaCode?: string
  criteriaTitle?: string
  changeNote?: string
}

export interface PortfolioTitleTaskCriteriaChangeLogVO {
  id: string
  taskId: string
  changeReason: string
  beforeCriteriaCount: number
  afterCriteriaCount: number
  createUser?: string
  createTime?: string
  items: PortfolioTitleTaskCriteriaChangeItemVO[]
}

export interface PortfolioTitlePromotionFlowStageVO {
  stageKey: PortfolioTitlePromotionApplicationStatusCode
  title: string
  description: string
  stageStatus: PortfolioTitlePromotionFlowStageStatusCode
  exceptionEmphasis?: boolean
}

export interface PortfolioTitlePromotionFlowCriteriaBriefVO {
  taskCriteriaId: string
  criteriaCode: string
  criteriaTitle: string
  gateKind: PortfolioTitleCriteriaGateKindCode
  pathCode: PortfolioTitleCriteriaPathCode
  jobCategory?: PortfolioTitleJobCategoryCode
}

export interface PortfolioTitlePromotionFlowViewVO {
  taskId: string
  applicationId?: string
  pathCode: PortfolioTitleCriteriaPathCode
  jobCategory?: PortfolioTitleJobCategoryCode
  jobCategoryRequired: boolean
  applicationStatus: PortfolioTitlePromotionApplicationStatusCode
  activeStageKey: PortfolioTitlePromotionApplicationStatusCode
  pathGuidance: string
  jobGuidance: string
  exceptionPath: boolean
  hardCriteriaCount: number
  performanceCriteriaCount: number
  commonCriteriaCount: number
  pathSpecificCriteriaCount: number
  jobSpecificCriteriaCount: number
  stages: PortfolioTitlePromotionFlowStageVO[]
  applicableCriteria: PortfolioTitlePromotionFlowCriteriaBriefVO[]
}

export const portfolioTitlePromotionApi = {
  pageTask: (data: {
    pageNum?: number
    pageSize?: number
    taskStatus?: PortfolioTitlePromotionTaskStatusCode
    reviewYear?: string
    locateTaskId?: string
  }) =>
    http.post<PageResult<PortfolioTitlePromotionTaskVO>>(
      '/api/portfolio/title-promotion/task/page',
      data,
    ),

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
    locateApplicationId?: string
  }) =>
    http.post<PageResult<PortfolioTitlePromotionApplicationVO>>(
      '/api/portfolio/title-promotion/application/page',
      data,
    ),

  getApplication: (id: string) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/get',
      { id },
    ),

  getMineByTask: (data: { taskId: string; teacherUserId?: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO | null>(
      '/api/portfolio/title-promotion/application/mine-by-task',
      data,
    ),

  getFlowView: (data: {
    applicationId?: string
    taskId?: string
    pathCode?: PortfolioTitleCriteriaPathCode
    jobCategory?: PortfolioTitleJobCategoryCode
  }) =>
    http.post<PortfolioTitlePromotionFlowViewVO>(
      '/api/portfolio/title-promotion/application/flow-view',
      data,
    ),

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
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/submit',
      data,
    ),

  collegeApprove: (data: { id: string; opinion?: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/college-approve',
      data,
    ),

  collegeReturn: (data: { id: string; opinion?: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/college-return',
      data,
    ),

  hrApprove: (data: { id: string; opinion?: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/hr-approve',
      data,
    ),

  hrReturn: (data: { id: string; opinion?: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/hr-return',
      data,
    ),

  hrReject: (data: { id: string; opinion?: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/hr-reject',
      data,
    ),

  expertReview: (data: { id: string; opinion?: string; approve: boolean }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/expert-review',
      data,
    ),

  startPublicity: (data: { id: string; days: number; remark?: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/start-publicity',
      data,
    ),

  archivePublicity: (data: { id: string }) =>
    http.post<PortfolioTitlePromotionApplicationVO>(
      '/api/portfolio/title-promotion/application/archive-publicity',
      data,
    ),

  pageCriteriaTemplate: (data: {
    pageNum?: number
    pageSize?: number
    keyword?: string
    gateKind?: PortfolioTitleCriteriaGateKindCode
    checkType?: PortfolioTitleCriteriaCheckTypeCode
    enabled?: boolean
  }) =>
    http.post<PageResult<PortfolioTitleCriteriaTemplateVO>>(
      '/api/portfolio/title-promotion/criteria-template/page',
      data,
    ),

  saveCriteriaTemplate: (
    data: Partial<PortfolioTitleCriteriaTemplateVO> & {
      templateCode: string
      templateTitle: string
      gateKind: PortfolioTitleCriteriaGateKindCode
      checkType: PortfolioTitleCriteriaCheckTypeCode
      satisfyMode: PortfolioTitleCriteriaSatisfyModeCode
      pathCode: PortfolioTitleCriteriaPathCode
      blockOnFail: boolean
    },
  ) => http.post<string>('/api/portfolio/title-promotion/criteria-template/save', data),

  enableCriteriaTemplate: (data: { id: string; enabled: boolean }) =>
    http.post<void>('/api/portfolio/title-promotion/criteria-template/enable', data),

  getCriteriaTemplate: (data: { id: string }) =>
    http.post<PortfolioTitleCriteriaTemplateVO>(
      '/api/portfolio/title-promotion/criteria-template/get',
      data,
    ),

  listTaskCriteria: (data: { taskId: string }) =>
    http.post<PortfolioTitleTaskCriteriaVO[]>(
      '/api/portfolio/title-promotion/task-criteria/list',
      data,
    ),

  replaceTaskCriteria: (data: {
    taskId: string
    criteriaItems: PortfolioTitleTaskCriteriaItem[]
  }) =>
    http.post<PortfolioTitleTaskCriteriaVO[]>(
      '/api/portfolio/title-promotion/task-criteria/replace',
      data,
    ),

  copyTaskCriteriaFromTemplate: (data: { taskId: string; templateIds: string[] }) =>
    http.post<PortfolioTitleTaskCriteriaVO[]>(
      '/api/portfolio/title-promotion/task-criteria/copy-from-template',
      data,
    ),

  emergencyReplaceTaskCriteria: (data: {
    taskId: string
    changeReason: string
    criteriaItems: PortfolioTitleTaskCriteriaItem[]
  }) =>
    http.post<PortfolioTitleTaskCriteriaVO[]>(
      '/api/portfolio/title-promotion/task-criteria/emergency-replace',
      data,
    ),

  pageTaskCriteriaChangeLog: (data: { taskId: string; pageNum?: number; pageSize?: number }) =>
    http.post<PageResult<PortfolioTitleTaskCriteriaChangeLogVO>>(
      '/api/portfolio/title-promotion/task-criteria/change-log/page',
      data,
    ),
}
