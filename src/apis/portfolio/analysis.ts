import type {
  PortfolioTeacherPkCompareVO,
  PortfolioTeacherRecommendPkCompareRequest,
} from '@/apis/portfolio/teacher-platform'
import type {
  PortfolioCockpitSummaryVO,
  PortfolioTeacherCompletenessGetRequest,
  PortfolioTeacherCompletenessVO,
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
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
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
  getCompleteness: (data: PortfolioTeacherCompletenessGetRequest = {}) =>
    http.post<PortfolioTeacherCompletenessVO>('/api/portfolio/analysis/completeness/get', data),
  getPortrait: (data: PortfolioTeacherPortraitGetRequest = {}) =>
    http.post<PortfolioTeacherPortraitVO>('/api/portfolio/portrait/teacher/get', data),
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
  getCreditCurve: (data: { teacherId: string }) =>
    http.post<PortfolioPortraitCreditCurveVO>('/api/portfolio/portrait/teacher/credit-curve', data),
  getDepartmentPortrait: (data: { departmentId: string }) =>
    http.post<PortfolioDepartmentPortraitVO>('/api/portfolio/portrait/department/get', data),
  getSchoolPortraitCockpit: () =>
    http.post<PortfolioSchoolPortraitCockpitVO>('/api/portfolio/portrait/school/cockpit', {}),
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
