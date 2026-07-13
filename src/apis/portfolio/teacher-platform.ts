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
  PortfolioEvaluationTaskStatusCode,
  PortfolioExternalTeacherDataStatusCode,
  PortfolioExternalTeacherImportBatchStatusCode,
  PortfolioKeyTeacherRegistryStatusCode,
  PortfolioKeyTeacherRegistryTypeCode,
  PortfolioPortraitDimensionCode,
  PortfolioTeacherRecommendRunModeCode,
  PortfolioTeacherRecommendRunStatusCode,
  PortfolioTeacherRecommendSceneCode,
} from '@/apis/portfolio/enums'
import type { AiTaskStatusCode } from '@/apis/quality/types'
import type { PageResult, QueryDto } from '@/types'
import type { PortfolioArchiveScoreRuleTypeCode } from '@/types/enums/portfolio-archive-score-rule-type-enum'
import type { PortfolioPortraitTemplateStatusCode } from '@/types/enums/portfolio-portrait-template-status-enum'
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
  buildMaterialPackage: (data: PortfolioArchiveBagTeacherRequest = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/material-package/build', data),
  exportBag: (data: PortfolioArchiveBagTeacherRequest = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/archive/bag/export', data),
  computeScore: (data: PortfolioArchiveScoreComputeRequest = {}) =>
    http.post<PortfolioArchiveScoreResultVO>('/api/portfolio/archive-score/compute', data),
}

export type {
  PortfolioEvaluationModeCode,
  PortfolioEvaluationTaskStatusCode,
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
  certLevel?: string
  certYear?: string
  enterprisePracticeDays?: number
  collegeAuditOpinion?: string
  academicAuditOpinion?: string
  createTime?: string
  updateTime?: string
  attachmentFileIds?: string[]
  eligibilityFreeze?: PortfolioDualTeacherEligibilityFreezeVO
}

export interface PortfolioDualTeacherImportResultVO {
  totalRows: number
  successRows: number
  failedRows: number
  errorReportJson?: string
}

export interface PortfolioDualTeacherPageRequest extends QueryDto {
  teacherUserId?: string
  applicationStatus?: PortfolioDualTeacherApplicationStatusCode
  certYear?: string
  searchText?: string
}

export interface PortfolioDualTeacherWorkflowRequest {
  id: string
  auditOpinion?: string
}

export interface PortfolioDualTeacherSaveDraftRequest {
  id?: string
  teacherUserId: string
  certLevel?: string
  certYear?: string
  enterprisePracticeDays?: number
  attachmentFileIds?: string[]
}

export interface PortfolioDualTeacherExportRequest {
  applicationStatus?: PortfolioDualTeacherApplicationStatusCode
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
}

export interface PortfolioDualTeacherStatusCountVO {
  applicationStatus: string
  count: number
}

export interface PortfolioDualTeacherCertLevelCountVO {
  certLevel: string
  count: number
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
  teachHours?: number
  employerUnit?: string
  teachMajor?: string
  teacherSource?: string
  trialScore?: string
  industryExperience?: string
  contractStatus?: string
  contactPhone?: string
  contactEmail?: string
  hireStartDate?: string
  hireEndDate?: string
  attachmentFileIds?: string[]
  dataStatus: PortfolioExternalTeacherDataStatusCode
  importBatchId?: string
  createTime?: string
}

export interface PortfolioExternalTeacherStatsVO {
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
  gender?: string
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
  contractStatus?: string
  contactPhone?: string
  contactEmail?: string
  hireStartDate?: string
  hireEndDate?: string
  attachmentFileIds?: string[]
  dataStatus?: PortfolioExternalTeacherDataStatusCode
}

export interface PortfolioExternalTeacherImportBatchVO {
  id: string
  fileName?: string
  successRows?: number
  failedRows?: number
  batchStatus: PortfolioExternalTeacherImportBatchStatusCode
  createTime?: string
}

export interface PortfolioExternalTeacherPageRequest extends QueryDto {
  searchText?: string
  dataStatus?: PortfolioExternalTeacherDataStatusCode
  importBatchId?: string
  teachSubject?: string
  teacherSource?: string
  contractStatus?: string
}

export interface PortfolioExternalTeacherStatsRequest {
  dataStatus?: PortfolioExternalTeacherDataStatusCode
  teachSubject?: string
  teacherSource?: string
  contractStatus?: string
}

export interface PortfolioExternalTeacherExportRequest {
  dataStatus?: PortfolioExternalTeacherDataStatusCode
  teachSubject?: string
  teacherSource?: string
  contractStatus?: string
}

export const portfolioExternalTeacherApi = {
  page: (data: PortfolioExternalTeacherPageRequest) =>
    http.post<PageResult<PortfolioExternalTeacherVO>>('/api/portfolio/external-teacher/page', data),
  stats: (data: PortfolioExternalTeacherStatsRequest = {}) =>
    http.post<PortfolioExternalTeacherStatsVO>('/api/portfolio/external-teacher/stats', data),
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
  planType?: string
  portfolioOrgId?: string
  ownerUserId?: string
  planSummary?: string
  createTime?: string
}

export interface PortfolioDevelopmentPlanItemVO {
  id?: string
  planId?: string
  itemTitle: string
  itemGoal?: string
  indicatorCode?: string
  milestoneText?: string
  completionPercent?: number
  itemStatus: PortfolioDevelopmentPlanItemStatusCode
  sortOrder?: number
}

export interface PortfolioDevelopmentPlanItemSaveRequest {
  itemTitle: string
  itemGoal?: string
  indicatorCode?: string
  milestoneText?: string
  completionPercent?: number
  itemStatus?: PortfolioDevelopmentPlanItemStatusCode
  sortOrder?: number
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
  errorReportJson?: string
  createTime?: string
}

export interface PortfolioDevelopmentPlanHistoryImportResultVO {
  batchId: string
  batchNo: string
  totalRows: number
  successRows: number
  failedRows: number
  batchStatus: PortfolioDevelopmentPlanHistoryImportBatchStatusCode
  errorReportJson?: string
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
}

export interface PortfolioDevelopmentPlanHistoryImportConfirmRequest {
  sourceFileId: string
  fileName?: string
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
  confirmHistoryImport: (data: PortfolioDevelopmentPlanHistoryImportConfirmRequest) =>
    http.post<PortfolioDevelopmentPlanHistoryImportResultVO>(
      '/api/portfolio/development-plan/history-import/confirm',
      data,
    ),
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
  levelCode?: string
  awardUnit?: string
  recordDate?: string
  teacherUserId?: string
  descriptionText?: string
  fileId?: string
  createTime?: string
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
  levelCode: string
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
  levelCode?: string
  awardUnit?: string
  recordDateFrom?: string
  recordDateTo?: string
  categoryCode?: string
}

export interface PortfolioDevelopmentRecordComprehensivePageRequest extends QueryDto {
  searchText?: string
  recordTypes?: string[]
  levelCode?: string
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
  levelCode?: string
  awardUnit?: string
  recordDate?: string
  descriptionText?: string
  fileId?: string
  recordStatus?: PortfolioDevelopmentRecordStatusCode
}

export interface PortfolioDevelopmentRecordExportRequest {
  recordType?: PortfolioDevelopmentRecordTypeCode
  categoryCode?: string
  levelCode?: string
  nationalOnly?: boolean
  teacherUserId?: string
  awardUnit?: string
  recordDateFrom?: string
  recordDateTo?: string
}

export interface PortfolioHonorExportRequest {
  teacherUserId?: string
  recordStatus?: PortfolioDevelopmentRecordStatusCode
  searchText?: string
  levelCode?: string
  awardUnit?: string
  recordDateFrom?: string
  recordDateTo?: string
  categoryCode?: string
  nationalOnly?: boolean
}

export const portfolioDevelopmentRecordApi = {
  page: (data: PortfolioDevelopmentRecordPageRequest) =>
    http.post<PageResult<PortfolioDevelopmentRecordVO>>(
      '/api/portfolio/development-record/page',
      data,
    ),
  get: (data: { id: string }) =>
    http.post<PortfolioDevelopmentRecordVO>('/api/portfolio/development-record/get', data),
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
  registryType: PortfolioKeyTeacherRegistryTypeCode
  specialtyName?: string
  majorGroupName?: string
  appointYear?: string
  dutyScope?: string
  remark?: string
  registryStatus: PortfolioKeyTeacherRegistryStatusCode
  createTime?: string
  updateTime?: string
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

export const portfolioKeyTeacherApi = {
  page: (data: PortfolioKeyTeacherPageRequest) =>
    http.post<PageResult<PortfolioKeyTeacherRegistryVO>>('/api/portfolio/key-teacher/page', data),
  get: (data: { id: string }) =>
    http.post<PortfolioKeyTeacherRegistryVO>('/api/portfolio/key-teacher/get', data),
  save: (data: PortfolioKeyTeacherSaveRequest) =>
    http.post<string>('/api/portfolio/key-teacher/save', data),
  revoke: (data: { id: string }) => http.post<void>('/api/portfolio/key-teacher/revoke', data),
  exportRoster: (data: PortfolioKeyTeacherExportRequest = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/key-teacher/export-roster', data),
}

export interface PortfolioDoubleDutyRegistryVO {
  id: string
  teacherUserId: string
  teacherName?: string
  departmentName?: string
  adminPostName?: string
  teachingPostName?: string
  appointYear?: string
  dutyScope?: string
  remark?: string
  registryStatus: PortfolioKeyTeacherRegistryStatusCode
  createTime?: string
  updateTime?: string
}

export interface PortfolioDoubleDutyStatusCountVO {
  registryStatus: string
  count: number
}

export interface PortfolioDoubleDutyAppointYearCountVO {
  appointYear: string
  count: number
}

export interface PortfolioDoubleDutyAnalyticsVO {
  totalCount: number
  activeCount: number
  statusCounts: PortfolioDoubleDutyStatusCountVO[]
  appointYearCounts: PortfolioDoubleDutyAppointYearCountVO[]
}

export interface PortfolioDoubleDutyPageRequest extends QueryDto {
  teacherUserId?: string
  registryStatus?: PortfolioKeyTeacherRegistryStatusCode
  appointYear?: string
  searchText?: string
}

export interface PortfolioDoubleDutyExportRequest {
  registryStatus?: PortfolioKeyTeacherRegistryStatusCode
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
  get: (data: { id: string }) =>
    http.post<PortfolioDoubleDutyRegistryVO>('/api/portfolio/double-duty/get', data),
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
  salaryMonth: string
  baseAmount?: number
  performanceAmount?: number
  allowanceAmount?: number
  baseAmountDisplay?: string
  performanceAmountDisplay?: string
  allowanceAmountDisplay?: string
  dataSource?: string
  remark?: string
  createTime?: string
}

export interface PortfolioTeacherSalaryPageRequest extends QueryDto {
  teacherUserId?: string
  salaryMonth?: string
}

export interface PortfolioTeacherSalaryExportRequest {
  teacherUserId?: string
  salaryMonth?: string
}

export interface PortfolioTeacherSalarySaveRequest {
  id?: string
  teacherUserId: string
  salaryMonth: string
  baseAmount?: number
  performanceAmount?: number
  allowanceAmount?: number
  dataSource?: string
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

export interface PortfolioTeacherLibraryBorrowPageRequest extends QueryDto {
  teacherUserId?: string
  searchText?: string
  activeOnly?: boolean
}

export interface PortfolioTeacherLibraryBorrowExportRequest {
  teacherUserId?: string
  activeOnly?: boolean
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
  dataSource?: string
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
  rankOrder: number
  ruleScore?: number
  reasonText?: string
  evidenceSummary?: PortfolioTeacherRecommendEvidenceSummary
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
  reasonText: string
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
}

export interface PortfolioTeacherPkCompareTeacherVO {
  teacherUserId: string
  dimensionRows: PortfolioTeacherPkCompareDimensionRowVO[]
}

export interface PortfolioTeacherPkCompareVO {
  teachers: PortfolioTeacherPkCompareTeacherVO[]
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

export interface PortfolioPortraitTemplateVO {
  id: string
  templateName: string
  academicYear?: string
  templateStatus?: PortfolioPortraitTemplateStatusCode
  layoutJson?: string
  chartConfigJson?: string
  createTime?: string
}

export interface PortfolioPortraitTemplateSaveRequest {
  id?: string
  templateName: string
  academicYear?: string
  layoutJson: string
  chartConfigJson?: string
  templateStatus?: PortfolioPortraitTemplateStatusCode
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
  taskStatus: PortfolioEvaluationTaskStatusCode
  suspendedFromStatus?: PortfolioEvaluationTaskStatusCode
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
  targetIndicatorCode?: string
  taskStatus: PortfolioEvaluationTaskStatusCode
  workgroupId?: string
  startTime?: string
  endTime?: string
  createTime?: string
  pendingObjectionCount?: number
  publicityExpiredAwaitingArchive?: boolean
}

export interface PortfolioEvaluationTaskPageRequest extends QueryDto {
  taskStatus?: PortfolioEvaluationTaskStatusCode
}

export interface PortfolioEvaluationTaskCreateRequest {
  taskName: string
  evaluationMode: PortfolioEvaluationModeCode
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
  get: (data: { id: string }) =>
    http.post<PortfolioEvaluationTaskVO>('/api/portfolio/evaluation-task/get', data),
  fillContext: (data: { id: string }) =>
    http.post<PortfolioEvaluationTaskFillContextVO>(
      '/api/portfolio/evaluation-task/fill-context',
      data,
    ),
  page: (data: PortfolioEvaluationTaskPageRequest) =>
    http.post<PageResult<PortfolioEvaluationTaskVO>>('/api/portfolio/evaluation-task/page', data),
  exportExcel: () =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/evaluation-task/export-excel', {}),
}

export interface PortfolioEvaluationEntryVO {
  id: string
  evaluationTaskId: string
  subjectTeacherUserId: string
  indicatorCode?: string
  score: number
  commentText?: string
  evaluatorUserId: string
  createTime?: string
  updateTime?: string
}

export interface PortfolioEvaluationEntrySummaryItemVO {
  subjectTeacherUserId?: string
  indicatorCode?: string
  entryCount: number
  averageScore: number
}

export interface PortfolioEvaluationEntrySummaryVO {
  evaluationTaskId: string
  evaluationMode: PortfolioEvaluationModeCode
  entryCount: number
  averageScore: number
  rows: PortfolioEvaluationEntrySummaryItemVO[]
}

export interface PortfolioEvaluationComprehensiveTaskItemVO {
  evaluationTaskId: string
  taskName: string
  evaluationMode: PortfolioEvaluationModeCode
  entryCount: number
  averageScore: number
}

export interface PortfolioEvaluationComprehensiveTeacherRowVO {
  subjectTeacherUserId: string
  involvedTaskCount: number
  entryCount: number
  averageScore: number
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
}

export interface PortfolioEvaluationComprehensiveAnalysisRequest {
  workgroupId?: string
  planYear?: string
  evaluationTaskIds?: string[]
}

export const portfolioEvaluationEntryApi = {
  save: (data: PortfolioEvaluationEntrySaveRequest) =>
    http.post<string>('/api/portfolio/evaluation-entry/save', data),
  page: (data: PortfolioEvaluationEntryPageRequest) =>
    http.post<PageResult<PortfolioEvaluationEntryVO>>('/api/portfolio/evaluation-entry/page', data),
  summary: (data: { id: string }) =>
    http.post<PortfolioEvaluationEntrySummaryVO>('/api/portfolio/evaluation-entry/summary', data),
  exportSummary: (data: { id: string }) =>
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
