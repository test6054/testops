/**
 * 指标域 HTTP 客户端（非文件上传）。
 * Excel 批量导入见 @/apis/platform/excel-import + UiPlatformExcelImportModal。
 */
import type {
  PortfolioEligibilityEvalLogVO,
  PortfolioEligibilityEvalResultDto,
  PortfolioEligibilityEvaluateRequest,
  PortfolioEligibilityRuleGetRequest,
  PortfolioEligibilityRuleSaveRequest,
  PortfolioEligibilityRuleVO,
  PortfolioExplainGetRequest,
  PortfolioExplainVO,
  PortfolioExportSnapshotDiffRequest,
  PortfolioIndicatorAutoCollectPageRequest,
  PortfolioIndicatorAutoCollectRequest,
  PortfolioIndicatorAutoCollectSummaryResponse,
  PortfolioIndicatorCollectedValueVO,
  PortfolioIndicatorCollegeCompareVO,
  PortfolioIndicatorComputeLogVO,
  PortfolioIndicatorComputeTrialRequest,
  PortfolioIndicatorDashboardQueryRequest,
  PortfolioIndicatorDashboardSummaryVO,
  PortfolioIndicatorDefinitionGetRequest,
  PortfolioIndicatorDefinitionPageRequest,
  PortfolioIndicatorDefinitionSaveRequest,
  PortfolioIndicatorDefinitionTreeNodeVO,
  PortfolioIndicatorDefinitionVO,
  PortfolioIndicatorEngineReadinessVO,
  PortfolioIndicatorExportResultVO,
  PortfolioIndicatorPlatformApi,
  PortfolioIndicatorPlatformSeedResultVO,
  PortfolioIndicatorPlatformSummaryVO,
  PortfolioIndicatorReferenceStatusVO,
  PortfolioIndicatorRuleTemplatePageRequest,
  PortfolioIndicatorRuleTemplateSaveRequest,
  PortfolioIndicatorRuleTemplateVO,
  PortfolioIndicatorScoreComputeResult,
  PortfolioIndicatorSnapshotComputeRequest,
  PortfolioIndicatorSourceMappingVO,
  PortfolioIndicatorTeacherTypeCompareVO,
  PortfolioIndicatorTenantApi,
  PortfolioIndicatorTenantEnableAllResultVO,
  PortfolioIndicatorTrendVO,
  PortfolioIndicatorUsageFrequencyVO,
  PortfolioIndustryPackBindRequest,
  PortfolioIndustryPackSaveRequest,
  PortfolioIndustryPackVO,
  PortfolioPublishImpactApproveRequest,
  PortfolioPublishImpactReportGetRequest,
  PortfolioPublishImpactReportVO,
  PortfolioRuleHistoryPageRequest,
  PortfolioRulePublishSnapshotVO,
  PortfolioRuleRetroactiveGetRequest,
  PortfolioSceneCodeRequest,
  PortfolioTenantConfigAuditLogVO,
  PortfolioTenantIndicatorConfigSaveRequest,
  PortfolioTenantIndicatorConfigVO,
  PortfolioTenantSceneModelPublishRequest,
  PortfolioTenantSceneModelSaveRequest,
  PortfolioTenantSceneModelVO,
} from '@/apis/portfolio/indicator-types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

export type {
  PortfolioIndicatorPlatformApi,
  PortfolioIndicatorTenantApi,
} from '@/apis/portfolio/indicator-types'

const PLATFORM = '/api/portfolio/indicator/platform'
const TENANT = '/api/portfolio/indicator'
const DASHBOARD = '/api/portfolio/indicator/dashboard'

