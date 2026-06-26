import type { QueryDto } from '@/types'

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

export interface PortfolioIndicatorDefinitionTreeNodeVO {
  nodeKey: string
  nodeTitle: string
  nodeType: 'DIMENSION_L1' | 'DIMENSION_L2' | 'OBSERVATION'
  indicatorCode?: string
  defaultDataSource?: string
  status?: string
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
  defaultDataSource?: string
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
  defaultDataSource: string
  defaultRuleTemplateId?: string
  policyAlign?: string
  applicableTeachers: string
  seedVersion?: string
  auditRequired: boolean
  redLineFlag: boolean
  sortOrder: number
  status: string
}

export interface PortfolioIndicatorRuleTemplateVO {
  id: string
  templateCode: string
  templateName: string
  ruleType: string
  paramsJson: string
  status: string
}

export interface PortfolioIndustryPackVO {
  id: string
  packCode: string
  packName: string
  industryType: string
  description: string
  status: string
}

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
  paramOverrideJson?: string
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
  modelStatus: string
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
  reportStatus: string
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
  modelStatus: string
  academicYear: string
  effectiveFrom: string
  effectiveTo: string
  publishedTime: string
  snapshotSummaryJson: string
}

export interface PortfolioIndicatorExportResultVO {
  fileName: string
  rowCount: number
  csvContent: string
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
