import type { PageResult } from '@/types'
import type {
  PortfolioEligibilityEvalResultDto,
  PortfolioEligibilityRuleSaveRequest,
  PortfolioEligibilityRuleVO,
  PortfolioEligibilityEvaluateRequest,
  PortfolioExportSnapshotDiffRequest,
  PortfolioIndicatorCollegeCompareVO,
  PortfolioIndicatorDashboardQueryRequest,
  PortfolioIndicatorDashboardSummaryVO,
  PortfolioIndicatorDefinitionPageRequest,
  PortfolioIndicatorDefinitionVO,
  PortfolioIndicatorDefinitionTreeNodeVO,
  PortfolioIndicatorExportResultVO,
  PortfolioIndicatorEngineReadinessVO,
  PortfolioIndicatorTenantEnableAllResultVO,
  PortfolioIndicatorTeacherTypeCompareVO,
  PortfolioIndicatorTrendVO,
  PortfolioIndicatorUsageFrequencyVO,
  PortfolioIndicatorPlatformSeedResultVO,
  PortfolioIndicatorPlatformSummaryVO,
  PortfolioIndicatorReferenceStatusVO,
  PortfolioIndicatorReferenceSceneVO,
  PortfolioIndicatorRuleTemplateVO,
  PortfolioIndicatorScoreComputeResult,
  PortfolioIndustryPackVO,
  PortfolioPublishImpactReportVO,
  PortfolioRulePublishSnapshotVO,
  PortfolioRuleRetroactiveGetRequest,
  PortfolioSceneCodeRequest,
  PortfolioTenantIndicatorConfigVO,
  PortfolioTenantSceneModelPublishRequest,
  PortfolioTenantSceneModelSaveRequest,
  PortfolioTenantSceneModelVO,
} from '@/apis/portfolio/indicator-types'
import type { QueryDto } from '@/types'
import http from '@/config/axios'

const PLATFORM = '/api/portfolio/indicator/platform'
const TENANT = '/api/portfolio/indicator'
const DASHBOARD = '/api/portfolio/indicator/dashboard'

export const portfolioIndicatorPlatformApi = {
  pageDefinition: (data: PortfolioIndicatorDefinitionPageRequest) =>
    http.post<PageResult<PortfolioIndicatorDefinitionVO>>(`${PLATFORM}/definition/page`, data),
  listTemplate: () =>
    http.post<PortfolioIndicatorRuleTemplateVO[]>(`${PLATFORM}/template/list`, {}),
  listIndustryPack: () =>
    http.post<PortfolioIndustryPackVO[]>(`${PLATFORM}/industry-pack/list`, {}),
  importSeed: () =>
    http.post<PortfolioIndicatorPlatformSeedResultVO>(`${PLATFORM}/seed/import`, {}),
  definitionSummary: () =>
    http.post<PortfolioIndicatorPlatformSummaryVO>(`${PLATFORM}/definition/summary`, {}),
  definitionTree: () =>
    http.post<PortfolioIndicatorDefinitionTreeNodeVO[]>(`${PLATFORM}/definition/tree`, {}),
  exportDefinitionTemplate: () =>
    http.post<PortfolioIndicatorExportResultVO>(`${PLATFORM}/definition/export-template`, {}),
}

export const portfolioIndicatorDashboardApi = {
  summary: (data: PortfolioIndicatorDashboardQueryRequest = {}) =>
    http.post<PortfolioIndicatorDashboardSummaryVO>(`${DASHBOARD}/summary`, data),
  usageFrequency: (data: PortfolioIndicatorDashboardQueryRequest = {}) =>
    http.post<PortfolioIndicatorUsageFrequencyVO>(`${DASHBOARD}/usage-frequency`, data),
  trend: (data: PortfolioIndicatorDashboardQueryRequest = {}) =>
    http.post<PortfolioIndicatorTrendVO>(`${DASHBOARD}/trend`, data),
  collegeCompare: (data: PortfolioIndicatorDashboardQueryRequest = {}) =>
    http.post<PortfolioIndicatorCollegeCompareVO>(`${DASHBOARD}/college-compare`, data),
  teacherTypeCompare: (data: PortfolioIndicatorDashboardQueryRequest = {}) =>
    http.post<PortfolioIndicatorTeacherTypeCompareVO>(`${DASHBOARD}/teacher-type-compare`, data),
}

