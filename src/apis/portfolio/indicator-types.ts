import type { PageResult, QueryDto } from '@/types'

/** 场景编码 - PfSceneCodeEnum */
export type PfSceneCode
  = | 'DEFAULT'
    | 'PERFORMANCE'
    | 'TITLE'
    | 'DUAL_TEACHER'
    | 'DOUBLE_HIGH'

export const PF_SCENE_CODE_LABEL: Record<PfSceneCode, string> = {
  DEFAULT: '默认',
  PERFORMANCE: '绩效',
  TITLE: '职称',
  DUAL_TEACHER: '双师',
  DOUBLE_HIGH: '双高',
}

export const PF_SCENE_CODE_OPTIONS = (Object.keys(PF_SCENE_CODE_LABEL) as PfSceneCode[])
  .map(value => ({ value, label: PF_SCENE_CODE_LABEL[value] }))

/** 指标与模板状态 - PfIndicatorStatusEnum */
export type PfIndicatorStatus = 'ACTIVE' | 'INACTIVE'

export const PF_INDICATOR_STATUS_LABEL: Record<PfIndicatorStatus, string> = {
  ACTIVE: '启用',
  INACTIVE: '停用',
}

export const PF_INDICATOR_STATUS_OPTIONS = (Object.keys(PF_INDICATOR_STATUS_LABEL) as PfIndicatorStatus[])
  .map(value => ({ value, label: PF_INDICATOR_STATUS_LABEL[value] }))

/** 指标数据来源采集通道 - PfIndicatorDataSourceChannelEnum */
export type PfIndicatorDataSourceChannel
  = | 'ARCHIVE_BAG'
    | 'EVALUATION_FORM'
    | 'DEVELOPMENT_RECORD'
    | 'IMPORT_BATCH'
    | 'MANUAL_ENTRY'
    | 'INTERNAL_LEDGER'
    | 'HR_SYSTEM'
    | 'EDU_AFFAIRS'
    | 'RESEARCH_SYSTEM'
    | 'MOBILE_APP'

export const PF_INDICATOR_DATA_SOURCE_CHANNEL_LABEL: Record<PfIndicatorDataSourceChannel, string> = {
  ARCHIVE_BAG: '教学档案袋',
  EVALUATION_FORM: '多元评价表',
  DEVELOPMENT_RECORD: '发展档案/成果库',
  IMPORT_BATCH: '批量导入',
  MANUAL_ENTRY: '手工录入',
  INTERNAL_LEDGER: '本域台账',
  HR_SYSTEM: '人事系统',
  EDU_AFFAIRS: '教务系统',
  RESEARCH_SYSTEM: '科研系统',
  MOBILE_APP: '移动 APP',
}

export const PF_INDICATOR_DATA_SOURCE_CHANNEL_OPTIONS = (
  Object.keys(PF_INDICATOR_DATA_SOURCE_CHANNEL_LABEL) as PfIndicatorDataSourceChannel[]
).map(value => ({ value, label: PF_INDICATOR_DATA_SOURCE_CHANNEL_LABEL[value] }))

/** Score 规则模板类型 - PfScoreRuleTypeEnum */
export type PfScoreRuleType
  = | 'THRESHOLD'
    | 'SEGMENT'
    | 'RATIO'
    | 'CUMULATIVE'
    | 'CAP'
    | 'ADD_SUB'
    | 'WEIGHT'

export const PF_SCORE_RULE_TYPE_LABEL: Record<PfScoreRuleType, string> = {
  THRESHOLD: '阈值型',
  SEGMENT: '分段型',
  RATIO: '比例型',
  CUMULATIVE: '累计型',
  CAP: '封顶型',
  ADD_SUB: '加减分型',
  WEIGHT: '权重型',
}

export const PF_SCORE_RULE_TYPE_OPTIONS = (Object.keys(PF_SCORE_RULE_TYPE_LABEL) as PfScoreRuleType[])
  .map(value => ({ value, label: PF_SCORE_RULE_TYPE_LABEL[value] }))

/** 场景模型状态 - PfModelStatusEnum */
export type PfModelStatus = 'DRAFT' | 'PUBLISHED' | 'FROZEN'

export const PF_MODEL_STATUS_LABEL: Record<PfModelStatus, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  FROZEN: '已冻结',
}

