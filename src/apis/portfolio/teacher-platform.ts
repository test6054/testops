import type {
  PortfolioArchiveBagAssembleVO,
  PortfolioArchiveBagExportResultVO,
  PortfolioArchiveBagPreviewVO,
  PortfolioArchiveBagTeacherRequest,
  PortfolioArchiveScoreResultVO,
} from '@/apis/portfolio/bag-types'
import type {
  PortfolioDevelopmentPlanHistoryImportBatchStatusCode,
  PortfolioDevelopmentPlanItemStatusCode,
  PortfolioDevelopmentPlanStatusCode,
  PortfolioDevelopmentPlanTypeCode,
  PortfolioDevelopmentRecordStatusCode,
  PortfolioDevelopmentRecordTypeCode,
  PortfolioDualTeacherApplicationStatusCode,
  PortfolioEvaluationModeCode,
  PortfolioEvaluationTaskStatusEnum,
  PortfolioExternalTeacherDataStatusCode,
  PortfolioExternalTeacherImportBatchStatusCode,
  PortfolioKeyTeacherRegistryStatusCode,
  PortfolioKeyTeacherRegistryTypeCode,
  PortfolioPortraitDimensionCode,
  PortfolioTeacherRecommendRunModeCode,
  PortfolioTeacherRecommendRunStatusCode,
  PortfolioTeacherRecommendSceneCode,
} from '@/apis/portfolio/enums'
import type { PortfolioTeacherLifecycleStatusCode } from '@/apis/portfolio/teacher-lifecycle'
import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/types'
import type { AiTaskStatusCode } from '@/apis/quality/types'
import type { PageResult, QueryDto } from '@/types'
import type { PortfolioArchiveScoreRuleTypeCode } from '@/types/enums/portfolio-archive-score-rule-type-enum'
import type { PortfolioBusinessDataSourceTypeCode } from '@/types/enums/portfolio-business-data-source-type-enum'
import type { PortfolioDualTeacherCertLevelCode } from '@/types/enums/portfolio-dual-teacher-cert-level-enum'
import type { PortfolioEvaluationSceneCode } from '@/types/enums/portfolio-evaluation-scene-enum'
import type { PortfolioExternalTeacherContractStatusCode } from '@/types/enums/portfolio-external-teacher-contract-status-enum'
import type { PortfolioGenderCode } from '@/types/enums/portfolio-gender-enum'
import type { PortfolioHonorLevelCode } from '@/types/enums/portfolio-honor-level-enum'
import type { PortfolioImportQualityGradeCode } from '@/types/enums/portfolio-import-quality-grade-enum'
import type { PortfolioMultiSourceEvaluatorTypeEnum } from '@/types/enums/portfolio-multi-source-evaluator-type-enum'
import type { PortfolioPlanningAchievementLinkStatusCode } from '@/types/enums/portfolio-planning-achievement-link-status-enum'
import type { PortfolioPlanningSyncConflictStrategyCode } from '@/types/enums/portfolio-planning-sync-conflict-strategy-enum'
import type { PortfolioPlanningSyncOrgScopeCode } from '@/types/enums/portfolio-planning-sync-org-scope-enum'
import type { PortfolioPortraitTemplateStatusCode } from '@/types/enums/portfolio-portrait-template-status-enum'
import type { PortfolioTeacherIdentityTypeCode } from '@/types/enums/portfolio-teacher-identity-type-enum'
import type { PortraitWidgetTypeCode } from '@/types/enums/portrait-widget-type-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  ALL_PORTFOLIO_ARCHIVE_SCORE_RULE_TYPE_CODES,
  PortfolioArchiveScoreRuleTypeDescription,
} from '@/types/enums/portfolio-archive-score-rule-type-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export const portfolioArchiveBagApi = {
  assemble: (data: PortfolioArchiveBagTeacherRequest = {}) =>
    http.post<PortfolioArchiveBagAssembleVO>('/api/portfolio/archive/bag/assemble', data),
  preview: (data: PortfolioArchiveBagTeacherRequest = {}) =>
    http.post<PortfolioArchiveBagPreviewVO>('/api/portfolio/archive/bag/preview', data),
  computeScore: (data: PortfolioArchiveScoreComputeRequest = {}) =>
    http.post<PortfolioArchiveScoreResultVO>('/api/portfolio/archive-score/compute', data),
}

export type {
  PortfolioEvaluationModeCode,
  PortfolioEvaluationTaskStatusEnum,
} from '@/apis/portfolio/enums'
export {
  ALL_PORTFOLIO_ARCHIVE_SCORE_RULE_TYPE_CODES,
  PortfolioArchiveScoreRuleTypeCode,
  PortfolioArchiveScoreRuleTypeDescription,
} from '@/types/enums/portfolio-archive-score-rule-type-enum'

export const PORTFOLIO_ARCHIVE_SCORE_RULE_TYPE_OPTIONS: Array<{
  value: PortfolioArchiveScoreRuleTypeCode
  label: string
}> = [
  ...ALL_PORTFOLIO_ARCHIVE_SCORE_RULE_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortfolioArchiveScoreRuleTypeDescription, value, '档案袋计分规则类型'),
  })),
]

export interface PortfolioArchiveScoreRuleVO {
  id: string
  categoryId?: string
  ruleType: PortfolioArchiveScoreRuleTypeCode
  ruleName: string
  scorePoints: number
  weight?: number
  officialOnly?: number
}

export interface PortfolioArchiveScoreRuleSaveRequest {
  id?: string
  categoryId?: string
  ruleType: PortfolioArchiveScoreRuleTypeCode
  ruleName: string
  scorePoints: number
  weight?: number
  officialOnly?: number
}

export interface PortfolioArchiveScoreComputeRequest {
  teacherId?: string
  academicYear?: string
  semester?: SemesterCode
  courseCode?: string
  achievementType?: string
}

export const portfolioArchiveScoreApi = {
  listRules: () =>
    http.post<PortfolioArchiveScoreRuleVO[]>('/api/portfolio/archive-score/rule/list', {}),
  saveRule: (data: PortfolioArchiveScoreRuleSaveRequest) =>
    http.post<string>('/api/portfolio/archive-score/rule/save', data),
  deleteRule: (id: string) => http.post<void>('/api/portfolio/archive-score/rule/delete', { id }),
}

export interface PortfolioDualTeacherEligibilityFreezeVO {
  snapshotId?: string
  fingerprint?: string
  eligible?: boolean
  frozenTime?: string
  gapItems?: string[]
  explainText?: string
}

