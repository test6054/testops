import type { PortfolioArchiveBagExportResultVO } from '@/apis/portfolio/bag-types'
import type { PortfolioExportApprovalVO } from '@/apis/portfolio/governance'
import type { PortfolioTeacherLifecycleStatusCode } from '@/apis/portfolio/teacher-lifecycle'
import type {
  PortfolioAgeBandDistributionItemVO,
  PortfolioCompletenessLevelCode,
  PortfolioMetricDistributionItemVO,
  PortfolioMultiIdentityLayerVO,
  PortfolioRetirementWindowDistributionItemVO,
  PortfolioTeacherDetailVO,
  PortfolioTeacherIdentitySaveRequest,
  PortfolioTeacherIdentityTypeCode,
  PortfolioTeacherOneTableCategoryVO,
  PortfolioTeacherOneTableGetRequest,
  PortfolioTeacherPageRequest,
  PortfolioTeacherSummaryVO,
  PortfolioTenureBandDistributionItemVO,
} from '@/apis/portfolio/types'
import type { PageResult, QueryDto } from '@/types'
import type { PortfolioDeptTeacherSegmentCode } from '@/types/enums/portfolio-dept-teacher-segment-code-enum'
import type { PortfolioDevelopmentPlanStatusCode } from '@/types/enums/portfolio-development-plan-status-enum'
import type { PortfolioMetricRecomputeStatusCode } from '@/types/enums/portfolio-metric-recompute-status-enum'
import type { PortfolioTitleTierCode } from '@/types/enums/portfolio-title-tier-enum'
import http from '@/config/axios'