export const PF_MODEL_STATUS_OPTIONS = (Object.keys(PF_MODEL_STATUS_LABEL) as PfModelStatus[])
  .map(value => ({ value, label: PF_MODEL_STATUS_LABEL[value] }))

/** 发布影响分析报告状态 - PfImpactReportStatusEnum */
export type PfImpactReportStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export const PF_IMPACT_REPORT_STATUS_LABEL: Record<PfImpactReportStatus, string> = {
  PENDING: '待执行',
  RUNNING: '执行中',
  COMPLETED: '已完成',
  FAILED: '失败',
}

export const PF_IMPACT_REPORT_STATUS_TONE: Record<PfImpactReportStatus, 'gray' | 'blue' | 'green' | 'red'> = {
  PENDING: 'gray',
  RUNNING: 'blue',
  COMPLETED: 'green',
  FAILED: 'red',
}

export interface PortfolioIndicatorDefinitionTreeNodeVO {
  nodeKey: string
  nodeTitle: string
  nodeType: 'DIMENSION_L1' | 'DIMENSION_L2' | 'OBSERVATION'
  indicatorCode?: string
  defaultDataSource?: PfIndicatorDataSourceChannel
  status?: PfIndicatorStatus
  children?: PortfolioIndicatorDefinitionTreeNodeVO[]
}

export interface PortfolioIndicatorReferenceSceneVO {
  sceneCode: string
  sceneName: string
  enabled?: boolean
  weightPct?: string
}

export interface PortfolioIndicatorReferenceStatusVO {
  indicatorCode: string
  indicatorName: string
  tenantEnabled?: boolean
  defaultDataSource?: PfIndicatorDataSourceChannel
  sceneReferences: PortfolioIndicatorReferenceSceneVO[]
}

export interface PortfolioIndicatorDefinitionVO {
  id: string
  indicatorCode: string
  indicatorName: string
  levelNo?: number
  dimensionL1Name: string
  dimensionL2Name: string
  definitionText: string
  defaultDataSource: PfIndicatorDataSourceChannel
  defaultRuleTemplateId?: string
  policyAlign?: string
  applicableTeachers: string
  seedVersion?: string
  auditRequired: boolean
  redLineFlag: boolean
  sortOrder: number
  status: PfIndicatorStatus
}

export interface PortfolioIndicatorRuleTemplateVO {
  id: string
  templateCode: string
  templateName: string
  ruleType: PfScoreRuleType
  paramsJson: string
  status: PfIndicatorStatus
}

export interface PortfolioIndicatorRuleTemplateSaveRequest {
  id?: string
  templateCode: string
  templateName: string
  ruleType: PfScoreRuleType
  paramsJson: string
  description?: string
  status?: PfIndicatorStatus
}

export interface PortfolioIndicatorRuleBindingSaveRequest {
  id?: string
  indicatorCode: string
  templateId: string
  bindingPriority?: number
}

export interface PortfolioIndustryPackVO {
  id: string
  packCode: string
  packName: string
  packVersion?: string
  packDefJson?: string
  seedVersion?: string
  status: PfIndicatorStatus
}

export interface PortfolioIndustryPackSaveRequest {
  id?: string
  packCode: string
  packName: string
  packVersion?: string
  packDefJson: string
  status?: PfIndicatorStatus
}

/** 资格规则预置编码 */
export const PF_ELIGIBILITY_PRESET_OPTIONS = [
  { value: 'DUAL_TEACHER_APPLY', label: '双师认定申请', scene: 'DUAL_TEACHER' as PfSceneCode },
  { value: 'ETHICS_VETO', label: '师德一票否决', scene: 'DEFAULT' as PfSceneCode },
  { value: 'TITLE_APPLY', label: '职称申报资格', scene: 'TITLE' as PfSceneCode },
]

export interface PortfolioIndicatorPlatformSeedResultVO {
  createdIndicatorCount: number
  skippedIndicatorCount: number
  createdTemplateCount: number
  skippedTemplateCount: number
  createdBindingCount: number
  skippedBindingCount: number
  createdPackCount: number
  skippedPackCount: number
  updatedIndicatorCount: number
  updatedTemplateCount: number
  updatedPackCount: number
  updatedBindingCount: number
  totalIndicatorCount: number
  totalIndustryPackCount: number
  createdIndicatorCodes: string[]
  skippedIndicatorCodes: string[]
}