export interface PortfolioDualTeacherApplicationVO {
  id: string
  teacherUserId: string
  applicationNo: string
  applicationStatus: PortfolioDualTeacherApplicationStatusCode
  certLevel?: PortfolioDualTeacherCertLevelCode
  certYear?: string
  enterprisePracticeDays?: number
  collegeAuditOpinion?: string
  academicAuditOpinion?: string
  createTime?: string
  updateTime?: string
  attachmentFileIds?: string[]
  eligibilityFreeze?: PortfolioDualTeacherEligibilityFreezeVO
  /** 生命周期状态编码 ACTIVE/SEALED/... */
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

export interface PortfolioDualTeacherPageRequest extends QueryDto {
  teacherUserId?: string
  applicationStatus?: PortfolioDualTeacherApplicationStatusCode
  certYear?: string
  searchText?: string
  locateApplicationId?: string
}

export interface PortfolioDualTeacherWorkflowRequest {
  id: string
  auditOpinion?: string
}

export interface PortfolioDualTeacherSaveDraftRequest {
  id?: string
  teacherUserId: string
  certLevel?: PortfolioDualTeacherCertLevelCode
  certYear?: string
  enterprisePracticeDays?: number
  attachmentFileIds?: string[]
}

export interface PortfolioDualTeacherExportRequest {
  applicationStatus?: PortfolioDualTeacherApplicationStatusCode
  /** §7.9 / §8.24 批量导出用途（强审计必填） */
  exportPurpose: string
}

export const portfolioDualTeacherApi = {
  page: (data: PortfolioDualTeacherPageRequest) =>
    http.post<PageResult<PortfolioDualTeacherApplicationVO>>(
      '/api/portfolio/dual-teacher/page',
      data,
    ),
  get: (data: { id: string }) =>
    http.post<PortfolioDualTeacherApplicationVO>('/api/portfolio/dual-teacher/get', data),
  saveDraft: (data: PortfolioDualTeacherSaveDraftRequest) =>
    http.post<string>('/api/portfolio/dual-teacher/save-draft', data),
  submit: (data: { id: string }) => http.post<void>('/api/portfolio/dual-teacher/submit', data),
  collegeApprove: (data: PortfolioDualTeacherWorkflowRequest) =>
    http.post<void>('/api/portfolio/dual-teacher/college-approve', data),
  previewEligibilityGate: (data: { id: string }) =>
    http.post<PortfolioDualTeacherEligibilityFreezeVO>(
      '/api/portfolio/dual-teacher/preview-eligibility-gate',
      data,
    ),
  collegeReturn: (data: PortfolioDualTeacherWorkflowRequest) =>
    http.post<void>('/api/portfolio/dual-teacher/college-return', data),
  academicApprove: (data: PortfolioDualTeacherWorkflowRequest) =>
    http.post<void>('/api/portfolio/dual-teacher/academic-approve', data),
  academicReject: (data: PortfolioDualTeacherWorkflowRequest) =>
    http.post<void>('/api/portfolio/dual-teacher/academic-reject', data),
  academicReturn: (data: PortfolioDualTeacherWorkflowRequest) =>
    http.post<void>('/api/portfolio/dual-teacher/academic-return', data),
  exportRoster: (data: PortfolioDualTeacherExportRequest = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/dual-teacher/export-roster', data),
  analyticsStats: () =>
    http.post<PortfolioDualTeacherAnalyticsVO>('/api/portfolio/dual-teacher/analytics/stats', {}),
}

export interface PortfolioDualTeacherAnalyticsVO {
  totalCount: number
  approvedCount: number
  statusCounts: PortfolioDualTeacherStatusCountVO[]
  certLevelCounts: PortfolioDualTeacherCertLevelCountVO[]
  /** §8.61 在岗结构教师数 */
  structureTeacherCount?: number
  /** 在岗结构内已通过双师认定教师数 */
  structureDualTeacherCount?: number
  /** 双师比例百分比 */
  dualTeacherRatioPercent?: number | string
  /** 在岗双师院系分布 */
  departmentCounts?: PortfolioDualTeacherDepartmentCountVO[]
  /** 认定年份分布 */
  certYearCounts?: PortfolioDualTeacherCertYearCountVO[]
}

export interface PortfolioDualTeacherDepartmentCountVO {
  departmentId: string
  departmentName: string
  count: number
}

export interface PortfolioDualTeacherCertYearCountVO {
  certYear: string
  count: number
}

export interface PortfolioDualTeacherStatusCountVO {
  applicationStatus: PortfolioDualTeacherApplicationStatusCode
  count: number
}

export interface PortfolioDualTeacherCertLevelCountVO {
  certLevel: PortfolioDualTeacherCertLevelCode
  count: number
}

export interface PortfolioIndustryMentorContributionVO {
  formulaLabel: string
  teacherUserId?: string
  externalTeacherId?: string
  identityType?: PortfolioTeacherIdentityTypeCode
  contributionScore: number
  appointmentValidityScore: number
  teachingParticipationScore: number
  practiceGuidanceScore: number
  industryOutcomeScore: number
  assessmentScore: number
  evidenceNotes: string[]
  /** 贡献教师多身份并列层 */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 贡献教师多身份口径说明 */
  ownerMultiIdentityNote?: string
  usableForCampusTitleEvaluation: boolean
}

export interface PortfolioExternalTeacherVO {
  id: string
  fullName: string
  gender?: PortfolioGenderCode
  major?: string
  title?: string
  age?: number
  idCardNo?: string
  hireTerm?: string
  teachSubject?: string
  teachHours?: number
  employerUnit?: string
  teachMajor?: string
  teacherSource?: string
  trialScore?: string
  industryExperience?: string
  contractStatus?: PortfolioExternalTeacherContractStatusCode
  contactPhone?: string
  contactEmail?: string
  hireStartDate?: string
  hireEndDate?: string
  attachmentFileIds?: string[]
  dataStatus: PortfolioExternalTeacherDataStatusCode
  importBatchId?: string
  createTime?: string
  contribution?: PortfolioIndustryMentorContributionVO
}

export interface PortfolioExternalTeacherStatsVO {
  /** 当前筛选口径台账总数 */
  totalCount?: number
  /** 当前筛选口径 ACTIVE 数 */
  activeCount?: number
  /** §8.42 产业导师综合贡献度均值 */
  avgContributionScore?: number | string
  avgAppointmentValidityScore?: number | string
  avgTeachingParticipationScore?: number | string
  avgPracticeGuidanceScore?: number | string
  avgIndustryOutcomeScore?: number | string
  avgAssessmentScore?: number | string
  /** §8.42 固定不可用于校内职称 */
  usableForCampusTitleEvaluation?: boolean
  contractStatusCounts: PortfolioExternalTeacherStatCountVO[]
  teacherSourceCounts: PortfolioExternalTeacherStatCountVO[]
}

export interface PortfolioExternalTeacherStatCountVO {
  dimensionCode?: string
  count?: number
}

export interface PortfolioExternalTeacherSaveRequest {
  id?: string
  fullName: string
  gender?: PortfolioGenderCode
  major?: string
  title?: string
  age?: number
  idCardNo?: string
  hireTerm?: string
  teachSubject?: string
  teachHours?: number
  employerUnit?: string
  teachMajor?: string
  teacherSource?: string
  trialScore?: string
  industryExperience?: string
  contractStatus?: PortfolioExternalTeacherContractStatusCode
  contactPhone?: string
  contactEmail?: string
  hireStartDate?: string
  hireEndDate?: string
  attachmentFileIds?: string[]
  dataStatus?: PortfolioExternalTeacherDataStatusCode
}

export interface PortfolioImportErrorItemDto {
  rowIndex?: number
  rowIndexes?: number[]
  message?: string
  conflictAction?: string
  qualityGrade?: PortfolioImportQualityGradeCode
  passRate?: number
  teacherMatchRate?: number
  fieldUsableRate?: number
}

export interface PortfolioExternalTeacherImportBatchVO {
  id: string
  fileName?: string
  successRows?: number
  failedRows?: number
  batchStatus: PortfolioExternalTeacherImportBatchStatusCode
  errorReport?: PortfolioImportErrorItemDto[]
  passRate?: number
  teacherMatchRate?: number
  fieldUsableRate?: number
  qualityGrade?: PortfolioImportQualityGradeCode
  createTime?: string
}

export interface PortfolioExternalTeacherPageRequest extends QueryDto {
  searchText?: string
  dataStatus?: PortfolioExternalTeacherDataStatusCode
  importBatchId?: string
  teachSubject?: string
  teacherSource?: string
  contractStatus?: PortfolioExternalTeacherContractStatusCode
}

export interface PortfolioExternalTeacherStatsRequest {
  dataStatus?: PortfolioExternalTeacherDataStatusCode
  teachSubject?: string
  teacherSource?: string
  contractStatus?: PortfolioExternalTeacherContractStatusCode
}

export interface PortfolioExternalTeacherExportRequest {
  dataStatus?: PortfolioExternalTeacherDataStatusCode
  teachSubject?: string
  teacherSource?: string
  contractStatus?: PortfolioExternalTeacherContractStatusCode
  /** §7.9 / §8.24 批量导出用途（强审计必填） */
  exportPurpose: string

}

export const portfolioExternalTeacherApi = {
  page: (data: PortfolioExternalTeacherPageRequest) =>
    http.post<PageResult<PortfolioExternalTeacherVO>>('/api/portfolio/external-teacher/page', data),
  stats: (data: PortfolioExternalTeacherStatsRequest = {}) =>
    http.post<PortfolioExternalTeacherStatsVO>('/api/portfolio/external-teacher/stats', data),
  /** §8.42 按外聘台账主键计算产业导师贡献度 */
  contributionGet: (data: { id: string }) =>
    http.post<PortfolioIndustryMentorContributionVO>(
      '/api/portfolio/external-teacher/contribution/get',
      data,
    ),
  /** §8.42 按教师用户外部身份（产业导师）计算贡献度 */
  contributionByTeacher: (data: { teacherId?: string } = {}) =>
    http.post<PortfolioIndustryMentorContributionVO>(
      '/api/portfolio/external-teacher/contribution/by-teacher',
      data,
    ),
  get: (data: { id: string }) =>
    http.post<PortfolioExternalTeacherVO>('/api/portfolio/external-teacher/get', data),
  save: (data: PortfolioExternalTeacherSaveRequest) =>
    http.post<string>('/api/portfolio/external-teacher/save', data),
  revoke: (data: { id: string }) => http.post<void>('/api/portfolio/external-teacher/revoke', data),
  importBatchPage: (data: PortfolioExternalTeacherPageRequest) =>
    http.post<PageResult<PortfolioExternalTeacherImportBatchVO>>(
      '/api/portfolio/external-teacher/import-batch/page',
      data,
    ),
  importBatchGet: (data: { id: string }) =>
    http.post<PortfolioExternalTeacherImportBatchVO>(
      '/api/portfolio/external-teacher/import-batch/get',
      data,
    ),
  exportRoster: (data: PortfolioExternalTeacherExportRequest = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>(
      '/api/portfolio/external-teacher/export-roster',
      data,
    ),
}

export interface PortfolioDevelopmentPlanVO {
  id: string
  planTitle: string
  planStatus: PortfolioDevelopmentPlanStatusCode
  planYear: string
  planType?: PortfolioDevelopmentPlanTypeCode
  portfolioOrgId?: string
  ownerUserId?: string
  planSummary?: string
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
  /** 贡献教师多身份并列层 */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 贡献教师多身份口径说明 */
  ownerMultiIdentityNote?: string
  createTime?: string
}

export interface PortfolioDevelopmentPlanItemVO {
  id?: string
  planId?: string
  catalogId?: string
  catalogName?: string
  achievementLinkStatus?: PortfolioPlanningAchievementLinkStatusCode
  achievementCompletionRate?: string
  achievementMissingCount?: number
  itemTitle: string
  itemGoal?: string
  indicatorCode?: string
  milestoneText?: string
  completionPercent?: number
  itemStatus: PortfolioDevelopmentPlanItemStatusCode
  sortOrder?: number
}

export interface PortfolioDevelopmentPlanItemSaveRequest {
  id?: string
  catalogId?: string
  itemTitle: string
  itemGoal?: string
  indicatorCode?: string
  milestoneText?: string
  completionPercent?: number
  itemStatus?: PortfolioDevelopmentPlanItemStatusCode
  sortOrder?: number
}

export interface PortfolioDevelopmentPlanYearStatVO {
  planStatus: PortfolioDevelopmentPlanStatusCode
  planCount: number
}

export interface PortfolioDevelopmentPlanOrgStatVO {
  portfolioOrgId?: string
  orgName?: string
  planStatus: PortfolioDevelopmentPlanStatusCode
  planCount: number
}

export interface PortfolioDevelopmentPlanCompletionVO {
  planYear: string
  totalPlanCount: number
  approvedPlanCount: number
  pendingPlanCount: number
  returnedPlanCount: number
  completionRatePercent: number
  totalPlanItemCount: number
  completedPlanItemCount: number
  planItemCompletionRatePercent: number
  averageItemCompletionPercent: number
}

export interface PortfolioDevelopmentPlanAchievementAttainmentItemVO {
  categoryCode: string
  recordCount: number
}

export interface PortfolioDevelopmentPlanHistoryImportBatchVO {
  id: string
  batchNo: string
  fileName?: string
  totalRows?: number
  successRows?: number
  failedRows?: number
  batchStatus: PortfolioDevelopmentPlanHistoryImportBatchStatusCode
  errorReport?: PortfolioImportErrorItemDto[]
  syncConfigId?: string
  importedPlanIds?: string[]
  overwrittenPlanSnapshotsJson?: string
  passRate?: number
  teacherMatchRate?: number
  fieldUsableRate?: number
  qualityGrade?: PortfolioImportQualityGradeCode
  createTime?: string
}

export interface PortfolioDevelopmentPlanPageRequest extends QueryDto {
  planType?: PortfolioDevelopmentPlanTypeCode
  planYear?: string
  planStatus?: PortfolioDevelopmentPlanStatusCode
  ownerUserId?: string
  portfolioOrgId?: string
  locatePlanId?: string
}

export interface PortfolioDevelopmentPlanWorkflowRequest {
  id: string
  auditOpinion?: string
}

export interface PortfolioDevelopmentPlanStatsRequest {
  planYear: string
  teacherId?: string
  planType?: PortfolioDevelopmentPlanTypeCode
  /** §7.9 批量导出用途 */
  exportPurpose?: string

}

export interface PortfolioPlanningSyncFieldMapping {
  ownerUserIdColumn: string
  planYearColumn: string
  itemTitleColumn: string
  itemGoalColumn: string
  completionPercentColumn: string
  itemStatusColumn: string
}

export interface PortfolioPlanningSyncConfigSaveRequest {
  id?: string
  yearFrom: number
  yearTo: number
  orgScopeType: PortfolioPlanningSyncOrgScopeCode
  portfolioOrgId?: string
  planType: PortfolioDevelopmentPlanTypeCode
  conflictStrategy: PortfolioPlanningSyncConflictStrategyCode
  fieldMapping: PortfolioPlanningSyncFieldMapping
  enabled: boolean
}

export interface PortfolioPlanningSyncConfigVO extends PortfolioPlanningSyncConfigSaveRequest {
  id: string
  updateTime: string
  updateToken: string
}

export interface PortfolioDevelopmentPlanItemBatchSaveRequest {
  planId: string
  items: PortfolioDevelopmentPlanItemSaveRequest[]
}

export interface PortfolioDevelopmentPlanItemListRequest {
  planId: string
}

export interface PortfolioDevelopmentPlanCreateRequest {
  planYear: string
  planTitle: string
  planSummary?: string
  portfolioOrgId?: string
  ownerUserId?: string
}

export interface PortfolioDevelopmentPlanDepartmentCreateRequest {
  planYear: string
  planTitle: string
  planSummary?: string
  portfolioOrgId: string
}

export const portfolioDevelopmentPlanApi = {
  page: (data: PortfolioDevelopmentPlanPageRequest) =>
    http.post<PageResult<PortfolioDevelopmentPlanVO>>('/api/portfolio/development-plan/page', data),
  createTeacherPlan: (data: PortfolioDevelopmentPlanCreateRequest) =>
    http.post<string>('/api/portfolio/development-plan/create-teacher-plan', data),
  createDepartmentPlan: (data: PortfolioDevelopmentPlanDepartmentCreateRequest) =>
    http.post<string>('/api/portfolio/development-plan/create-department-plan', data),
  submit: (data: { id: string }) => http.post<void>('/api/portfolio/development-plan/submit', data),
  departmentApprove: (data: PortfolioDevelopmentPlanWorkflowRequest) =>
    http.post<void>('/api/portfolio/development-plan/department-approve', data),
  departmentReturn: (data: PortfolioDevelopmentPlanWorkflowRequest) =>
    http.post<void>('/api/portfolio/development-plan/department-return', data),
  statsByYear: (data: PortfolioDevelopmentPlanStatsRequest) =>
    http.post<PortfolioDevelopmentPlanYearStatVO[]>(
      '/api/portfolio/development-plan/stats-by-year',
      data,
    ),
  statsByOrg: (data: PortfolioDevelopmentPlanStatsRequest) =>
    http.post<PortfolioDevelopmentPlanOrgStatVO[]>(
      '/api/portfolio/development-plan/stats-by-org',
      data,
    ),
  completionAnalysis: (data: PortfolioDevelopmentPlanStatsRequest) =>
    http.post<PortfolioDevelopmentPlanCompletionVO>(
      '/api/portfolio/development-plan/completion-analysis',
      data,
    ),
  achievementAttainment: (data: PortfolioDevelopmentPlanStatsRequest) =>
    http.post<PortfolioDevelopmentPlanAchievementAttainmentItemVO[]>(
      '/api/portfolio/development-plan/achievement-attainment',
      data,
    ),
  exportExcel: (data: PortfolioDevelopmentPlanStatsRequest) =>
    http.post<PortfolioArchiveBagExportResultVO>(
      '/api/portfolio/development-plan/export-excel',
      data,
    ),
  getHistorySyncConfig: () =>
    http.post<PortfolioPlanningSyncConfigVO | null>(
      '/api/portfolio/development-plan/history-import/config/get',
      {},
    ),
  saveHistorySyncConfig: (data: PortfolioPlanningSyncConfigSaveRequest) =>
    http.post<PortfolioPlanningSyncConfigVO>(
      '/api/portfolio/development-plan/history-import/config/save',
      data,
    ),
  rollbackHistoryImportBatch: (data: { id: string }) =>
    http.post<void>('/api/portfolio/development-plan/history-import/import-batch/rollback', data),
  historyImportBatchPage: (data: QueryDto = { pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE }) =>
    http.post<PageResult<PortfolioDevelopmentPlanHistoryImportBatchVO>>(
      '/api/portfolio/development-plan/history-import/import-batch/page',
      data,
    ),
  historyImportBatchGet: (data: { id: string }) =>
    http.post<PortfolioDevelopmentPlanHistoryImportBatchVO>(
      '/api/portfolio/development-plan/history-import/import-batch/get',
      data,
    ),
  listItems: (data: PortfolioDevelopmentPlanItemListRequest) =>
    http.post<PortfolioDevelopmentPlanItemVO[]>('/api/portfolio/development-plan/item/list', data),
  batchSaveItems: (data: PortfolioDevelopmentPlanItemBatchSaveRequest) =>
    http.post<void>('/api/portfolio/development-plan/item/batch-save', data),
}

export interface PortfolioDevelopmentRecordVO {
  id: string
  recordTitle: string
  recordType: PortfolioDevelopmentRecordTypeCode
  recordStatus?: PortfolioDevelopmentRecordStatusCode
  categoryCode?: string
  levelCode?: PortfolioHonorLevelCode
  awardUnit?: string
  recordDate?: string
  teacherUserId?: string
  /** edu-user 教师姓名 */
  teacherName?: string
  /** edu-user 教师工号 */
  teacherNumber?: string
  descriptionText?: string
  fileId?: string
  createTime?: string
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
  /** 贡献教师多身份并列层 */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 贡献教师多身份口径说明 */
  ownerMultiIdentityNote?: string
  /** 业务日命中的归属血缘段 */
  affiliationHistoryId?: string
  affiliationStaffNo?: string
  affiliationDepartmentId?: string
  affiliationPortfolioOrgId?: string
  affiliationIdentityId?: string
  affiliationOpenSegment?: boolean
  affiliationEffectiveFrom?: string
  affiliationEffectiveTo?: string
}

export interface PortfolioHonorStatsVO {
  levelCounts: PortfolioHonorLevelCountVO[]
  yearCounts: PortfolioHonorYearCountVO[]
}

export interface PortfolioAchievementStatsVO {
  totalCount: number
  nationalCount: number
  levelCounts: PortfolioHonorLevelCountVO[]
  yearCounts: PortfolioHonorYearCountVO[]
}

export interface PortfolioHonorLevelCountVO {
  levelCode: PortfolioHonorLevelCode
  count: number
}

export interface PortfolioHonorYearCountVO {
  year: number
  count: number
}

export interface PortfolioDevelopmentRecordPageRequest extends QueryDto {
  recordType?: PortfolioDevelopmentRecordTypeCode
  teacherUserId?: string
  recordStatus?: PortfolioDevelopmentRecordStatusCode
  searchText?: string
  levelCode?: PortfolioHonorLevelCode
  awardUnit?: string
  recordDateFrom?: string
  recordDateTo?: string
  categoryCode?: string
}

export interface PortfolioDevelopmentRecordComprehensivePageRequest extends QueryDto {
  searchText?: string
  recordTypes?: PortfolioDevelopmentRecordTypeCode[]
  levelCode?: PortfolioHonorLevelCode
  nationalOnly?: boolean
  teacherUserId?: string
  recordDateFrom?: string
  recordDateTo?: string
}

export interface PortfolioDevelopmentRecordSaveRequest {
  id?: string
  recordType: PortfolioDevelopmentRecordTypeCode
  recordTitle: string
  teacherUserId?: string
  categoryCode?: string
  levelCode?: PortfolioHonorLevelCode
  awardUnit?: string
  recordDate?: string
  descriptionText?: string
  fileId?: string
  recordStatus?: PortfolioDevelopmentRecordStatusCode
}

export interface PortfolioDevelopmentRecordExportRequest {
  recordType?: PortfolioDevelopmentRecordTypeCode
  categoryCode?: string
  levelCode?: PortfolioHonorLevelCode
  nationalOnly?: boolean
  teacherUserId?: string
  awardUnit?: string
  recordDateFrom?: string
  recordDateTo?: string
  /** §7.9 批量导出用途 */
  exportPurpose: string

}

export interface PortfolioHonorExportRequest {
  teacherUserId?: string
  recordStatus?: PortfolioDevelopmentRecordStatusCode
  searchText?: string
  levelCode?: PortfolioHonorLevelCode
  awardUnit?: string
  recordDateFrom?: string
  recordDateTo?: string
  categoryCode?: string
  nationalOnly?: boolean
  /** §7.9 批量导出用途 */
  exportPurpose?: string

}

export const portfolioDevelopmentRecordApi = {
  page: (data: PortfolioDevelopmentRecordPageRequest) =>
    http.post<PageResult<PortfolioDevelopmentRecordVO>>(
      '/api/portfolio/development-record/page',
      data,
    ),
  save: (data: PortfolioDevelopmentRecordSaveRequest) =>
    http.post<string>('/api/portfolio/development-record/save', data),
  delete: (data: { id: string }) =>
    http.post<void>('/api/portfolio/development-record/delete', data),
  exportExcel: (data: PortfolioDevelopmentRecordExportRequest) =>
    http.post<PortfolioArchiveBagExportResultVO>(
      '/api/portfolio/development-record/export-excel',
      data,
    ),
  honorStats: (data: PortfolioHonorExportRequest = {}) =>
    http.post<PortfolioHonorStatsVO>('/api/portfolio/development-record/honor/stats', data),
  honorExport: (data: PortfolioHonorExportRequest = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>(
      '/api/portfolio/development-record/honor/export',
      data,
    ),
  achievementStats: (data: PortfolioHonorExportRequest = {}) =>
    http.post<PortfolioAchievementStatsVO>(
      '/api/portfolio/development-record/achievement/stats',
      data,
    ),
  comprehensivePage: (data: PortfolioDevelopmentRecordComprehensivePageRequest) =>
    http.post<PageResult<PortfolioDevelopmentRecordVO>>(
      '/api/portfolio/development-record/comprehensive/page',
      data,
    ),
}

export interface PortfolioKeyTeacherRegistryVO {
  id: string
  teacherUserId: string
  /** edu-user 教师姓名 */
  teacherName?: string
  /** edu-user 教师工号 */
  teacherNumber?: string
  registryType: PortfolioKeyTeacherRegistryTypeCode
  specialtyName?: string
  majorGroupName?: string
  appointYear?: string
  dutyScope?: string
  remark?: string
  registryStatus: PortfolioKeyTeacherRegistryStatusCode
  createTime?: string
  updateTime?: string
  /** 生命周期状态编码 ACTIVE/SEALED/... */
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

export interface PortfolioKeyTeacherPageRequest extends QueryDto {
  teacherUserId?: string
  registryType?: PortfolioKeyTeacherRegistryTypeCode
  registryStatus?: PortfolioKeyTeacherRegistryStatusCode
  appointYear?: string
  searchText?: string
}

export interface PortfolioKeyTeacherExportRequest {
  registryType?: PortfolioKeyTeacherRegistryTypeCode
  registryStatus?: PortfolioKeyTeacherRegistryStatusCode
  /** §7.9 / §8.24 批量导出用途（强审计必填） */
  exportPurpose: string

}

export interface PortfolioKeyTeacherSaveRequest {
  id?: string
  teacherUserId: string
  registryType: PortfolioKeyTeacherRegistryTypeCode
  specialtyName?: string
  majorGroupName?: string
  appointYear?: string
  dutyScope?: string
  remark?: string
  attachmentFileIds?: string[]
}


export interface PortfolioKeyTeacherStatusCountVO {
  registryStatus: PortfolioKeyTeacherRegistryStatusCode
  count: number
}

export interface PortfolioKeyTeacherTypeCountVO {
  registryType: PortfolioKeyTeacherRegistryTypeCode
  count: number
}

export interface PortfolioKeyTeacherDepartmentCountVO {
  departmentId: string
  departmentName: string
  count: number
}

export interface PortfolioKeyTeacherAnalyticsVO {
  totalCount: number
  activeCount: number
  statusCounts: PortfolioKeyTeacherStatusCountVO[]
  typeCounts: PortfolioKeyTeacherTypeCountVO[]
  /** §8.61 在岗结构教师数 */
  structureTeacherCount?: number
  /** 在岗结构内在册骨干教师数 */
  structureKeyTeacherCount?: number
  /** 在岗结构内在册专业带头人数 */
  structureProgramLeaderCount?: number
  /** 骨干比例百分比 */
  keyTeacherRatioPercent?: number | string
  /** 专业带头人比例百分比 */
  programLeaderRatioPercent?: number | string
  /** 在岗骨干院系分布 */
  keyTeacherDepartmentCounts?: PortfolioKeyTeacherDepartmentCountVO[]
}

export const portfolioKeyTeacherApi = {
  page: (data: PortfolioKeyTeacherPageRequest) =>
    http.post<PageResult<PortfolioKeyTeacherRegistryVO>>('/api/portfolio/key-teacher/page', data),
  save: (data: PortfolioKeyTeacherSaveRequest) =>
    http.post<string>('/api/portfolio/key-teacher/save', data),
  revoke: (data: { id: string }) => http.post<void>('/api/portfolio/key-teacher/revoke', data),
  exportRoster: (data: PortfolioKeyTeacherExportRequest = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/key-teacher/export-roster', data),
  analyticsStats: () =>
    http.post<PortfolioKeyTeacherAnalyticsVO>('/api/portfolio/key-teacher/analytics/stats', {}),
}

export interface PortfolioDoubleDutyRegistryVO {
  id: string
  teacherUserId: string
  teacherName: string
  teacherNumber: string
  departmentName?: string
  adminPostName?: string
  teachingPostName?: string
  appointYear?: string
  dutyScope?: string
  remark?: string
  registryStatus: PortfolioKeyTeacherRegistryStatusCode
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
  createTime?: string
  updateTime?: string
}

export interface PortfolioDoubleDutyStatusCountVO {
  registryStatus: PortfolioKeyTeacherRegistryStatusCode
  count: number
}

export interface PortfolioDoubleDutyAppointYearCountVO {
  appointYear: string
  count: number
}

export interface PortfolioDoubleDutyDepartmentCountVO {
  departmentId: string
  departmentName: string
  count: number
}

export interface PortfolioDoubleDutyAnalyticsVO {
  totalCount: number
  activeCount: number
  statusCounts: PortfolioDoubleDutyStatusCountVO[]
  appointYearCounts: PortfolioDoubleDutyAppointYearCountVO[]
  /** §8.61 在岗结构教师数 */
  structureTeacherCount?: number
  /** 在岗结构内在册双肩挑教师数 */
  structureDoubleDutyCount?: number
  /** 双肩挑比例百分比 */
  doubleDutyRatioPercent?: number | string
  /** 在岗双肩挑院系分布 */
  departmentCounts?: PortfolioDoubleDutyDepartmentCountVO[]
}

export interface PortfolioDoubleDutyPageRequest extends QueryDto {
  teacherUserId?: string
  registryStatus?: PortfolioKeyTeacherRegistryStatusCode
  appointYear?: string
  searchText?: string
}

export interface PortfolioDoubleDutyExportRequest {
  registryStatus?: PortfolioKeyTeacherRegistryStatusCode
  /** §7.9 / §8.24 批量导出用途（强审计必填） */
  exportPurpose: string

}

export interface PortfolioDoubleDutySaveRequest {
  id?: string
  teacherUserId: string
  adminPostName?: string
  teachingPostName?: string
  appointYear?: string
  dutyScope?: string
  remark?: string
}

export const portfolioDoubleDutyApi = {
  page: (data: PortfolioDoubleDutyPageRequest) =>
    http.post<PageResult<PortfolioDoubleDutyRegistryVO>>('/api/portfolio/double-duty/page', data),
  save: (data: PortfolioDoubleDutySaveRequest) =>
    http.post<string>('/api/portfolio/double-duty/save', data),
  revoke: (data: { id: string }) => http.post<void>('/api/portfolio/double-duty/revoke', data),
  exportRoster: (data: PortfolioDoubleDutyExportRequest = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/double-duty/export-roster', data),
  analyticsStats: () =>
    http.post<PortfolioDoubleDutyAnalyticsVO>('/api/portfolio/double-duty/analytics/stats', {}),
}

export interface PortfolioTeacherSalaryVO {
  id: string
  teacherUserId: string
  /** edu-user 教师姓名 */
  teacherName?: string
  /** edu-user 教师工号 */
  teacherNumber?: string
  salaryMonth: string
  baseAmount?: number
  performanceAmount?: number
  allowanceAmount?: number
  baseAmountDisplay?: string
  performanceAmountDisplay?: string
  allowanceAmountDisplay?: string
  dataSource?: PortfolioBusinessDataSourceTypeCode
  remark?: string
  createTime?: string
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

export interface PortfolioTeacherSalaryPageRequest extends QueryDto {
  teacherUserId?: string
  salaryMonth?: string
}

export interface PortfolioTeacherSalaryExportRequest {
  teacherUserId?: string
  salaryMonth?: string
  /** §7.9 批量导出用途 */
  exportPurpose: string

}

export interface PortfolioTeacherSalarySaveRequest {
  id?: string
  teacherUserId: string
  salaryMonth: string
  baseAmount?: number
  performanceAmount?: number
  allowanceAmount?: number
  dataSource?: PortfolioBusinessDataSourceTypeCode
  remark?: string
}

export const portfolioTeacherSalaryApi = {
  page: (data: PortfolioTeacherSalaryPageRequest) =>
    http.post<PageResult<PortfolioTeacherSalaryVO>>('/api/portfolio/teacher-salary/page', data),
  save: (data: PortfolioTeacherSalarySaveRequest) =>
    http.post<string>('/api/portfolio/teacher-salary/save', data),
  export: (data: PortfolioTeacherSalaryExportRequest = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/teacher-salary/export', data),
}

export interface PortfolioTeacherLibraryBorrowVO {
  id: string
  teacherUserId: string
  /** edu-user 教师姓名 */
  teacherName?: string
  /** edu-user 教师工号 */
  teacherNumber?: string
  bookTitle: string
  bookIsbn?: string
  borrowTime?: string
  dueTime?: string
  returnTime?: string
  overdueDays?: number
  dataSource?: PortfolioBusinessDataSourceTypeCode
  remark?: string
  createTime?: string
  /** 生命周期状态编码 ACTIVE/SEALED/TEMP_HOLD 等 */
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  /** 生命周期状态中文标签 */
  lifecycleStatusLabel?: string
  /** 是否禁止档案写 */
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  /** 是否计入当前在岗结构 */
  countsInCurrentFacultyStructure?: boolean
  /** 归属教师多身份并列层（US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份说明 */
  ownerMultiIdentityNote?: string
}

export interface PortfolioTeacherLibraryBorrowStatsVO {
  activeBorrowCount: number
  overdueCount: number
}

export interface PortfolioTeacherLibraryBorrowPageRequest extends QueryDto {
  teacherUserId?: string
  searchText?: string
  activeOnly?: boolean
}

export interface PortfolioTeacherLibraryBorrowExportRequest {
  teacherUserId?: string
  activeOnly?: boolean
  /** §7.9 批量导出用途 */
  exportPurpose: string

}

export interface PortfolioTeacherLibraryBorrowStatsRequest {
  teacherUserId?: string
}

export interface PortfolioTeacherLibraryBorrowSaveRequest {
  id?: string
  teacherUserId: string
  bookTitle: string
  bookIsbn?: string
  borrowTime?: string
  dueTime?: string
  returnTime?: string
  overdueDays?: number
  dataSource?: PortfolioBusinessDataSourceTypeCode
  remark?: string
}

export const portfolioTeacherLibraryApi = {
  page: (data: PortfolioTeacherLibraryBorrowPageRequest) =>
    http.post<PageResult<PortfolioTeacherLibraryBorrowVO>>(
      '/api/portfolio/teacher-library/page',
      data,
    ),
  save: (data: PortfolioTeacherLibraryBorrowSaveRequest) =>
    http.post<string>('/api/portfolio/teacher-library/save', data),
  export: (data: PortfolioTeacherLibraryBorrowExportRequest = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/teacher-library/export', data),
  stats: (data: PortfolioTeacherLibraryBorrowStatsRequest = {}) =>
    http.post<PortfolioTeacherLibraryBorrowStatsVO>('/api/portfolio/teacher-library/stats', data),
}

export interface PortfolioTeacherRecommendFilterSnapshot {
  minHonorCount?: number
  requiredLevelCode?: string
  requireDualTeacher?: boolean
  requireKeyTeacherType?: PortfolioKeyTeacherRegistryTypeCode
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
  recommendScene: PortfolioTeacherRecommendSceneCode
  enabled?: boolean
  filterSnapshot?: PortfolioTeacherRecommendFilterSnapshot
  createTime?: string
}

export interface PortfolioTeacherRecommendCandidateVO {
  id: string
  runId: string
  teacherUserId: string
  /** edu-user 教师姓名 */
  teacherName: string
  /** edu-user 教师工号 */
  teacherNumber: string
  rankOrder: number
  ruleScore?: number
  reasonText?: string
  evidenceSummary?: PortfolioTeacherRecommendEvidenceSummary
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

export interface PortfolioTeacherRecommendRunVO {
  id: string
  ruleId: string
  runMode: PortfolioTeacherRecommendRunModeCode
  runStatus: PortfolioTeacherRecommendRunStatusCode
  candidateCount: number
  runTime?: string
  operatorUserId?: string
}

export interface PortfolioTeacherRecommendExplainCandidateItemVO {
  teacherUserId: string
  /** edu-user 教师姓名 */
  teacherName: string
  /** edu-user 教师工号 */
  teacherNumber: string
  reasonText: string
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
  /** 多身份并列层（在岗 ACTIVE 身份；与生命周期结构态正交） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份并列提示（多于一层时非空） */
  ownerMultiIdentityNote?: string
}

export interface PortfolioTeacherRecommendExplainStatusVO {
  runId: string
  explainTaskId?: string
  status?: AiTaskStatusCode
  candidateItems?: PortfolioTeacherRecommendExplainCandidateItemVO[]
}

export interface PortfolioTeacherRecommendExplainSubmitVO {
  taskId: string
  runId: string
  status: AiTaskStatusCode
}

export interface PortfolioTeacherPkCompareDimensionRowVO {
  dimensionCode: PortfolioPortraitDimensionCode
  dimensionLabel: string
  dimensionScore: number
  evidenceSummary?: string
}

export interface PortfolioTeacherPkMaterialRefVO {
  recordId: string
  categoryName: string
  updateTime: string
}

export interface PortfolioTeacherPkCompareTeacherVO {
  teacherUserId: string
  displayName?: string
  teacherNumber?: string
  officialArchiveCount: number
  materialRefs: PortfolioTeacherPkMaterialRefVO[]
  dimensionRows: PortfolioTeacherPkCompareDimensionRowVO[]

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

export interface PortfolioTeacherPkCompareVO {
  sessionId?: string
  sessionPurpose?: string
  maskMode?: boolean
  dimensionCodes: PortfolioPortraitDimensionCode[]
  teachers: PortfolioTeacherPkCompareTeacherVO[]
  comparedTime: string
}

export interface PortfolioTeacherRecommendRunPageRequest extends QueryDto {
  ruleId?: string
  runStatus?: PortfolioTeacherRecommendRunStatusCode
}

export interface PortfolioTeacherRecommendCandidatePageRequest extends QueryDto {
  runId: string
  teacherUserId?: string
}

export interface PortfolioTeacherRecommendPkCompareRequest {
  teacherUserIds: string[]
  dimensionCodes: PortfolioPortraitDimensionCode[]
  maskMode?: boolean
}

export interface PortfolioTeacherRecommendRuleSaveRequest {
  id?: string
  ruleName: string
  recommendScene: PortfolioTeacherRecommendSceneCode
  enabled?: boolean
  filterSnapshot: PortfolioTeacherRecommendRuleVO['filterSnapshot']
}

export interface PortfolioTeacherRecommendRuleListRequest {
  recommendScene?: PortfolioTeacherRecommendSceneCode
  enabledOnly?: boolean
}

export interface PortfolioTeacherRecommendRunExecuteRequest {
  ruleId: string
}

export interface PortfolioTeacherRecommendExplainSubmitRequest {
  runId: string
}

export interface PortfolioTeacherRecommendExplainStatusRequest {
  runId: string
}

export const portfolioTeacherRecommendationApi = {
  saveRule: (data: PortfolioTeacherRecommendRuleSaveRequest) =>
    http.post<string>('/api/portfolio/recommendation/rule/save', data),
  listRules: (data: PortfolioTeacherRecommendRuleListRequest = {}) =>
    http.post<PortfolioTeacherRecommendRuleVO[]>('/api/portfolio/recommendation/rule/list', data),
  executeRun: (data: PortfolioTeacherRecommendRunExecuteRequest) =>
    http.post<string>('/api/portfolio/recommendation/run/execute', data),
  pageRuns: (data: PortfolioTeacherRecommendRunPageRequest) =>
    http.post<PageResult<PortfolioTeacherRecommendRunVO>>(
      '/api/portfolio/recommendation/run/page',
      data,
    ),
  pageCandidates: (data: PortfolioTeacherRecommendCandidatePageRequest) =>
    http.post<PageResult<PortfolioTeacherRecommendCandidateVO>>(
      '/api/portfolio/recommendation/candidate/page',
      data,
    ),
  pkCompare: (data: PortfolioTeacherRecommendPkCompareRequest) =>
    http.post<PortfolioTeacherPkCompareVO>('/api/portfolio/recommendation/pk-compare', data),
  explainSubmit: (data: PortfolioTeacherRecommendExplainSubmitRequest) =>
    http.post<PortfolioTeacherRecommendExplainSubmitVO>(
      '/api/portfolio/recommendation/ai/explain-submit',
      data,
    ),
  explainStatus: (data: PortfolioTeacherRecommendExplainStatusRequest) =>
    http.post<PortfolioTeacherRecommendExplainStatusVO>(
      '/api/portfolio/recommendation/run/explain-status',
      data,
    ),
}

export interface PortfolioPortraitLayoutWidgetDto {
  widget: PortraitWidgetTypeCode
  x: number
  y: number
  w: number
  h: number
}

export interface PortfolioPortraitChartConfigEntryDto {
  widgetIndex: number
  dimensionCode: PortfolioPortraitDimensionCode
}

export interface PortfolioPortraitTemplateVO {
  id: string
  templateName: string
  academicYear?: string
  templateStatus?: PortfolioPortraitTemplateStatusCode
  layout?: PortfolioPortraitLayoutWidgetDto[]
  chartConfig?: PortfolioPortraitChartConfigEntryDto[]
  createTime?: string
}

export interface PortfolioPortraitTemplateSaveRequest {
  id?: string
  templateName: string
  academicYear?: string
  layout: PortfolioPortraitLayoutWidgetDto[]
  chartConfig?: PortfolioPortraitChartConfigEntryDto[]
}

export interface PortfolioPortraitTemplateListRequest {
  templateStatus?: PortfolioPortraitTemplateStatusCode
}

export const portfolioPortraitTemplateApi = {
  list: (data: PortfolioPortraitTemplateListRequest = {}) =>
    http.post<PortfolioPortraitTemplateVO[]>('/api/portfolio/portrait-template/list', data),
  get: (data: { id: string }) =>
    http.post<PortfolioPortraitTemplateVO>('/api/portfolio/portrait-template/get', data),
  save: (data: PortfolioPortraitTemplateSaveRequest) =>
    http.post<string>('/api/portfolio/portrait-template/save', data),
  activate: (data: { id: string }) =>
    http.post<void>('/api/portfolio/portrait-template/activate', data),
  deactivate: (data: { id: string }) =>
    http.post<void>('/api/portfolio/portrait-template/deactivate', data),
}

export {
  ALL_PORTFOLIO_PORTRAIT_TEMPLATE_STATUS_CODES,
  PortfolioPortraitTemplateStatusCode,
  PortfolioPortraitTemplateStatusDescription,
} from '@/types/enums/portfolio-portrait-template-status-enum'

export interface PortfolioEvaluationWorkgroupMemberOptionVO {
  userId: string
  userCode?: string
  userName?: string
  role?: string
}

export interface PortfolioEvaluationSubjectTeacherOptionVO {
  teacherUserId: string
  fullName: string
  teacherNumber: string
  /** 生命周期状态编码 ACTIVE/SEALED/TEMP_HOLD 等 */
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  /** 生命周期状态中文标签 */
  lifecycleStatusLabel?: string
  /** 是否禁止档案写 */
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  /** 是否计入当前在岗结构 */
  countsInCurrentFacultyStructure?: boolean
  /** 归属教师多身份并列层（US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份说明 */
  ownerMultiIdentityNote?: string
}

export interface PortfolioEvaluationIndicatorOptionVO {
  indicatorCode: string
  indicatorName: string
}

export interface PortfolioEvaluationTaskFillContextVO {
  id: string
  taskName: string
  evaluationMode: PortfolioEvaluationModeCode
  targetIndicatorCode?: string
  taskStatus: PortfolioEvaluationTaskStatusEnum
  suspendedFromStatus?: PortfolioEvaluationTaskStatusEnum
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
  evaluationMode: PortfolioEvaluationModeCode
  /** §8.48 任务业务场景 */
  sceneCode?: PortfolioEvaluationSceneCode
  targetIndicatorCode?: string
  taskStatus: PortfolioEvaluationTaskStatusEnum
  suspendedFromStatus?: PortfolioEvaluationTaskStatusEnum
  /** 暂停开始时间；公示期与流程时钟在此时点冻结。 */
  suspendedAt?: string
  workgroupId?: string
  startTime?: string
  endTime?: string
  createTime?: string
  pendingObjectionCount?: number
  publicityExpiredAwaitingArchive?: boolean
  /** 四冻结 SNAP 是否完成（对象/周期/模型/材料） */
  freezeCompleted?: boolean
  /** 四冻结完成时间 */
  freezeTime?: string
}

export interface PortfolioEvaluationTaskPageRequest extends QueryDto {
  taskStatus?: PortfolioEvaluationTaskStatusEnum
  /** §8.48 任务业务场景筛选 */
  sceneCode?: PortfolioEvaluationSceneCode
  /** PF-P0-293：站内信/待办深链定位评价任务 */
  locateTaskId?: string
}

export interface PortfolioEvaluationTaskCreateRequest {
  taskName: string
  evaluationMode: PortfolioEvaluationModeCode
  /** §8.48 任务业务场景；缺省后端按 GENERAL */
  sceneCode?: PortfolioEvaluationSceneCode
  targetIndicatorCode?: string
  workgroupId: string
  startTime?: string
  endTime?: string
}

/** 可用于创建评价任务的启用工作组。 */
export interface PortfolioEvaluationWorkgroupOptionVO {
  id: string
  workgroupName: string
  workgroupCode: string
  enabled: boolean
}

export interface PortfolioEvaluationWorkgroupPageRequest extends QueryDto {
  enabled?: boolean
}

export const portfolioEvaluationWorkgroupApi = {
  page: (data: PortfolioEvaluationWorkgroupPageRequest) =>
    http.post<PageResult<PortfolioEvaluationWorkgroupOptionVO>>(
      '/api/quality/evaluation-workgroups/page',
      data,
    ),
}

export const portfolioEvaluationTaskApi = {
  create: (data: PortfolioEvaluationTaskCreateRequest) =>
    http.post<string>('/api/portfolio/evaluation-task/create', data),
  publish: (data: { id: string }) =>
    http.post<void>('/api/portfolio/evaluation-task/publish', data),
  fillContext: (data: { id: string }) =>
    http.post<PortfolioEvaluationTaskFillContextVO>(
      '/api/portfolio/evaluation-task/fill-context',
      data,
    ),
  page: (data: PortfolioEvaluationTaskPageRequest) =>
    http.post<PageResult<PortfolioEvaluationTaskVO>>('/api/portfolio/evaluation-task/page', data),
  exportExcel: (data: { exportPurpose: string }) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/evaluation-task/export-excel', data),
}

export interface PortfolioEvaluationEntryVO {
  id: string
  evaluationTaskId: string
  subjectTeacherUserId: string
  indicatorCode?: string
  score: number
  commentText?: string
  evaluatorUserId: string
  evaluatorSourceType?: PortfolioMultiSourceEvaluatorTypeEnum
  evaluatorSourceTypeLabel?: string
  createTime?: string
  updateTime?: string
}

export interface PortfolioEvaluationEntrySummaryItemVO {
  subjectTeacherUserId?: string
  indicatorCode?: string
  entryCount: number
  averageScore: number
  weightedScore?: number
  studentSampleSize?: number
  studentWeightZeroed?: boolean
  weightNote?: string
}

export interface PortfolioEvaluationEntrySummaryVO {
  evaluationTaskId: string
  evaluationMode: PortfolioEvaluationModeCode
  /** 业务场景（§8.48 多周期隔离） */
  sceneCode?: PortfolioEvaluationSceneCode
  entryCount: number
  averageScore: number
  rows: PortfolioEvaluationEntrySummaryItemVO[]
}

export interface PortfolioEvaluationComprehensiveTaskItemVO {
  evaluationTaskId: string
  taskName: string
  evaluationMode: PortfolioEvaluationModeCode
  /** 业务场景（§8.48 多周期隔离） */
  sceneCode?: PortfolioEvaluationSceneCode
  entryCount: number
  averageScore: number
}

export interface PortfolioEvaluationComprehensiveTeacherRowVO {
  subjectTeacherUserId: string
  /** edu-user 被评教师姓名 */
  subjectTeacherName?: string
  /** edu-user 被评教师工号 */
  subjectTeacherNumber?: string
  /** 涉及业务场景枚举列表 */
  involvedScenes?: PortfolioEvaluationSceneCode[]
  involvedTaskCount: number
  entryCount: number
  averageScore: number
  /** 归属教师生命周期状态编码 */
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  /** 归属教师生命周期状态标签 */
  lifecycleStatusLabel?: string
  /** 档案写禁 */
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  /** 是否计入当前在岗结构 */
  countsInCurrentFacultyStructure?: boolean
  /** 归属教师多身份并列层（US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份说明 */
  ownerMultiIdentityNote?: string
}

export interface PortfolioEvaluationComprehensiveAnalysisVO {
  taskCount: number
  totalEntryCount: number
  overallAverageScore: number
  tasks: PortfolioEvaluationComprehensiveTaskItemVO[]
  teacherRows: PortfolioEvaluationComprehensiveTeacherRowVO[]
}

export interface PortfolioEvaluationEntryPageRequest extends QueryDto {
  evaluationTaskId: string
  subjectTeacherUserId?: string
  indicatorCode?: string
}

export interface PortfolioEvaluationEntrySaveRequest {
  evaluationTaskId: string
  subjectTeacherUserId: string
  indicatorCode?: string
  score: number
  commentText?: string
  /** 评价来源类型 */
  evaluatorSourceType: PortfolioMultiSourceEvaluatorTypeEnum
}

export interface PortfolioEvaluationComprehensiveAnalysisRequest {
  workgroupId?: string
  planYear?: string
  evaluationTaskIds?: string[]

  /** 综合分析导出用途（export 必填） */
  exportPurpose?: string
}

export const portfolioEvaluationEntryApi = {
  save: (data: PortfolioEvaluationEntrySaveRequest) =>
    http.post<string>('/api/portfolio/evaluation-entry/save', data),
  page: (data: PortfolioEvaluationEntryPageRequest) =>
    http.post<PageResult<PortfolioEvaluationEntryVO>>('/api/portfolio/evaluation-entry/page', data),
  summary: (data: { id: string }) =>
    http.post<PortfolioEvaluationEntrySummaryVO>('/api/portfolio/evaluation-entry/summary', data),
  exportSummary: (data: { id: string, exportPurpose: string }) =>
    http.post<PortfolioArchiveBagExportResultVO>(
      '/api/portfolio/evaluation-entry/export-summary',
      data,
    ),
  comprehensiveAnalysis: (data: PortfolioEvaluationComprehensiveAnalysisRequest) =>
    http.post<PortfolioEvaluationComprehensiveAnalysisVO>(
      '/api/portfolio/evaluation-entry/comprehensive-analysis',
      data,
    ),
  exportComprehensiveAnalysis: (data: PortfolioEvaluationComprehensiveAnalysisRequest) =>
    http.post<PortfolioArchiveBagExportResultVO>(
      '/api/portfolio/evaluation-entry/export-comprehensive-analysis',
      data,
    ),
}