export const portfolioIndicatorTenantApi = {
  listConfig: () =>
    http.post<PortfolioTenantIndicatorConfigVO[]>(`${TENANT}/tenant/config/list`, {}),
  enableAllConfig: () =>
    http.post<PortfolioIndicatorTenantEnableAllResultVO>(`${TENANT}/tenant/config/enable-all`, {}),
  referenceStatus: () =>
    http.post<PortfolioIndicatorEngineReadinessVO>(`${TENANT}/tenant/reference-status`, {}),
  listReferenceStatus: () =>
    http.post<PortfolioIndicatorReferenceStatusVO[]>(`${TENANT}/tenant/reference-status/list`, {}),
  getModel: (data: PortfolioSceneCodeRequest) =>
    http.post<PortfolioTenantSceneModelVO>(`${TENANT}/model/get`, data),
  saveModel: (data: PortfolioTenantSceneModelSaveRequest) =>
    http.post<string>(`${TENANT}/model/save`, data),
  trialModel: (data: PortfolioSceneCodeRequest) =>
    http.post<PortfolioTenantSceneModelVO>(`${TENANT}/model/trial`, data),
  publishModel: (data: PortfolioTenantSceneModelPublishRequest) =>
    http.post<string>(`${TENANT}/model/publish`, data),
  freezeModel: (data: PortfolioSceneCodeRequest) =>
    http.post<void>(`${TENANT}/model/freeze`, data),
  ruleHistory: (data: PortfolioSceneCodeRequest) =>
    http.post<PortfolioRulePublishSnapshotVO[]>(`${TENANT}/rule/history`, data),
  retroactiveGet: (data: PortfolioRuleRetroactiveGetRequest) =>
    http.post<PortfolioRulePublishSnapshotVO>(`${TENANT}/rule/retroactive/get`, data),
  saveEligibilityRule: (data: PortfolioEligibilityRuleSaveRequest) =>
    http.post<string>(`${TENANT}/eligibility/rule/save`, data),
  getEligibilityRule: (data: { eligibilityCode: string }) =>
    http.post<PortfolioEligibilityRuleVO>(`${TENANT}/eligibility/rule/get`, data),
  impactPreview: (data: PortfolioSceneCodeRequest) =>
    http.post<string>(`${TENANT}/publish/impact-preview`, data),
  getImpactReport: (data: { id: string }) =>
    http.post<PortfolioPublishImpactReportVO>(`${TENANT}/publish/impact-report/get`, data),
  pageImpactReport: (data: QueryDto) =>
    http.post<PageResult<PortfolioPublishImpactReportVO>>(`${TENANT}/publish/impact-report/page`, data),
  evaluateEligibility: (data: PortfolioEligibilityEvaluateRequest) =>
    http.post<PortfolioEligibilityEvalResultDto>(`${TENANT}/eligibility/evaluate`, data),
  getExplain: (data: { logId: string, logType: string }) =>
    http.post<string>(`${TENANT}/explain/get`, data),
  exportIndicatorCatalog: () =>
    http.post<PortfolioIndicatorExportResultVO>(`${TENANT}/export/indicator-catalog`, {}),
  exportSnapshotDiff: (data: PortfolioExportSnapshotDiffRequest) =>
    http.post<PortfolioIndicatorExportResultVO>(`${TENANT}/export/snapshot-diff`, data),
  exportImpactReport: (data: { id: string }) =>
    http.post<PortfolioIndicatorExportResultVO>(`${TENANT}/export/impact-report`, data),
  computeSnapshot: (data: {
    snapshotId: string
    teacherUserId: string
    indicatorCode: string
    rawValue: number
    auditStatus?: string
  }) =>
    http.post<PortfolioIndicatorScoreComputeResult>(`${TENANT}/compute/snapshot`, data),
}
