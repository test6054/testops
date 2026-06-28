import type {
  PortfolioArchiveBagAssembleVO,
  PortfolioArchiveBagExportResultVO,
  PortfolioArchiveBagFilterRequest,
  PortfolioArchiveBagPreviewVO,
  PortfolioArchiveScoreResultVO,
} from '@/apis/portfolio/bag-types'
import type {
  PortfolioDevelopmentPlanStatus,
  PortfolioDevelopmentRecordStatus,
  PortfolioDevelopmentRecordType,
  PortfolioDualTeacherApplicationStatus,
  PortfolioEvaluationMode,
  PortfolioEvaluationTaskStatus,
  PortfolioExternalTeacherDataStatus,
  PortfolioExternalTeacherImportBatchStatus,
  PortfolioKeyTeacherRegistryStatus,
  PortfolioKeyTeacherRegistryType,
  PortfolioPortraitDimension,
  PortfolioTeacherRecommendRunMode,
  PortfolioTeacherRecommendRunStatus,
  PortfolioTeacherRecommendScene,
} from '@/apis/portfolio/enums'
import type { AiTaskStatus } from '@/apis/quality/types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

export const portfolioArchiveBagApi = {
  assemble: (data: PortfolioArchiveBagFilterRequest = {}) =>
    http.post<PortfolioArchiveBagAssembleVO>('/api/portfolio/archive/bag/assemble', data),
  preview: (data: PortfolioArchiveBagFilterRequest = {}) =>
    http.post<PortfolioArchiveBagPreviewVO>('/api/portfolio/archive/bag/preview', data),
  buildMaterialPackage: (data: PortfolioArchiveBagFilterRequest = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/material-package/build', data),
  computeScore: (data: PortfolioArchiveBagFilterRequest = {}) =>
    http.post<PortfolioArchiveScoreResultVO>('/api/portfolio/archive-score/compute', data),
}

export type PortfolioArchiveScoreRuleType = 'COMPLETENESS' | 'CATEGORY' | 'ACHIEVEMENT'

export const PORTFOLIO_ARCHIVE_SCORE_RULE_TYPE_LABEL: Record<PortfolioArchiveScoreRuleType, string> = {
  COMPLETENESS: '完整度加权',
  CATEGORY: '分类归档计分',
  ACHIEVEMENT: '成果条目计分',
}

export interface PortfolioArchiveScoreRuleVO {
  id: string
  categoryId?: string
  ruleType: PortfolioArchiveScoreRuleType
  ruleName: string
  scorePoints: string
  weight?: string
  officialOnly?: number
}

export interface PortfolioArchiveScoreRuleSaveRequest {
  id?: string
  categoryId?: string
  ruleType: PortfolioArchiveScoreRuleType
  ruleName: string
  scorePoints: string
  weight?: string
  officialOnly?: number
}

export const portfolioArchiveScoreApi = {
  listRules: () => http.post<PortfolioArchiveScoreRuleVO[]>('/api/portfolio/archive-score/rule/list', {}),
  saveRule: (data: PortfolioArchiveScoreRuleSaveRequest) =>
    http.post<string>('/api/portfolio/archive-score/rule/save', data),
  deleteRule: (id: string) => http.post<void>('/api/portfolio/archive-score/rule/delete', { id }),
}

export interface PortfolioDualTeacherApplicationVO {
  id: string
  teacherUserId: string
  applicationNo: string
  applicationStatus: PortfolioDualTeacherApplicationStatus
  certLevel?: string
  certYear?: string
  enterprisePracticeDays?: number
  attachmentFileIds?: string[]
}

export interface PortfolioDualTeacherImportResultVO {
  totalRows: number
  successRows: number
  failedRows: number
  errorReportJson?: string
}

export const portfolioDualTeacherApi = {
  page: (data: QueryDto & { teacherUserId?: string, applicationStatus?: string }) =>
    http.post<PageResult<PortfolioDualTeacherApplicationVO>>('/api/portfolio/dual-teacher/page', data),
  get: (data: { id: string }) =>
    http.post<PortfolioDualTeacherApplicationVO>('/api/portfolio/dual-teacher/get', data),
  saveDraft: (data: {
    id?: string
    teacherUserId: string
    certLevel?: string
    certYear?: string
    enterprisePracticeDays?: number
    attachmentFileIds?: string[]
  }) => http.post<string>('/api/portfolio/dual-teacher/save-draft', data),
  submit: (data: { id: string }) => http.post<void>('/api/portfolio/dual-teacher/submit', data),
  collegeApprove: (data: { id: string, auditOpinion?: string }) =>
    http.post<void>('/api/portfolio/dual-teacher/college-approve', data),
  collegeReturn: (data: { id: string, auditOpinion?: string }) =>
    http.post<void>('/api/portfolio/dual-teacher/college-return', data),
  academicApprove: (data: { id: string, auditOpinion?: string }) =>
    http.post<void>('/api/portfolio/dual-teacher/academic-approve', data),
  academicReject: (data: { id: string, auditOpinion?: string }) =>
    http.post<void>('/api/portfolio/dual-teacher/academic-reject', data),
  academicReturn: (data: { id: string, auditOpinion?: string }) =>
    http.post<void>('/api/portfolio/dual-teacher/academic-return', data),
  exportRoster: () => http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/dual-teacher/export-roster', {}),
  analyticsStats: () => http.post<PortfolioDualTeacherAnalyticsVO>('/api/portfolio/dual-teacher/analytics/stats', {}),
}

export interface PortfolioDualTeacherAnalyticsVO {
  totalCount: number
  approvedCount: number
  statusCounts: Array<{ applicationStatus: string, count: number }>
  certLevelCounts: Array<{ certLevel: string, count: number }>
}

export interface PortfolioExternalTeacherVO {
  id: string
  fullName: string
  gender?: string
  major?: string
  title?: string
  age?: number
  idCardNo?: string
  hireTerm?: string
  teachSubject?: string
  teachHours?: string
  employerUnit?: string
  teachMajor?: string
  teacherSource?: string
  trialScore?: string
  industryExperience?: string
  contractStatus?: string
  dataStatus: PortfolioExternalTeacherDataStatus
  importBatchId?: string
}

export interface PortfolioExternalTeacherSaveRequest {
  id?: string
  fullName: string
  gender?: string
  major?: string
  title?: string
  age?: number
  idCardNo?: string
  hireTerm?: string
  teachSubject?: string
  teachHours?: string
  employerUnit?: string
  teachMajor?: string
  teacherSource?: string
  trialScore?: string
  industryExperience?: string
  contractStatus?: string
  dataStatus?: PortfolioExternalTeacherDataStatus
}

export interface PortfolioExternalTeacherImportBatchVO {
  id: string
  batchNo: string
  fileName?: string
  totalRows?: number
  successRows?: number
  failedRows?: number
  batchStatus: PortfolioExternalTeacherImportBatchStatus
  errorReportJson?: string
  createTime?: string
}

export const portfolioExternalTeacherApi = {
  page: (data: QueryDto & { fullName?: string, searchText?: string, dataStatus?: PortfolioExternalTeacherDataStatus }) =>
    http.post<PageResult<PortfolioExternalTeacherVO>>('/api/portfolio/external-teacher/page', data),
  get: (data: { id: string }) =>
    http.post<PortfolioExternalTeacherVO>('/api/portfolio/external-teacher/get', data),
  save: (data: PortfolioExternalTeacherSaveRequest) =>
    http.post<string>('/api/portfolio/external-teacher/save', data),
  revoke: (data: { id: string }) =>
    http.post<void>('/api/portfolio/external-teacher/revoke', data),
  importBatchPage: (data: QueryDto) =>
    http.post<PageResult<PortfolioExternalTeacherImportBatchVO>>(
      '/api/portfolio/external-teacher/import-batch/page',
      data,
    ),
  importBatchGet: (data: { id: string }) =>
    http.post<PortfolioExternalTeacherImportBatchVO>(
      '/api/portfolio/external-teacher/import-batch/get',
      data,
    ),
  exportRoster: () =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/external-teacher/export-roster', {}),
}

export interface PortfolioDevelopmentPlanVO {
  id: string
  planTitle: string
  planStatus: PortfolioDevelopmentPlanStatus
  planYear: string
  planType?: string
  portfolioOrgId?: string
}

export interface PortfolioDevelopmentPlanYearStatVO {
  planStatus: string
  planCount: number
}

export interface PortfolioDevelopmentPlanOrgStatVO {
  portfolioOrgId?: string
  orgName?: string
  planStatus: string
  planCount: number
}

export interface PortfolioDevelopmentPlanCompletionVO {
  planYear: string
  totalPlanCount: number
  approvedPlanCount: number
  pendingPlanCount: number
  returnedPlanCount: number
  completionRatePercent: string
}

export interface PortfolioDevelopmentPlanAchievementAttainmentItemVO {
  categoryCode: string
  recordCount: number
}

export const portfolioDevelopmentPlanApi = {
  page: (data: QueryDto & {
    planYear?: string
    planStatus?: PortfolioDevelopmentPlanStatus
    portfolioOrgId?: string
  }) =>
    http.post<PageResult<PortfolioDevelopmentPlanVO>>('/api/portfolio/development-plan/page', data),
  createTeacherPlan: (data: {
    planYear: string
    planTitle: string
    planSummary?: string
    portfolioOrgId: string
    ownerUserId?: string
  }) =>
    http.post<string>('/api/portfolio/development-plan/create-teacher-plan', data),
  submit: (data: { id: string }) => http.post<void>('/api/portfolio/development-plan/submit', data),
  departmentApprove: (data: { id: string, auditOpinion?: string }) =>
    http.post<void>('/api/portfolio/development-plan/department-approve', data),
  departmentReturn: (data: { id: string, auditOpinion?: string }) =>
    http.post<void>('/api/portfolio/development-plan/department-return', data),
  statsByYear: (data: { planYear: string }) =>
    http.post<PortfolioDevelopmentPlanYearStatVO[]>('/api/portfolio/development-plan/stats-by-year', data),
  statsByOrg: (data: { planYear: string }) =>
    http.post<PortfolioDevelopmentPlanOrgStatVO[]>('/api/portfolio/development-plan/stats-by-org', data),
  completionAnalysis: (data: { planYear: string }) =>
    http.post<PortfolioDevelopmentPlanCompletionVO>('/api/portfolio/development-plan/completion-analysis', data),
  achievementAttainment: (data: { planYear: string }) =>
    http.post<PortfolioDevelopmentPlanAchievementAttainmentItemVO[]>(
      '/api/portfolio/development-plan/achievement-attainment',
      data,
    ),
  exportExcel: (data: { planYear: string }) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/development-plan/export-excel', data),
}

export interface PortfolioDevelopmentRecordVO {
  id: string
  recordTitle: string
  recordType: PortfolioDevelopmentRecordType
  recordStatus?: PortfolioDevelopmentRecordStatus
  categoryCode?: string
  levelCode?: string
  awardUnit?: string
  recordDate?: string
  teacherUserId?: string
  descriptionText?: string
  fileId?: string
  createTime?: string
}

export interface PortfolioHonorStatsVO {
  levelCounts: Array<{ levelCode: string, count: number }>
  yearCounts: Array<{ year: number, count: number }>
}

export interface PortfolioAchievementStatsVO {
  totalCount: number
  nationalCount: number
  levelCounts: Array<{ levelCode: string, count: number }>
  yearCounts: Array<{ year: number, count: number }>
}

export const portfolioDevelopmentRecordApi = {
  page: (data: QueryDto & {
    recordType: PortfolioDevelopmentRecordType
    recordStatus?: PortfolioDevelopmentRecordStatus
    searchText?: string
    levelCode?: string
    awardUnit?: string
    recordDateFrom?: string
    recordDateTo?: string
    categoryCode?: string
    teacherUserId?: string
  }) =>
    http.post<PageResult<PortfolioDevelopmentRecordVO>>('/api/portfolio/development-record/page', data),
  save: (data: {
    id?: string
    recordType: PortfolioDevelopmentRecordType
    recordTitle: string
    teacherUserId?: string
    categoryCode?: string
    levelCode?: string
    awardUnit?: string
    recordDate?: string
    descriptionText?: string
    fileId?: string
  }) => http.post<string>('/api/portfolio/development-record/save', data),
  delete: (data: { id: string }) => http.post<void>('/api/portfolio/development-record/delete', data),
  exportExcel: (data: { recordType: PortfolioDevelopmentRecordType }) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/development-record/export-excel', data),
  honorStats: (data: {
    levelCode?: string
    awardUnit?: string
    recordDateFrom?: string
    recordDateTo?: string
    categoryCode?: string
    teacherUserId?: string
  } = {}) => http.post<PortfolioHonorStatsVO>('/api/portfolio/development-record/honor/stats', data),
  honorExport: (data: {
    levelCode?: string
    awardUnit?: string
    recordDateFrom?: string
    recordDateTo?: string
    categoryCode?: string
    teacherUserId?: string
    nationalOnly?: boolean
  } = {}) => http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/development-record/honor/export', data),
  achievementStats: (data: {
    levelCode?: string
    nationalOnly?: boolean
    categoryCode?: string
    teacherUserId?: string
  } = {}) => http.post<PortfolioAchievementStatsVO>('/api/portfolio/development-record/achievement/stats', data),
  comprehensivePage: (data: QueryDto & {
    searchText?: string
    recordTypes?: PortfolioDevelopmentRecordType[]
    levelCode?: string
    nationalOnly?: boolean
    teacherUserId?: string
    recordDateFrom?: string
    recordDateTo?: string
  }) => http.post<PageResult<PortfolioDevelopmentRecordVO>>('/api/portfolio/development-record/comprehensive/page', data),
}

export interface PortfolioKeyTeacherRegistryVO {
  id: string
  teacherUserId: string
  registryType: PortfolioKeyTeacherRegistryType
  specialtyName?: string
  majorGroupName?: string
  appointYear?: string
  dutyScope?: string
  remark?: string
  registryStatus: PortfolioKeyTeacherRegistryStatus
  createTime?: string
  updateTime?: string
}

export const portfolioKeyTeacherApi = {
  page: (data: QueryDto & {
    registryType?: string
    teacherUserId?: string
    appointYear?: string
    registryStatus?: string
  }) => http.post<PageResult<PortfolioKeyTeacherRegistryVO>>('/api/portfolio/key-teacher/page', data),
  save: (data: {
    id?: string
    teacherUserId: string
    registryType: PortfolioKeyTeacherRegistryType
    specialtyName?: string
    majorGroupName?: string
    appointYear?: string
    dutyScope?: string
    remark?: string
    attachmentFileIds?: string[]
  }) => http.post<string>('/api/portfolio/key-teacher/save', data),
  revoke: (data: { id: string }) => http.post<void>('/api/portfolio/key-teacher/revoke', data),
  exportRoster: (data: { registryType?: string } = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/key-teacher/export-roster', data),
}

export interface PortfolioTeacherSalaryVO {
  id: string
  teacherUserId: string
  salaryMonth: string
  baseAmount?: string
  performanceAmount?: string
  allowanceAmount?: string
  baseAmountDisplay?: string
  performanceAmountDisplay?: string
  allowanceAmountDisplay?: string
  dataSource?: string
  remark?: string
  createTime?: string
}

export const portfolioTeacherSalaryApi = {
  page: (data: QueryDto & { teacherUserId?: string, salaryMonth?: string }) =>
    http.post<PageResult<PortfolioTeacherSalaryVO>>('/api/portfolio/teacher-salary/page', data),
  save: (data: {
    id?: string
    teacherUserId: string
    salaryMonth: string
    baseAmount?: string
    performanceAmount?: string
    allowanceAmount?: string
    dataSource?: string
    remark?: string
  }) => http.post<string>('/api/portfolio/teacher-salary/save', data),
  export: (data: { teacherUserId?: string, salaryMonth?: string } = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/teacher-salary/export', data),
}

export interface PortfolioTeacherLibraryBorrowVO {
  id: string
  teacherUserId: string
  bookTitle: string
  bookIsbn?: string
  borrowTime?: string
  dueTime?: string
  returnTime?: string
  overdueDays?: number
  dataSource?: string
  remark?: string
  createTime?: string
}

export interface PortfolioTeacherLibraryBorrowStatsVO {
  activeBorrowCount: number
  overdueCount: number
}

export const portfolioTeacherLibraryApi = {
  page: (data: QueryDto & { teacherUserId?: string, searchText?: string, activeOnly?: boolean }) =>
    http.post<PageResult<PortfolioTeacherLibraryBorrowVO>>('/api/portfolio/teacher-library/page', data),
  save: (data: {
    id?: string
    teacherUserId: string
    bookTitle: string
    bookIsbn?: string
    borrowTime?: string
    dueTime?: string
    returnTime?: string
    dataSource?: string
    remark?: string
  }) => http.post<string>('/api/portfolio/teacher-library/save', data),
  export: (data: { teacherUserId?: string, searchText?: string, activeOnly?: boolean } = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/teacher-library/export', data),
  stats: (data: { teacherUserId?: string } = {}) =>
    http.post<PortfolioTeacherLibraryBorrowStatsVO>('/api/portfolio/teacher-library/stats', data),
}

export interface PortfolioTeacherRecommendFilterSnapshot {
  minHonorCount?: number
  requiredLevelCode?: string
  requireDualTeacher?: boolean
  requireKeyTeacherType?: PortfolioKeyTeacherRegistryType
  indicatorCode?: string
  minIndicatorScore?: number
  topLimit?: number
}

export interface PortfolioTeacherRecommendEvidenceItem {
  evidenceType: string
  evidenceLabel: string
  evidenceValue: string
}

export interface PortfolioTeacherRecommendEvidenceSummary {
  items: PortfolioTeacherRecommendEvidenceItem[]
}

export interface PortfolioTeacherRecommendRuleVO {
  id: string
  ruleName: string
  recommendScene: PortfolioTeacherRecommendScene
  enabled?: boolean
  filterSnapshot?: PortfolioTeacherRecommendFilterSnapshot
  createTime?: string
}

export interface PortfolioTeacherRecommendCandidateVO {
  id: string
  runId: string
  teacherUserId: string
  rankOrder: number
  ruleScore?: string
  reasonText?: string
  evidenceSummary?: PortfolioTeacherRecommendEvidenceSummary
}

export interface PortfolioTeacherRecommendRunVO {
  id: string
  ruleId: string
  runMode: PortfolioTeacherRecommendRunMode
  runStatus: PortfolioTeacherRecommendRunStatus
  candidateCount: number
  runTime?: string
  operatorUserId?: string
}

export interface PortfolioTeacherRecommendExplainCandidateItemVO {
  teacherUserId: string
  reasonText: string
}

export interface PortfolioTeacherRecommendExplainStatusVO {
  runId: string
  explainTaskId?: string
  status?: AiTaskStatus
  candidateItems?: PortfolioTeacherRecommendExplainCandidateItemVO[]
}

export interface PortfolioTeacherRecommendExplainSubmitVO {
  taskId: string
  runId: string
  status: AiTaskStatus
}

export interface PortfolioTeacherPkCompareDimensionRowVO {
  dimensionCode: PortfolioPortraitDimension
  dimensionLabel: string
  dimensionScore: string
}

export interface PortfolioTeacherPkCompareTeacherRowVO {
  teacherUserId: string
  dimensionRows: PortfolioTeacherPkCompareDimensionRowVO[]
}

export interface PortfolioTeacherPkCompareVO {
  teachers: PortfolioTeacherPkCompareTeacherRowVO[]
}

export const portfolioTeacherRecommendationApi = {
  saveRule: (data: {
    id?: string
    ruleName: string
    recommendScene: 'EXCELLENT_TEACHER'
    enabled?: boolean
    filterSnapshot: PortfolioTeacherRecommendRuleVO['filterSnapshot']
  }) => http.post<string>('/api/portfolio/recommendation/rule/save', data),
  listRules: () => http.post<PortfolioTeacherRecommendRuleVO[]>('/api/portfolio/recommendation/rule/list', {}),
  executeRun: (data: { ruleId: string }) =>
    http.post<string>('/api/portfolio/recommendation/run/execute', data),
  pageRuns: (data: QueryDto & { ruleId?: string }) =>
    http.post<PageResult<PortfolioTeacherRecommendRunVO>>(
      '/api/portfolio/recommendation/run/page',
      data,
    ),
  pageCandidates: (data: QueryDto & { runId: string }) =>
    http.post<PageResult<PortfolioTeacherRecommendCandidateVO>>('/api/portfolio/recommendation/candidate/page', data),
  pkCompare: (data: { teacherUserIds: string[], dimensionCodes: PortfolioPortraitDimension[] }) =>
    http.post<PortfolioTeacherPkCompareVO>('/api/portfolio/recommendation/pk-compare', data),
  explainSubmit: (data: { runId: string }) =>
    http.post<PortfolioTeacherRecommendExplainSubmitVO>('/api/portfolio/recommendation/ai/explain-submit', data),
  explainStatus: (data: { runId: string }) =>
    http.post<PortfolioTeacherRecommendExplainStatusVO>('/api/portfolio/recommendation/run/explain-status', data),
}

export interface PortfolioPortraitTemplateVO {
  id: string
  templateName: string
  academicYear?: string
  templateStatus?: string
  layoutJson?: string
  chartConfigJson?: string
}

export const portfolioPortraitTemplateApi = {
  list: () => http.post<PortfolioPortraitTemplateVO[]>('/api/portfolio/portrait-template/list', {}),
  get: (data: { id: string }) =>
    http.post<PortfolioPortraitTemplateVO>('/api/portfolio/portrait-template/get', data),
  save: (data: {
    id?: string
    templateName: string
    academicYear: string
    layoutJson: string
    chartConfigJson?: string
  }) =>
    http.post<string>('/api/portfolio/portrait-template/save', data),
}

export type { PortfolioEvaluationMode, PortfolioEvaluationTaskStatus } from '@/apis/portfolio/enums'

export interface PortfolioEvaluationWorkgroupMemberOptionVO {
  userId: string
  userCode?: string
  userName?: string
  role?: string
}

export interface PortfolioEvaluationSubjectTeacherOptionVO {
  teacherUserId: string
  fullName: string
}

export interface PortfolioEvaluationIndicatorOptionVO {
  indicatorCode: string
  indicatorName: string
}

export interface PortfolioEvaluationTaskFillContextVO {
  id: string
  taskName: string
  evaluationMode: PortfolioEvaluationMode
  taskStatus: PortfolioEvaluationTaskStatus
  workgroupId?: string
  startTime?: string
  endTime?: string
  workgroupMembers: PortfolioEvaluationWorkgroupMemberOptionVO[]
  subjectTeacherOptions: PortfolioEvaluationSubjectTeacherOptionVO[]
  indicatorOptions: PortfolioEvaluationIndicatorOptionVO[]
}

export interface PortfolioEvaluationTaskVO {
  id: string
  taskName: string
  evaluationMode: PortfolioEvaluationMode
  taskStatus: PortfolioEvaluationTaskStatus
  workgroupId?: string
  startTime?: string
  endTime?: string
  createTime?: string
}

export const portfolioEvaluationTaskApi = {
  create: (data: {
    taskName: string
    evaluationMode: PortfolioEvaluationMode
    workgroupId: string
    startTime: string
    endTime: string
  }) =>
    http.post<string>('/api/portfolio/evaluation-task/create', data),
  publish: (data: { id: string }) => http.post<void>('/api/portfolio/evaluation-task/publish', data),
  get: (data: { id: string }) =>
    http.post<PortfolioEvaluationTaskVO>('/api/portfolio/evaluation-task/get', data),
  fillContext: (data: { id: string }) =>
    http.post<PortfolioEvaluationTaskFillContextVO>('/api/portfolio/evaluation-task/fill-context', data),
  page: (data: QueryDto & { taskStatus?: PortfolioEvaluationTaskStatus }) =>
    http.post<PageResult<PortfolioEvaluationTaskVO>>('/api/portfolio/evaluation-task/page', data),
  exportExcel: () =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/evaluation-task/export-excel', {}),
}

export interface PortfolioEvaluationEntryVO {
  id: string
  evaluationTaskId: string
  subjectTeacherUserId: string
  indicatorCode?: string
  score: string
  commentText?: string
  evaluatorUserId: string
  createTime?: string
  updateTime?: string
}

export interface PortfolioEvaluationEntrySummaryItemVO {
  subjectTeacherUserId?: string
  indicatorCode?: string
  entryCount: number
  averageScore: string
}

export interface PortfolioEvaluationEntrySummaryVO {
  evaluationTaskId: string
  evaluationMode: PortfolioEvaluationMode
  entryCount: number
  averageScore: string
  rows: PortfolioEvaluationEntrySummaryItemVO[]
}

export const portfolioEvaluationEntryApi = {
  save: (data: {
    evaluationTaskId: string
    subjectTeacherUserId: string
    indicatorCode?: string
    score: string
    commentText?: string
  }) => http.post<string>('/api/portfolio/evaluation-entry/save', data),
  page: (data: QueryDto & {
    evaluationTaskId: string
    subjectTeacherUserId?: string
    indicatorCode?: string
  }) => http.post<PageResult<PortfolioEvaluationEntryVO>>('/api/portfolio/evaluation-entry/page', data),
  summary: (data: { id: string }) =>
    http.post<PortfolioEvaluationEntrySummaryVO>('/api/portfolio/evaluation-entry/summary', data),
  exportSummary: (data: { id: string }) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/evaluation-entry/export-summary', data),
}