export interface PortfolioIndicatorPlatformSummaryVO {
  platformIndicatorCount: number
  industryPackCount: number
  t001T100Ready: boolean
}

/** 指标业务引用场景 - PfIndicatorBusinessReferenceSceneEnum */
export type PfIndicatorBusinessReferenceScene = 'PORTRAIT' | 'DEVELOPMENT_PLAN' | 'EVALUATION'

export const PF_INDICATOR_BUSINESS_REFERENCE_SCENE_LABEL: Record<PfIndicatorBusinessReferenceScene, string> = {
  PORTRAIT: '教师画像',
  DEVELOPMENT_PLAN: '年度规划',
  EVALUATION: '多元评价',
}

export interface PortfolioIndicatorBusinessReferenceStatusVO {
  referenceScene: PfIndicatorBusinessReferenceScene
  referencedIndicatorCount: number
  enabledIndicatorCount: number
  referenceReady: boolean
}

export interface PortfolioIndicatorEngineReadinessVO {
  platformIndicatorCount: number
  enabledIndicatorCount: number
  t001T100Enabled: boolean
  allScenesReady: boolean
  sceneStatuses: PortfolioIndicatorBusinessReferenceStatusVO[]
}

export interface PortfolioIndicatorTenantEnableAllResultVO {
  enabledCount: number
  createdCount: number
  updatedCount: number
}

export interface PortfolioImpactIndicatorSummaryDto {
  draftIndicatorCount?: number
  publishedIndicatorCount?: number
  addedCount?: number
  removedCount?: number
  changedCount?: number
}

export interface PortfolioTenantIndicatorConfigVO {
  id: string
  indicatorCode: string
  indicatorName: string
  enabled: boolean
  standardScore?: string
  capScore?: string
  paramsOverrideJson?: string
  applicableTeacherTypes?: string
  applicableScenes?: string
  auditChainJson?: string
}

export interface PortfolioTenantIndicatorConfigSaveRequest {
  indicatorCode: string
  enabled?: boolean
  standardScore?: string
  capScore?: string
  paramsOverrideJson?: string
  applicableTeacherTypes?: string
  applicableScenes?: string
  auditChainJson?: string
}

export interface PortfolioIndustryPackBindItem {
  packCode: string
  majorGroupCode?: string
  majorGroupName?: string
  enabled?: boolean
  bindConfigJson?: string
}

export interface PortfolioIndustryPackBindRequest {
  bindings: PortfolioIndustryPackBindItem[]
}

export interface PortfolioIndicatorDefinitionGetRequest {
  indicatorCode: string
}

export interface PortfolioIndicatorDefinitionSaveRequest {
  id?: string
  indicatorCode: string
  indicatorName: string
  levelNo?: number
  dimensionL1Name?: string
  dimensionL2Name?: string
  definitionText?: string
  defaultDataSource?: string
  defaultRuleTemplateId?: string
  policyAlign?: string
  applicableTeachers?: string
  seedVersion?: string
  auditRequired?: boolean
  redLineFlag?: boolean
  sortOrder?: number
  status?: string
}

export interface PortfolioIndicatorRuleTemplatePageRequest extends QueryDto {
  templateCode?: string
  ruleType?: string
  status?: string
}

export interface PortfolioIndicatorComputeTrialRequest {
  ruleType: string
  indicatorCode?: string
  paramsJson: string
  rawValue: number
  auditRequired?: boolean
  auditApproved?: boolean
}

export interface PortfolioIndicatorSnapshotComputeRequest {
  teacherId: string
  snapshotId: string
  indicatorCode: string
  rawValue: number
  auditRequired?: boolean
  auditApproved?: boolean
}

export interface PortfolioExplainGetRequest {
  logId: string
  logType: 'SCORE' | 'ELIGIBILITY'
  teacherId: string
}

export interface PortfolioIndicatorComputeLogVO {
  id: string
  teacherId: string
  indicatorCode: string
  snapshotId: string
  rawValue: string
  finalScore: string
  auditRequired?: boolean
  explainText?: string
  computedTime?: string
}

export interface PortfolioTenantConfigAuditLogVO {
  id: string
  bizType: string
  bizKey: string
  operation: string
  beforeJson?: string
  afterJson?: string
  createTime?: string
}