export const portfolioIndicatorPlatformApi: PortfolioIndicatorPlatformApi = {
  pageDefinition: (data: PortfolioIndicatorDefinitionPageRequest) =>
    http.post<PageResult<PortfolioIndicatorDefinitionVO>>(`${PLATFORM}/definition/page`, data),
  getDefinition: (data: PortfolioIndicatorDefinitionGetRequest) =>
    http.post<PortfolioIndicatorDefinitionVO>(`${PLATFORM}/definition/get`, data),
  saveDefinition: (data: PortfolioIndicatorDefinitionSaveRequest) =>
    http.post<string>(`${PLATFORM}/definition/save`, data),
  pageTemplate: (data: PortfolioIndicatorRuleTemplatePageRequest) =>
    http.post<PageResult<PortfolioIndicatorRuleTemplateVO>>(`${PLATFORM}/template/page`, data),
  saveTemplate: (data: PortfolioIndicatorRuleTemplateSaveRequest) =>
    http.post<string>(`${PLATFORM}/template/save`, data),
  listIndustryPack: () =>
    http.post<PortfolioIndustryPackVO[]>(`${PLATFORM}/industry-pack/list`, {}),
  saveIndustryPack: (data: PortfolioIndustryPackSaveRequest) =>
    http.post<string>(`${PLATFORM}/industry-pack/save`, data),
  importSeed: () =>
    http.post<PortfolioIndicatorPlatformSeedResultVO>(`${PLATFORM}/seed/import`, {}),
  definitionSummary: () =>
    http.post<PortfolioIndicatorPlatformSummaryVO>(`${PLATFORM}/definition/summary`, {}),
  definitionTree: () =>
    http.post<PortfolioIndicatorDefinitionTreeNodeVO[]>(`${PLATFORM}/definition/tree`, {}),
  listSourceMapping: () =>
    http.post<PortfolioIndicatorSourceMappingVO[]>(`${PLATFORM}/definition/source-mapping/list`, {}),
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

export const portfolioIndicatorTenantApi: PortfolioIndicatorTenantApi = {
  listConfig: () =>
    http.post<PortfolioTenantIndicatorConfigVO[]>(`${TENANT}/tenant/config/list`, {}),
  saveConfig: (data: PortfolioTenantIndicatorConfigSaveRequest) =>
    http.post<string>(`${TENANT}/tenant/config/save`, data),
  enableAllConfig: () =>
    http.post<PortfolioIndicatorTenantEnableAllResultVO>(`${TENANT}/tenant/config/enable-all`, {}),
  pageAuditLog: (data: QueryDto) =>
    http.post<PageResult<PortfolioTenantConfigAuditLogVO>>(`${TENANT}/tenant/config/audit-log/page`, data),
  referenceStatus: () =>
    http.post<PortfolioIndicatorEngineReadinessVO>(`${TENANT}/tenant/reference-status`, {}),
  listReferenceStatus: () =>
    http.post<PortfolioIndicatorReferenceStatusVO[]>(`${TENANT}/tenant/reference-status/list`, {}),
  bindIndustryPack: (data: PortfolioIndustryPackBindRequest) =>
    http.post<void>(`${TENANT}/industry-pack/bind`, data),
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
  pageRuleHistory: (data: PortfolioRuleHistoryPageRequest) =>
    http.post<PageResult<PortfolioRulePublishSnapshotVO>>(`${TENANT}/rule/history/page`, data),
  retroactiveGet: (data: PortfolioRuleRetroactiveGetRequest) =>
    http.post<PortfolioRulePublishSnapshotVO>(`${TENANT}/rule/retroactive/get`, data),
  saveEligibilityRule: (data: PortfolioEligibilityRuleSaveRequest) =>
    http.post<string>(`${TENANT}/eligibility/rule/save`, data),
  getEligibilityRule: (data: PortfolioEligibilityRuleGetRequest) =>
    http.post<PortfolioEligibilityRuleVO>(`${TENANT}/eligibility/rule/get`, data),
  impactPreview: (data: PortfolioSceneCodeRequest) =>
    http.post<string>(`${TENANT}/publish/impact-preview`, data),
  getImpactReport: (data: PortfolioPublishImpactReportGetRequest) =>
    http.post<PortfolioPublishImpactReportVO>(`${TENANT}/publish/impact-report/get`, data),
  approveImpactReport: (data: PortfolioPublishImpactApproveRequest) =>
    http.post<PortfolioPublishImpactReportVO>(`${TENANT}/publish/impact-report/approve`, data),
  pageImpactReport: (data: QueryDto) =>
    http.post<PageResult<PortfolioPublishImpactReportVO>>(`${TENANT}/publish/impact-report/page`, data),
  evaluateEligibility: (data: PortfolioEligibilityEvaluateRequest) =>
    http.post<PortfolioEligibilityEvalResultDto>(`${TENANT}/eligibility/evaluate`, data),
  pageEvalLog: (data: QueryDto) =>
    http.post<PageResult<PortfolioEligibilityEvalLogVO>>(`${TENANT}/eligibility/eval-log/page`, data),
  getExplain: (data: PortfolioExplainGetRequest) =>
    http.post<PortfolioExplainVO>(`${TENANT}/explain/get`, data),
  exportIndicatorCatalog: () =>
    http.post<PortfolioIndicatorExportResultVO>(`${TENANT}/export/indicator-catalog`, {}),
  exportSnapshotDiff: (data: PortfolioExportSnapshotDiffRequest) =>
    http.post<PortfolioIndicatorExportResultVO>(`${TENANT}/export/snapshot-diff`, data),
  exportImpactReport: (data: PortfolioPublishImpactReportGetRequest) =>
    http.post<PortfolioIndicatorExportResultVO>(`${TENANT}/export/impact-report`, data),
  computeTrial: (data: PortfolioIndicatorComputeTrialRequest) =>
    http.post<PortfolioIndicatorScoreComputeResult>(`${TENANT}/compute/trial`, data),
  computeSnapshot: (data: PortfolioIndicatorSnapshotComputeRequest) =>
    http.post<PortfolioIndicatorScoreComputeResult>(`${TENANT}/compute/snapshot`, data),
  pageComputeLog: (data: QueryDto) =>
    http.post<PageResult<PortfolioIndicatorComputeLogVO>>(`${TENANT}/compute/log/page`, data),
  getAutoCollectSummary: (data: PortfolioIndicatorAutoCollectRequest) =>
    http.post<PortfolioIndicatorAutoCollectSummaryResponse>(`${TENANT}/tenant/auto-collect/summary`, data),
  pageAutoCollectItems: (data: PortfolioIndicatorAutoCollectPageRequest) =>
    http.post<PageResult<PortfolioIndicatorCollectedValueVO>>(`${TENANT}/tenant/auto-collect/page`, data),
}
