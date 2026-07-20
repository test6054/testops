import type { PortfolioArchiveBagExportResultVO } from '@/apis/portfolio/bag-types'
import type { PortfolioPortraitDimensionCode } from '@/apis/portfolio/enums'
import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/multi-identity'
import type {
  PortfolioTeacherPkCompareVO,
  PortfolioTeacherRecommendPkCompareRequest,
} from '@/apis/portfolio/teacher-platform'
import type { PortfolioCockpitSummaryVO, PortfolioDigitalLiteracyVO,
  PortfolioEducatingOutcomeContributionVO,
  PortfolioGuidanceContributionVO,
  PortfolioIndustryEducationProjectContributionVO,
  PortfolioIndustryPackSceneScoreVO,
  PortfolioMasterpieceContributionVO,
  PortfolioTeacherCompletenessGetRequest,
  PortfolioTeacherPortraitCohortCompareVO,
  PortfolioTeacherPortraitGetRequest,
  PortfolioTeacherPortraitIndicatorDetailRequest,
  PortfolioTeacherPortraitIndicatorDetailVO,
  PortfolioTeacherPortraitTrendGetRequest,
  PortfolioTeacherPortraitTrendVO,
  PortfolioTeacherPortraitVO,
  PortfolioTeacherProgressCockpitGetRequest,
  PortfolioTeacherProgressCockpitVO,
  PortfolioTeacherWorkbenchSummaryVO,
  PortfolioTeachingWorkloadByIdentityVO,
  PortfolioTextbookContributionVO,
  PortfolioVirtualTeachingRoomContributionVO } from '@/apis/portfolio/types'
