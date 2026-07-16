import type { PageResult, QueryDto } from '@/types'
import type { PfEligibilityAuditStatusCode } from '@/types/enums/pf-eligibility-audit-status-enum'
import {
  ALL_PF_ELIGIBILITY_AUDIT_STATUS_CODES,
  PfEligibilityAuditStatusDescription,
} from '@/types/enums/pf-eligibility-audit-status-enum'
import type { PfEligibilityNodeTypeCode } from '@/types/enums/pf-eligibility-node-type-enum'
import {
  ALL_PF_ELIGIBILITY_NODE_TYPE_CODES,
  PfEligibilityNodeTypeDescription,
} from '@/types/enums/pf-eligibility-node-type-enum'
import type { PfIndicatorBusinessReferenceSceneCode } from '@/types/enums/pf-indicator-business-reference-scene-enum'
import type { PfIndicatorDataSourceChannelCode } from '@/types/enums/pf-indicator-data-source-channel-enum'
import {
  ALL_PF_INDICATOR_DATA_SOURCE_CHANNEL_CODES,
  PfIndicatorDataSourceChannelDescription,
} from '@/types/enums/pf-indicator-data-source-channel-enum'
import type { PfIndicatorStatusCode } from '@/types/enums/pf-indicator-status-enum'
import {
  ALL_PF_INDICATOR_STATUS_CODES,
  PfIndicatorStatusDescription,
} from '@/types/enums/pf-indicator-status-enum'
import type { PfModelStatusCode } from '@/types/enums/pf-model-status-enum'
import {
  ALL_PF_MODEL_STATUS_CODES,
  PfModelStatusDescription,
} from '@/types/enums/pf-model-status-enum'
import type { PfScoreRuleTypeCode } from '@/types/enums/pf-score-rule-type-enum'
import {
  ALL_PF_SCORE_RULE_TYPE_CODES,
  PfScoreRuleTypeDescription,
} from '@/types/enums/pf-score-rule-type-enum'
import type { PortfolioIndicatorDefinitionTreeNodeTypeCode } from '@/types/enums/portfolio-indicator-definition-tree-node-type-enum'
import { PfImpactReportStatusCode } from '@/types/enums/pf-impact-report-status-enum'
import {
  ALL_PF_SCENE_CODES,
  PfSceneCode,
  PfSceneCodeDescription,
} from '@/types/enums/pf-scene-code-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_PF_ELIGIBILITY_AUDIT_STATUS_CODES,
  PfEligibilityAuditStatusCode,
  PfEligibilityAuditStatusDescription,
} from '@/types/enums/pf-eligibility-audit-status-enum'

export const PF_SCENE_CODE_OPTIONS: Array<{ value: PfSceneCode; label: string }> =
  ALL_PF_SCENE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PfSceneCodeDescription, value, '指标场景编码'),
  }))

export {
  ALL_PF_ELIGIBILITY_NODE_TYPE_CODES,
  PfEligibilityNodeTypeCode,
  PfEligibilityNodeTypeDescription,
} from '@/types/enums/pf-eligibility-node-type-enum'

export const PF_INDICATOR_STATUS_OPTIONS: Array<{ value: PfIndicatorStatusCode; label: string }> =
  ALL_PF_INDICATOR_STATUS_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PfIndicatorStatusDescription, value, '指标状态'),
  }))

export {
  ALL_PF_IMPACT_REPORT_STATUS_CODES,
  PfImpactReportStatusCode,
  PfImpactReportStatusDescription,
} from '@/types/enums/pf-impact-report-status-enum'

export const PF_INDICATOR_DATA_SOURCE_CHANNEL_OPTIONS: Array<{
  value: PfIndicatorDataSourceChannelCode
  label: string
}> = ALL_PF_INDICATOR_DATA_SOURCE_CHANNEL_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PfIndicatorDataSourceChannelDescription, value, '指标数据来源渠道'),
}))