export interface PortfolioEligibilityEvalLogVO {
  id: string
  teacherId: string
  eligibilityCode: string
  snapshotId?: string
  eligible?: boolean
  explainText?: string
  evaluatedTime?: string
}

export interface PortfolioTenantSceneIndicatorItem {
  indicatorCode: string
  weight: number
  enabled: boolean
}

export interface PortfolioTenantSceneModelVO {
  id?: string
  sceneCode: PfSceneCode
  sceneName: string
  modelStatus: PfModelStatus
  draftSnapshotHash?: string
  currentSnapshotId?: string
  trialPassed?: boolean
  weightSum?: number
  indicators: PortfolioTenantSceneIndicatorItem[]
}

export interface PortfolioEligibilityRuleVO {
  id: string
  eligibilityCode: string
  eligibilityName: string
  sceneCode: PfSceneCode
  presetFlag: boolean
  ruleTreeJson: string
  status: string
}

export interface PfEligibilityRuleTreeNodeDto {
  nodeType: string
  fieldKey?: string
  expectedValue?: string
  auditStatus?: string
  children?: PfEligibilityRuleTreeNodeDto[]
}

export interface PortfolioPublishImpactReportVO {
  id: string
  sceneCode: PfSceneCode
  draftSnapshotHash: string
  reportStatus: PfImpactReportStatus
  indicatorSummaryJson: string
  teacherSummaryJson: string
  orgSummaryJson: string
  eligibilitySummaryJson: string
  sampleCasesJson: string
  expiredTime: string
}

export interface PortfolioRulePublishSnapshotVO {
  id: string
  sceneCode: PfSceneCode
  versionNo: number
  snapshotVersion: string
  modelStatus: PfModelStatus
  academicYear: string
  effectiveFrom: string
  effectiveTo: string
  publishedTime: string
  snapshotSummaryJson: string
}

export interface PortfolioIndicatorDefinitionImportResultVO {
  totalRows: number
  successRows: number
  failedRows: number
  createdCount: number
  updatedCount: number
  errorReportJson?: string
}

export interface PortfolioIndicatorSourceMappingVO {
  indicatorCode: string
  indicatorName: string
  defaultDataSource?: string
  channelCode: string
  channelLabel: string
  outOfScope: boolean
  autoCollectSupported: boolean
}

export interface PortfolioIndicatorCollectedValueVO {
  indicatorCode: string
  channelCode: string
  collected: boolean
  rawValue?: string
  skipReason?: string
}

export interface PortfolioIndicatorAutoCollectResultVO {
  teacherId: string
  items: PortfolioIndicatorCollectedValueVO[]
  collectedCount: number
  skippedCount: number
}

export type PfEligibilityNodeType = 'LEAF' | 'AND' | 'OR' | 'NOT' | 'AUDIT_GATE'

export const PF_ELIGIBILITY_NODE_TYPE_LABEL: Record<PfEligibilityNodeType, string> = {
  LEAF: '叶子条件',
  AND: '与',
  OR: '或',
  NOT: '非',
  AUDIT_GATE: '审核门禁',
}

export const PF_ELIGIBILITY_NODE_TYPE_OPTIONS = (Object.keys(PF_ELIGIBILITY_NODE_TYPE_LABEL) as PfEligibilityNodeType[])
  .map(value => ({ value, label: PF_ELIGIBILITY_NODE_TYPE_LABEL[value] }))

export type PfEligibilityAuditStatus = 'APPROVED' | 'PENDING' | 'REJECTED'

export const PF_ELIGIBILITY_AUDIT_STATUS_LABEL: Record<PfEligibilityAuditStatus, string> = {
  APPROVED: '审核通过',
  PENDING: '待审',
  REJECTED: '驳回',
}

export const PF_ELIGIBILITY_AUDIT_STATUS_OPTIONS = (Object.keys(PF_ELIGIBILITY_AUDIT_STATUS_LABEL) as PfEligibilityAuditStatus[])
  .map(value => ({ value, label: PF_ELIGIBILITY_AUDIT_STATUS_LABEL[value] }))

export interface PortfolioIndicatorExportResultVO {
  fileName: string
  rowCount: number
  fileNodeId: string
}