import type { IdRequest, PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

export interface PortfolioAnalysisAlertVO {
  id: string
  teacherId: string
  teacherName?: string
  teacherNumber?: string
  departmentName?: string
  alertType: string
  alertStatus: string
  indicatorCode?: string
  alertTitle: string
  alertSummary?: string
  ruleSnapshotId?: string
  portraitComputedTime?: string

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
  /** 归属教师多身份并列层（ACTIVE 身份；§8.50 / US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string
}

export interface PortfolioAnalysisSuggestionVO {
  id: string
  teacherId: string
  suggestionType: string
  suggestionTitle: string
  suggestionContent: string
  indicatorCode?: string
  priorityLevel: string
  ruleSnapshotId?: string
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

  /** 归属教师多身份并列层（ACTIVE 身份；§8.50 / US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string
}

export interface PortfolioAnalysisTrainingRecommendVO {
  id: string
  teacherId: string
  recommendTitle: string
  recommendReason: string
  indicatorCode?: string
  dimensionCode: string
  recommendStatus: string
  trainingActivityId?: string
  ruleSnapshotId?: string
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

  /** 归属教师多身份并列层（ACTIVE 身份；§8.50 / US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string
}

export interface PortfolioPortraitCreditCurvePointVO {
  academicYear: string
  cumulativeCredits: string
  yearCredits: string
  officialRecordCount: number
}

export interface PortfolioPortraitCreditCurveVO {
  teacherId: string
  dataSource: string
  totalCredits: string
  points: PortfolioPortraitCreditCurvePointVO[]
  creditCategory?: string
  availableCategories?: string[]
  trendNote?: string | null
  officialFactCount?: number
  dedupDroppedCount?: number
  lifecycleStatus?: string
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
  /** 归属教师多身份并列层（ACTIVE 身份；§8.50 / US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string
}

export interface PortfolioAnalysisComplianceAlertVO {
  id: string
  scopeType: string
  departmentId?: string
  departmentName?: string
  alertType: string
  alertStatus: string
  currentValue?: string
  thresholdValue?: string
  alertSummary: string
  computedTime: string
}

export interface PortfolioSchoolPortraitCockpitVO {
  summary: PortfolioCockpitSummaryVO
  computedTime: string
  complianceAlerts: PortfolioAnalysisComplianceAlertVO[]
}

export interface PortfolioDepartmentPortraitVO {
  departmentId: string
  departmentName: string
  teacherCount: number
  portraitTeacherCount: number
  avgCompositeScore: string
  avgTeachingScore: string
  avgResearchScore: string
  avgTrainingScore: string
  avgPracticeScore: string
  dualTeacherCount: number
  computedTime: string
  complianceAlerts: PortfolioAnalysisComplianceAlertVO[]
}

export interface PortfolioAnalysisAnnualReportVO {
  id: string
  teacherId: string
  teacherName?: string
  teacherNumber?: string
  reportYear: string
  taskStatus: string
  aiTaskId?: string
  errorSummary?: string
  createTime: string
  lifecycleStatus?: string
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
  /** 归属教师多身份并列层（ACTIVE 身份；§8.50 / US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string
}


export interface PortfolioTeacherPkSessionCreateRequest {
  teacherUserIds: string[]
  dimensionCodes: PortfolioPortraitDimensionCode[]
  sessionPurpose: string
  maskMode: boolean
}

export interface PortfolioTeacherPkSessionVO {
  id: string
  sessionPurpose: string
  teacherCount: number
  maskMode: boolean
  createUser: string
  createTime: string
}


/** §8.48 聘期滚动评价 */
export interface PortfolioAppointmentPeriodYearScoreVO {
  year?: number
  annualScore?: number | string
  weight?: number | string
  weightedContribution?: number | string
  weightedInRollup?: boolean
  referencedTaskIds?: string[]
  referencedTaskNames?: string[]
  sourceSceneCode?: string
}

export interface PortfolioAppointmentPeriodKeyAchievementVO {
  processSessionId?: string
  title?: string
  sessionDate?: string
  referenceNote?: string
}

export interface PortfolioAppointmentPeriodRiskItemVO {
  sanctionId?: string
  impactScope?: string
  publicSummary?: string
  sanctionStartDate?: string
  sanctionEndDate?: string
  referenceNote?: string
}

export interface PortfolioAppointmentPeriodEvaluationVO {
  formulaLabel?: string
  teacherId?: string
  cycleSceneCode?: string
  cycleSceneLabel?: string
  annualSourceSceneCode?: string
  periodStart?: string
  periodEnd?: string
  weightedAnnualScore?: number | string
  keyAchievementBonus?: number | string
  riskDeduction?: number | string
  compositeScore?: number | string
  weightedYearCount?: number
  yearScores?: PortfolioAppointmentPeriodYearScoreVO[]
  keyAchievements?: PortfolioAppointmentPeriodKeyAchievementVO[]
  riskItems?: PortfolioAppointmentPeriodRiskItemVO[]
  evidenceNotes?: string[]
  /** 贡献教师多身份并列层 */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 贡献教师多身份口径说明 */
  ownerMultiIdentityNote?: string
  lifecycleStatus?: string
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
}

export interface PortfolioAppointmentPeriodEvaluationGetRequest {
  teacherId?: string
  periodStart: string
  periodEnd: string
  cycleSceneCode?: 'APPOINTMENT' | 'TITLE_REVIEW' | 'DOUBLE_HIGH_CYCLE' | 'ACADEMIC_YEAR'
}

export const portfolioAnalysisApi = {
  getWorkbenchSummary: (data: PortfolioTeacherCompletenessGetRequest = {}) =>
    http.post<PortfolioTeacherWorkbenchSummaryVO>(
      '/api/portfolio/analysis/workbench-summary/get',
      data,
    ),
  getProgressCockpit: (data: PortfolioTeacherProgressCockpitGetRequest = {}) =>
    http.post<PortfolioTeacherProgressCockpitVO>(
      '/api/portfolio/analysis/progress-cockpit/get',
      data,
    ),
  getPortrait: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioTeacherPortraitVO>('/api/portfolio/portrait/teacher/get', data),
  getDigitalLiteracy: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioDigitalLiteracyVO>('/api/portfolio/portrait/teacher/digital-literacy/get', data),
  getGuidanceContribution: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioGuidanceContributionVO>('/api/portfolio/portrait/teacher/guidance-contribution/get', data),
  getTextbookContribution: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioTextbookContributionVO>('/api/portfolio/portrait/teacher/textbook-contribution/get', data),
  getVirtualTeachingRoomContribution: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioVirtualTeachingRoomContributionVO>(
      '/api/portfolio/portrait/teacher/virtual-teaching-room-contribution/get',
      data,
    ),
  getIndustryEducationProjectContribution: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioIndustryEducationProjectContributionVO>(
      '/api/portfolio/portrait/teacher/industry-education-project-contribution/get',
      data,
    ),
  getTeachingWorkloadByIdentity: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioTeachingWorkloadByIdentityVO>(
      '/api/portfolio/portrait/teacher/teaching-workload-by-identity/get',
      data,
    ),
  getMasterpieceContribution: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioMasterpieceContributionVO>(
      '/api/portfolio/portrait/teacher/masterpiece-contribution/get',
      data,
    ),
  getAppointmentPeriodEvaluation: (data: PortfolioAppointmentPeriodEvaluationGetRequest) =>
    http.post<PortfolioAppointmentPeriodEvaluationVO>(
      '/api/portfolio/portrait/teacher/appointment-period-evaluation/get',
      data,
    ),
  getEducatingOutcomeContribution: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioEducatingOutcomeContributionVO>(
      '/api/portfolio/portrait/teacher/educating-outcome-contribution/get',
      data,
    ),
  getIndustryPackSceneScore: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioIndustryPackSceneScoreVO>(
      '/api/portfolio/portrait/teacher/industry-pack-scene-score/get',
      data,
    ),
  getPortraitCohortCompare: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioTeacherPortraitCohortCompareVO>(
      '/api/portfolio/portrait/teacher/cohort-compare',
      data,
    ),
  getPortraitTrend: (data: PortfolioTeacherPortraitTrendGetRequest = {}) =>
    http.post<PortfolioTeacherPortraitTrendVO>('/api/portfolio/portrait/teacher/trend', data),
  getPortraitIndicatorDetail: (data: PortfolioTeacherPortraitIndicatorDetailRequest) =>
    http.post<PortfolioTeacherPortraitIndicatorDetailVO>(
      '/api/portfolio/portrait/teacher/indicator-detail',
      data,
    ),
  pageAlerts: (data: {
    pageNum: number
    pageSize: number
    teacherId?: string
    alertType?: string
    alertStatus?: string
  }) => http.post<PageResult<PortfolioAnalysisAlertVO>>('/api/portfolio/analysis/alert/page', data),
  listSuggestions: (data: { teacherId: string }) =>
    http.post<PortfolioAnalysisSuggestionVO[]>('/api/portfolio/analysis/suggestion/list', data),
  listTrainingRecommendations: (data: { teacherId: string }) =>
    http.post<PortfolioAnalysisTrainingRecommendVO[]>(
      '/api/portfolio/analysis/recommend/training',
      data,
    ),
  dismissTrainingRecommendation: (data: { recommendationId: string }) =>
    http.post<void>('/api/portfolio/analysis/recommend/training/dismiss', data),
  getCreditCurve: (data: { teacherId: string, creditCategory?: string }) =>
    http.post<PortfolioPortraitCreditCurveVO>('/api/portfolio/portrait/teacher/credit-curve', data),
  getDepartmentPortrait: (data: { departmentId: string }) =>
    http.post<PortfolioDepartmentPortraitVO>('/api/portfolio/portrait/department/get', data),
  getSchoolPortraitCockpit: (data: { campusOrgId?: string } = {}) =>
    http.post<PortfolioSchoolPortraitCockpitVO>('/api/portfolio/portrait/school/cockpit', data),
  pageComplianceAlerts: (data: {
    pageNum: number
    pageSize: number
    scopeType?: string
    departmentId?: string
    alertStatus?: string
  }) =>
    http.post<PageResult<PortfolioAnalysisComplianceAlertVO>>(
      '/api/portfolio/analysis/compliance/page',
      data,
    ),
  pkCompare: (data: PortfolioTeacherRecommendPkCompareRequest) =>
    http.post<PortfolioTeacherPkCompareVO>('/api/portfolio/analysis/pk/compare', data),
  createPkSession: (data: PortfolioTeacherPkSessionCreateRequest) =>
    http.post<PortfolioTeacherPkCompareVO>('/api/portfolio/analysis/pk/session/create', data),
  getPkSession: (data: IdRequest) =>
    http.post<PortfolioTeacherPkCompareVO>('/api/portfolio/analysis/pk/session/get', data),
  pagePkSessions: (data: QueryDto & { mineOnly?: boolean }) =>
    http.post<PageResult<PortfolioTeacherPkSessionVO>>(
      '/api/portfolio/analysis/pk/session/page',
      data,
    ),
  exportPkSession: (data: { sessionId: string, maskMode?: boolean }) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/analysis/pk/export', data),
  generateAnnualReport: (data: { teacherId: string, reportYear: string }) =>
    http.post<PortfolioAnalysisAnnualReportVO>(
      '/api/portfolio/analysis/report/annual/generate',
      data,
    ),
  getAnnualReport: (data: { id: string }) =>
    http.post<PortfolioAnalysisAnnualReportVO>('/api/portfolio/analysis/report/annual/get', data),
  pageAnnualReports: (data: {
    pageNum: number
    pageSize: number
    teacherId?: string
    reportYear?: string
    taskStatus?: string
  }) =>
    http.post<PageResult<PortfolioAnalysisAnnualReportVO>>(
      '/api/portfolio/analysis/report/annual/page',
      data,
    ),
  resolvePortraitAlert: (data: { alertId: string, alertStatus: string, resolveRemark?: string }) =>
    http.post<void>('/api/portfolio/analysis/alert/resolve', data),
  resolveComplianceAlert: (data: {
    alertId: string
    alertStatus: string
    resolveRemark?: string
  }) => http.post<void>('/api/portfolio/analysis/compliance/resolve', data),
}