/** 指标业务引用场景 - PfIndicatorBusinessReferenceSceneEnum */
export {
  ALL_PF_INDICATOR_BUSINESS_REFERENCE_SCENE_CODES,
  PfIndicatorBusinessReferenceSceneCode,
  PfIndicatorBusinessReferenceSceneDescription,
} from '@/types/enums/pf-indicator-business-reference-scene-enum'

export const PF_SCORE_RULE_TYPE_OPTIONS: Array<{ value: PfScoreRuleTypeCode; label: string }> =
  ALL_PF_SCORE_RULE_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PfScoreRuleTypeDescription, value, '计分规则类型'),
  }))

export {
  ALL_PF_INDICATOR_DATA_SOURCE_CHANNEL_CODES,
  PfIndicatorDataSourceChannelCode,
  PfIndicatorDataSourceChannelDescription,
} from '@/types/enums/pf-indicator-data-source-channel-enum'

export const PF_MODEL_STATUS_OPTIONS: Array<{ value: PfModelStatusCode; label: string }> =
  ALL_PF_MODEL_STATUS_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PfModelStatusDescription, value, '场景模型状态'),
  }))

export {
  ALL_PF_INDICATOR_STATUS_CODES,
  PfIndicatorStatusCode,
  PfIndicatorStatusDescription,
} from '@/types/enums/pf-indicator-status-enum'

export const PF_IMPACT_REPORT_STATUS_TONE: Record<
  PfImpactReportStatusCode,
  'gray' | 'blue' | 'green' | 'red'
> = {
  [PfImpactReportStatusCode.PENDING]: 'gray',
  [PfImpactReportStatusCode.RUNNING]: 'blue',
  [PfImpactReportStatusCode.COMPLETED]: 'green',
  [PfImpactReportStatusCode.FAILED]: 'red',
}

export interface PortfolioIndicatorDefinitionTreeNodeVO {
  nodeKey: string
  nodeTitle: string
  nodeType: PortfolioIndicatorDefinitionTreeNodeTypeCode
  indicatorCode?: string
  defaultDataSource?: PfIndicatorDataSourceChannelCode
  status?: PfIndicatorStatusCode
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
  defaultDataSource?: PfIndicatorDataSourceChannelCode
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
  defaultDataSource: PfIndicatorDataSourceChannelCode
  defaultRuleTemplateId?: string
  policyAlign?: string
  applicableTeachers: string
  seedVersion?: string
  auditRequired: boolean
  redLineFlag: boolean
  sortOrder: number
  status: PfIndicatorStatusCode
}

export interface PortfolioIndicatorRuleTemplateVO {
  id: string
  templateCode: string
  templateName: string
  ruleType: PfScoreRuleTypeCode
  paramsJson: string
  status: PfIndicatorStatusCode
}

export interface PortfolioIndicatorRuleTemplateSaveRequest {
  id?: string
  templateCode: string
  templateName: string
  ruleType: PfScoreRuleTypeCode
  paramsJson: string
  description?: string
  status?: PfIndicatorStatusCode
}

export interface PortfolioIndustryPackVO {
  id: string
  packCode: string
  packName: string
  packVersion?: string
  packDefJson?: string
  seedVersion?: string
  status: PfIndicatorStatusCode
}

export interface PortfolioIndustryPackSaveRequest {
  id?: string
  packCode: string
  packName: string
  packVersion?: string
  packDefJson: string
  status?: PfIndicatorStatusCode
}