export interface PortfolioEligibilityEvalResultDto {
  eligible: boolean
  gapItems: string[]
  explainText: string
  explainStructJson: string
  auditStatusJson: string
}

export interface PortfolioIndicatorScoreComputeResult {
  rawScore: number
  finalScore: number
  explainText: string
  explainStructJson: string
  auditPending: boolean
}

export interface PortfolioIndicatorDefinitionPageRequest extends QueryDto {
  indicatorCode?: string
  indicatorName?: string
  dimensionL1Name?: string
  status?: string
}

export interface PortfolioSceneCodeRequest {
  sceneCode: PfSceneCode
}

export interface PortfolioTenantSceneModelSaveRequest {
  sceneCode: PfSceneCode
  indicators: PortfolioTenantSceneIndicatorItem[]
}

export interface PortfolioTenantSceneModelPublishRequest extends PortfolioSceneCodeRequest {
  impactReportId: string
  academicYear: string
}

export interface PortfolioEligibilityRuleSaveRequest {
  eligibilityCode: string
  eligibilityName: string
  sceneCode: PfSceneCode
  ruleTreeJson: string
}

export interface PortfolioEligibilityEvaluateRequest {
  eligibilityCode: string
  teacherUserId: string
  factJson: string
}

export interface PortfolioExportSnapshotDiffRequest {
  snapshotIdA: string
  snapshotIdB: string
}

export interface PortfolioRuleRetroactiveGetRequest {
  sceneCode: PfSceneCode
  snapshotId?: string
  academicYear?: string
}

export interface PortfolioIndicatorDashboardQueryRequest {
  sceneCode?: PfSceneCode
  topLimit?: number
}

export interface PortfolioIndicatorDimensionStatVO {
  dimensionL1Code: string
  dimensionL1Name: string
  totalCount: number
  enabledCount: number
}

export interface PortfolioIndicatorDashboardSummaryVO {
  platformIndicatorCount: number
  tenantEnabledCount: number
  tenantDisabledCount: number
  publishedSnapshotCount: number
  computeLogCount: number
  dimensionStats: PortfolioIndicatorDimensionStatVO[]
}

export interface PortfolioIndicatorUsageFrequencyItemVO {
  indicatorCode: string
  indicatorName: string
  statYear: number
  usageCount: number
}

export interface PortfolioIndicatorUsageFrequencyVO {
  windowYears: number
  items: PortfolioIndicatorUsageFrequencyItemVO[]
}

export interface PortfolioIndicatorTrendItemVO {
  statYear: number
  computeLogCount: number
  snapshotPublishCount: number
  snapshotEnabledIndicatorCount: number
}

export interface PortfolioIndicatorTrendVO {
  windowYears: number
  items: PortfolioIndicatorTrendItemVO[]
}

export interface PortfolioIndicatorCollegeCompareItemVO {
  collegeId: string
  collegeName: string
  usageCount: number
  distinctIndicatorCount: number
  distinctTeacherCount: number
}

export interface PortfolioIndicatorCollegeCompareVO {
  items: PortfolioIndicatorCollegeCompareItemVO[]
}

export interface PortfolioIndicatorTeacherTypeCompareItemVO {
  teacherTypeCode: string
  teacherTypeLabel: string
  usageCount: number
  distinctIndicatorCount: number
  distinctTeacherCount: number
}

export interface PortfolioIndicatorTeacherTypeCompareVO {
  items: PortfolioIndicatorTeacherTypeCompareItemVO[]
}

/** Excel 批量导入请求 */
export interface PortfolioIndicatorExcelImportRequest {
  fileName?: string
  sourceFileId: string
}