export interface PortfolioTeacherOneTableSummaryVO {
  teacherUserId: string
  teacherNumber?: string
  nickName?: string
  departmentName?: string
  title?: string
  identityTags: PortfolioTeacherIdentityTypeCode[]
  achievementCount?: number
  honorCount?: number
  correctionPending?: boolean
  recentChangeSummary: string[]
  categories: PortfolioTeacherOneTableCategoryVO[]
  currentAcademicYear?: string
  completenessPercent?: number
  completenessLevel?: PortfolioCompletenessLevelCode
  courseArchiveTaughtCourseCount?: number
  courseArchiveFullyCompleteCount?: number
  courseArchiveFrameworkSlotDone?: number
  courseArchiveFrameworkSlotTotal?: number
  /** 生命周期状态编码 ACTIVE/SEALED/TEMP_HOLD 等 */
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  /** 生命周期状态中文标签 */
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

export interface PortfolioDeptOneTableSummaryVO {
  departmentId: string
  departmentName?: string
  teacherCount: number
  titleSeniorCount: number
  titleAssociateCount: number
  titleMiddleCount: number
  titleJuniorCount: number
  titleUnclassifiedCount: number
  dualTeacherCount: number
  externalTeacherCount: number
  keyTeacherCount: number
  planYear?: string
  achievementTotalCount?: number
  honorTotalCount?: number
  developmentPlanTotalCount?: number
  developmentPlanApprovedCount?: number
  developmentPlanCompletionRatePercent?: number
  currentAcademicYear?: string
  completenessCompleteCount?: number
  completenessBasicCount?: number
  completenessPendingCount?: number
  completenessSevereCount?: number
  completenessUncalculatedCount?: number
  courseArchiveTaughtCourseCount?: number
  courseArchiveFullyCompleteCount?: number
  courseArchiveFrameworkSlotDone?: number
  courseArchiveFrameworkSlotTotal?: number
  teachingWorkloadAvgCoursesPerTeacher?: number
  metricRecomputeStatus?: PortfolioMetricRecomputeStatusCode
  metricComputedTime?: string
  trainingRequiredTeacherCount?: number
  trainingCompletedTeacherCount?: number
  trainingCompletionRatePercent?: number
  gapTaskOpenCount?: number
  reviewTaskBacklogCount?: number
  politicalAffiliationDistribution?: PortfolioMetricDistributionItemVO[]
  educationDegreeDistribution?: PortfolioMetricDistributionItemVO[]
  ageBandDistribution?: PortfolioAgeBandDistributionItemVO[]
  tenureBandDistribution?: PortfolioTenureBandDistributionItemVO[]
  retirementWindowDistribution?: PortfolioRetirementWindowDistributionItemVO[]
  postCategoryDistribution?: PortfolioMetricDistributionItemVO[]
}

export interface PortfolioDeptOneTableTeacherRowVO {
  teacherUserId: string
  teacherNumber?: string
  nickName?: string
  title?: string
  titleTier?: PortfolioTitleTierCode
  dualTeacherApproved?: boolean
  keyTeacherActive?: boolean
  externalTeacher?: boolean
  achievementCount?: number
  honorCount?: number
  planYear?: string
  developmentPlanStatus?: PortfolioDevelopmentPlanStatusCode
  developmentPlanItemCompletionPercent?: number
  completenessPercent?: number
  completenessLevel?: PortfolioCompletenessLevelCode
  courseArchiveTaughtCourseCount?: number
  courseArchiveFullyCompleteCount?: number
  courseArchiveFrameworkSlotDone?: number
  courseArchiveFrameworkSlotTotal?: number
  /** 生命周期状态编码 ACTIVE/SEALED/TEMP_HOLD 等 */
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  /** 生命周期状态中文标签 */
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

export interface PortfolioDeptTeacherSegmentItemVO {
  segmentCode: PortfolioDeptTeacherSegmentCode
  teacherCount: number
  sampleTeacherUserIds: string[]
}

export interface PortfolioDeptTeacherSegmentSummaryVO {
  departmentId: string
  segments: PortfolioDeptTeacherSegmentItemVO[]
}

export interface PortfolioDeptStructureStatVO {
  totalTeacherCount: number
  departments: PortfolioDeptStructureStatItemVO[]
}

export interface PortfolioDeptStructureStatItemVO {
  departmentId: string
  departmentName?: string
  teacherCount: number
}

export interface PortfolioDeptOneTableGetRequest {
  departmentId: string
  planYear?: string
  completenessLevel?: PortfolioCompletenessLevelCode
  portfolioOrgId?: string
  teachingGroupId?: string
}

export interface PortfolioDeptOneTableExportRequest {
  departmentId: string
  planYear?: string
  completenessLevel?: PortfolioCompletenessLevelCode
  portfolioOrgId?: string
  teachingGroupId?: string
}

export interface PortfolioDeptOneTableTeacherPageRequest extends QueryDto {
  departmentId: string
  planYear?: string
  completenessLevel?: PortfolioCompletenessLevelCode
  portfolioOrgId?: string
  teachingGroupId?: string
}

export interface PortfolioDepartmentReportExportApplyRequest extends PortfolioDeptOneTableExportRequest {
  constructionPeriodLabel?: string
  baselinePeriodLabel?: string
  /** 是否纳入双高监测；false 时仅院系一表通 */
  includeDoubleHigh: boolean
  exportPurpose: string
}

const BASE = '/api/portfolio/teacher'

export const portfolioTeacherApi = {
  page: (data: PortfolioTeacherPageRequest) =>
    http.post<PageResult<PortfolioTeacherSummaryVO>>(`${BASE}/page`, data),
  get: (id: string) => http.post<PortfolioTeacherDetailVO>(`${BASE}/get`, { id }),
  saveIdentity: (data: PortfolioTeacherIdentitySaveRequest) =>
    http.post<string>(`${BASE}/identity/save`, data),
  listAffiliationHistory: (data: { teacherUserId: string }) =>
    http.post<import('@/apis/portfolio/types').PortfolioTeacherAffiliationHistoryVO[]>(
      `${BASE}/identity/affiliation-history/list`,
      data,
    ),
  getOneTableSummary: (data: PortfolioTeacherOneTableGetRequest = {}) =>
    http.post<PortfolioTeacherOneTableSummaryVO>(`${BASE}/one-table/summary/get`, data),
  deptStructureStats: () =>
    http.post<PortfolioDeptStructureStatVO>(`${BASE}/dept-structure/stats`, {}),
  getDeptOneTableSummary: (data: PortfolioDeptOneTableGetRequest) =>
    http.post<PortfolioDeptOneTableSummaryVO>(`${BASE}/dept-one-table/summary/get`, data),
  applyDeptReportExport: (data: PortfolioDepartmentReportExportApplyRequest) =>
    http.post<PortfolioExportApprovalVO>(`${BASE}/dept-report/export/apply`, data),
  pageDeptOneTableTeachers: (data: PortfolioDeptOneTableTeacherPageRequest) =>
    http.post<PageResult<PortfolioDeptOneTableTeacherRowVO>>(
      `${BASE}/dept-one-table/teacher/page`,
      data,
    ),
  getDeptTeacherSegments: (data: {
    departmentId: string
    portfolioOrgId?: string
    teachingGroupId?: string
  }) =>
    http.post<PortfolioDeptTeacherSegmentSummaryVO>(
      `${BASE}/dept-one-table/teacher-segments/get`,
      data,
    ),
}

export type {
  PortfolioTeacherDetailVO,
  PortfolioTeacherIdentitySaveRequest,
  PortfolioTeacherOneTableCategoryVO,
  PortfolioTeacherOneTableGetRequest,
  PortfolioTeacherPageRequest,
  PortfolioTeacherSummaryVO,
}