/** 资格规则预置编码 */
export const PF_ELIGIBILITY_PRESET_OPTIONS = [
  { value: 'DUAL_TEACHER_APPLY', label: '双师认定申请', scene: PfSceneCode.DUAL_TEACHER },
  { value: 'ETHICS_VETO', label: '师德一票否决', scene: PfSceneCode.DEFAULT },
  { value: 'TITLE_APPLY', label: '职称申报资格', scene: PfSceneCode.TITLE },
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

export {
  ALL_PF_MODEL_STATUS_CODES,
  PfModelStatusCode,
  PfModelStatusDescription,
} from '@/types/enums/pf-model-status-enum'

export interface PortfolioIndicatorBusinessReferenceStatusVO {
  referenceScene: PfIndicatorBusinessReferenceSceneCode
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
  changedIndicators?: PortfolioImpactChangedIndicatorItemDto[]
}

export interface PortfolioImpactChangedIndicatorItemDto {
  indicatorCode?: string
  changeType?: string
  draftWeightPct?: number
  publishedWeightPct?: number
  paramsChanged?: boolean
  ruleTypeChanged?: boolean
}

export interface PortfolioTenantIndicatorConfigVO {
  id: string
  indicatorCode: string
  indicatorName: string
  enabled: boolean
  standardScore?: number
  capScore?: number
  paramsOverrideJson?: string
  applicableTeacherTypes?: string
  applicableScenes?: string
  auditChainJson?: string
}

export interface PortfolioTenantIndicatorConfigSaveRequest {
  indicatorCode: string
  enabled?: boolean
  standardScore?: number
  capScore?: number
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
  finalScore: number
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
  weightPct?: number
  enabled: boolean
}

export interface PortfolioTenantSceneModelVO {
  id?: string
  sceneCode: PfSceneCode
  sceneName: string
  modelStatus: PfModelStatusCode
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
  reportStatus: PfImpactReportStatusCode
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
  modelStatus: PfModelStatusCode
  academicYear: string
  effectiveFrom: string
  effectiveTo: string
  publishedTime: string
  snapshotSummaryJson: string
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

export interface PortfolioIndicatorAutoCollectSummaryResponse {
  teacherId: string
  collectedCount: number
  skippedCount: number
}

export interface PortfolioIndicatorAutoCollectPageRequest extends QueryDto {
  teacherId: string
}

export {
  ALL_PF_SCENE_CODES,
  PfSceneCode,
  PfSceneCodeDescription,
} from '@/types/enums/pf-scene-code-enum'

export const PF_ELIGIBILITY_NODE_TYPE_OPTIONS: Array<{
  value: PfEligibilityNodeTypeCode
  label: string
}> = ALL_PF_ELIGIBILITY_NODE_TYPE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PfEligibilityNodeTypeDescription, value, '资格节点类型'),
}))

export {
  ALL_PF_SCORE_RULE_TYPE_CODES,
  PfScoreRuleTypeCode,
  PfScoreRuleTypeDescription,
} from '@/types/enums/pf-score-rule-type-enum'

export const PF_ELIGIBILITY_AUDIT_STATUS_OPTIONS: Array<{
  value: PfEligibilityAuditStatusCode
  label: string
}> = ALL_PF_ELIGIBILITY_AUDIT_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PfEligibilityAuditStatusDescription, value, '资格审核状态'),
}))

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
  /** 模板计算分 - 对应后端 calcScore */
  calcScore?: number
  /** 最终得分；审核未完成时为 null */
  finalScore?: number | null
  /** 命中区间或阈值标签 */
  hitSegment?: string
  /** 规则类型 */
  ruleType?: string
  explainText: string
  explainStructJson: string
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

/** 规则发布快照历史分页查询 */
export interface PortfolioRuleHistoryPageRequest extends QueryDto {
  sceneCode: PfSceneCode
}

export interface PortfolioTenantSceneModelSaveRequest {
  sceneCode: PfSceneCode
  sceneName?: string
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
  status?: string
}

export interface PortfolioEligibilityRuleGetRequest {
  eligibilityCode: string
}

export interface PortfolioPublishImpactReportGetRequest {
  id: string
}

export interface PortfolioIndicatorAutoCollectRequest {
  teacherId: string
}

export interface PortfolioEligibilityFieldValueItem {
  fieldKey: string
  actualValue: string
}

export interface PortfolioEligibilityAuditStatusItem {
  fieldKey: string
  auditStatus: string
}