/** 平台指标 API 契约 */
export interface PortfolioIndicatorPlatformApi {
  pageDefinition: (data: PortfolioIndicatorDefinitionPageRequest) => Promise<PageResult<PortfolioIndicatorDefinitionVO>>
  getDefinition: (data: PortfolioIndicatorDefinitionGetRequest) => Promise<PortfolioIndicatorDefinitionVO>
  saveDefinition: (data: PortfolioIndicatorDefinitionSaveRequest) => Promise<string>
  pageTemplate: (data: PortfolioIndicatorRuleTemplatePageRequest) => Promise<PageResult<PortfolioIndicatorRuleTemplateVO>>
  saveTemplate: (data: PortfolioIndicatorRuleTemplateSaveRequest) => Promise<string>
  saveBinding: (data: PortfolioIndicatorRuleBindingSaveRequest) => Promise<string>
  listIndustryPack: () => Promise<PortfolioIndustryPackVO[]>
  saveIndustryPack: (data: PortfolioIndustryPackSaveRequest) => Promise<string>
  importSeed: () => Promise<PortfolioIndicatorPlatformSeedResultVO>
  definitionSummary: () => Promise<PortfolioIndicatorPlatformSummaryVO>
  definitionTree: () => Promise<PortfolioIndicatorDefinitionTreeNodeVO[]>
  exportDefinitionTemplate: () => Promise<PortfolioIndicatorExportResultVO>
  importDefinitionExcel: (data: PortfolioIndicatorExcelImportRequest) => Promise<PortfolioIndicatorDefinitionImportResultVO>
  listSourceMapping: () => Promise<PortfolioIndicatorSourceMappingVO[]>
}

/** 租户指标 API 契约 */
export interface PortfolioIndicatorTenantApi {
  listConfig: () => Promise<PortfolioTenantIndicatorConfigVO[]>
  saveConfig: (data: PortfolioTenantIndicatorConfigSaveRequest) => Promise<string>
  enableAllConfig: () => Promise<PortfolioIndicatorTenantEnableAllResultVO>
  pageAuditLog: (data: QueryDto) => Promise<PageResult<PortfolioTenantConfigAuditLogVO>>
  referenceStatus: () => Promise<PortfolioIndicatorEngineReadinessVO>
  listReferenceStatus: () => Promise<PortfolioIndicatorReferenceStatusVO[]>
  bindIndustryPack: (data: PortfolioIndustryPackBindRequest) => Promise<void>
  getModel: (data: PortfolioSceneCodeRequest) => Promise<PortfolioTenantSceneModelVO>
  saveModel: (data: PortfolioTenantSceneModelSaveRequest) => Promise<string>
  trialModel: (data: PortfolioSceneCodeRequest) => Promise<PortfolioTenantSceneModelVO>
  publishModel: (data: PortfolioTenantSceneModelPublishRequest) => Promise<string>
  freezeModel: (data: PortfolioSceneCodeRequest) => Promise<void>
  ruleHistory: (data: PortfolioSceneCodeRequest) => Promise<PortfolioRulePublishSnapshotVO[]>
  retroactiveGet: (data: PortfolioRuleRetroactiveGetRequest) => Promise<PortfolioRulePublishSnapshotVO>
  saveEligibilityRule: (data: PortfolioEligibilityRuleSaveRequest) => Promise<string>
  getEligibilityRule: (data: { eligibilityCode: string }) => Promise<PortfolioEligibilityRuleVO>
  impactPreview: (data: PortfolioSceneCodeRequest) => Promise<string>
  getImpactReport: (data: { id: string }) => Promise<PortfolioPublishImpactReportVO>
  pageImpactReport: (data: QueryDto) => Promise<PageResult<PortfolioPublishImpactReportVO>>
  evaluateEligibility: (data: PortfolioEligibilityEvaluateRequest) => Promise<PortfolioEligibilityEvalResultDto>
  pageEvalLog: (data: QueryDto) => Promise<PageResult<PortfolioEligibilityEvalLogVO>>
  getExplain: (data: PortfolioExplainGetRequest) => Promise<string>
  exportIndicatorCatalog: () => Promise<PortfolioIndicatorExportResultVO>
  exportSnapshotDiff: (data: PortfolioExportSnapshotDiffRequest) => Promise<PortfolioIndicatorExportResultVO>
  exportImpactReport: (data: { id: string }) => Promise<PortfolioIndicatorExportResultVO>
  computeTrial: (data: PortfolioIndicatorComputeTrialRequest) => Promise<PortfolioIndicatorScoreComputeResult>
  computeSnapshot: (data: PortfolioIndicatorSnapshotComputeRequest) => Promise<PortfolioIndicatorScoreComputeResult>
  pageComputeLog: (data: QueryDto) => Promise<PageResult<PortfolioIndicatorComputeLogVO>>
  autoCollect: (data: { teacherId: string }) => Promise<PortfolioIndicatorAutoCollectResultVO>
}