export interface PortfolioEligibilityEvaluateRequest {
  teacherId: string
  eligibilityCode: string
  snapshotId?: string
  fieldValues?: PortfolioEligibilityFieldValueItem[]
  auditStatuses?: PortfolioEligibilityAuditStatusItem[]
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

/** 平台指标 API 契约 */
export interface PortfolioIndicatorPlatformApi {
  pageDefinition: (
    data: PortfolioIndicatorDefinitionPageRequest,
  ) => Promise<PageResult<PortfolioIndicatorDefinitionVO>>
  getDefinition: (
    data: PortfolioIndicatorDefinitionGetRequest,
  ) => Promise<PortfolioIndicatorDefinitionVO>
  saveDefinition: (data: PortfolioIndicatorDefinitionSaveRequest) => Promise<string>
  pageTemplate: (
    data: PortfolioIndicatorRuleTemplatePageRequest,
  ) => Promise<PageResult<PortfolioIndicatorRuleTemplateVO>>
  saveTemplate: (data: PortfolioIndicatorRuleTemplateSaveRequest) => Promise<string>
  listIndustryPack: () => Promise<PortfolioIndustryPackVO[]>
  saveIndustryPack: (data: PortfolioIndustryPackSaveRequest) => Promise<string>
  importSeed: () => Promise<PortfolioIndicatorPlatformSeedResultVO>
  definitionSummary: () => Promise<PortfolioIndicatorPlatformSummaryVO>
  definitionTree: () => Promise<PortfolioIndicatorDefinitionTreeNodeVO[]>
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
  pageRuleHistory: (
    data: PortfolioRuleHistoryPageRequest,
  ) => Promise<PageResult<PortfolioRulePublishSnapshotVO>>
  retroactiveGet: (
    data: PortfolioRuleRetroactiveGetRequest,
  ) => Promise<PortfolioRulePublishSnapshotVO>
  saveEligibilityRule: (data: PortfolioEligibilityRuleSaveRequest) => Promise<string>
  getEligibilityRule: (
    data: PortfolioEligibilityRuleGetRequest,
  ) => Promise<PortfolioEligibilityRuleVO>
  impactPreview: (data: PortfolioSceneCodeRequest) => Promise<string>
  getImpactReport: (
    data: PortfolioPublishImpactReportGetRequest,
  ) => Promise<PortfolioPublishImpactReportVO>
  pageImpactReport: (data: QueryDto) => Promise<PageResult<PortfolioPublishImpactReportVO>>
  evaluateEligibility: (
    data: PortfolioEligibilityEvaluateRequest,
  ) => Promise<PortfolioEligibilityEvalResultDto>
  pageEvalLog: (data: QueryDto) => Promise<PageResult<PortfolioEligibilityEvalLogVO>>
  getExplain: (data: PortfolioExplainGetRequest) => Promise<string>
  exportIndicatorCatalog: () => Promise<PortfolioIndicatorExportResultVO>
  exportSnapshotDiff: (
    data: PortfolioExportSnapshotDiffRequest,
  ) => Promise<PortfolioIndicatorExportResultVO>
  exportImpactReport: (
    data: PortfolioPublishImpactReportGetRequest,
  ) => Promise<PortfolioIndicatorExportResultVO>
  computeTrial: (
    data: PortfolioIndicatorComputeTrialRequest,
  ) => Promise<PortfolioIndicatorScoreComputeResult>
  computeSnapshot: (
    data: PortfolioIndicatorSnapshotComputeRequest,
  ) => Promise<PortfolioIndicatorScoreComputeResult>
  pageComputeLog: (data: QueryDto) => Promise<PageResult<PortfolioIndicatorComputeLogVO>>
  getAutoCollectSummary: (
    data: PortfolioIndicatorAutoCollectRequest,
  ) => Promise<PortfolioIndicatorAutoCollectSummaryResponse>
  pageAutoCollectItems: (
    data: PortfolioIndicatorAutoCollectPageRequest,
  ) => Promise<PageResult<PortfolioIndicatorCollectedValueVO>>
}
