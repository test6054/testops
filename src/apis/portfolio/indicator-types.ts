import type { PortfolioTeacherLifecycleStatusCode } from '@/apis/portfolio/teacher-lifecycle'
import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/types'
import type { PageResult, QueryDto } from '@/types'
import type { PfCurrentTaskRuleStrategyCode } from '@/types/enums/pf-current-task-rule-strategy-enum'
import type { PfEligibilityAuditStatusCode } from '@/types/enums/pf-eligibility-audit-status-enum'
import type { PfEligibilityNodeTypeCode } from '@/types/enums/pf-eligibility-node-type-enum'
import type { PfEligibilityRuleStatusCode } from '@/types/enums/pf-eligibility-rule-status-enum'
import type { PfExplainLogTypeCode } from '@/types/enums/pf-explain-log-type-enum'
import type { PfImpactApprovalStatusCode } from '@/types/enums/pf-impact-approval-status-enum'
import type { PfIndicatorDataSourceChannelCode } from '@/types/enums/pf-indicator-data-source-channel-enum'
import type { PfIndicatorPublishChangeTypeCode } from '@/types/enums/pf-indicator-publish-change-type-enum'
import type { PfIndicatorStatusCode } from '@/types/enums/pf-indicator-status-enum'
import type { PfModelStatusCode } from '@/types/enums/pf-model-status-enum'
import type { PfRuleChangeLevelCode } from '@/types/enums/pf-rule-change-level-enum'
import type { PfScoreRuleTypeCode } from '@/types/enums/pf-score-rule-type-enum'
import type { PortfolioIndicatorDefinitionTreeNodeTypeCode } from '@/types/enums/portfolio-indicator-definition-tree-node-type-enum'
import type { PortfolioRuleTrackCode } from '@/types/enums/portfolio-rule-track-enum'
import {
  ALL_PF_ELIGIBILITY_AUDIT_STATUS_CODES,
  PfEligibilityAuditStatusDescription,
} from '@/types/enums/pf-eligibility-audit-status-enum'
import {
  ALL_PF_ELIGIBILITY_NODE_TYPE_CODES,
  PfEligibilityNodeTypeDescription,
} from '@/types/enums/pf-eligibility-node-type-enum'
import { PfImpactReportStatusCode } from '@/types/enums/pf-impact-report-status-enum'
import {
  ALL_PF_INDICATOR_DATA_SOURCE_CHANNEL_CODES,
  PfIndicatorDataSourceChannelDescription,
} from '@/types/enums/pf-indicator-data-source-channel-enum'
import {
  ALL_PF_INDICATOR_STATUS_CODES,
  PfIndicatorStatusDescription,
} from '@/types/enums/pf-indicator-status-enum'
import {
  ALL_PF_MODEL_STATUS_CODES,
  PfModelStatusDescription,
} from '@/types/enums/pf-model-status-enum'
import {
  PF_BUSINESS_REFERENCE_SCENE_CODES,
  PF_MODEL_SCENE_CODES,
  PfSceneCode,
  PfSceneCodeDescription,
} from '@/types/enums/pf-scene-code-enum'
import {
  ALL_PF_SCORE_RULE_TYPE_CODES,
  PfScoreRuleTypeDescription,
} from '@/types/enums/pf-score-rule-type-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  PF_CURRENT_TASK_RULE_STRATEGY_OPTIONS,
  PfCurrentTaskRuleStrategyCode,
  PfCurrentTaskRuleStrategyDescription,
} from '@/types/enums/pf-current-task-rule-strategy-enum'

export const PF_SCENE_CODE_OPTIONS: Array<{ value: PfSceneCode, label: string }>
  = PF_MODEL_SCENE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PfSceneCodeDescription, value, '指标场景编码'),
  }))

export {
  ALL_PF_ELIGIBILITY_AUDIT_STATUS_CODES,
  PfEligibilityAuditStatusCode,
  PfEligibilityAuditStatusDescription,
} from '@/types/enums/pf-eligibility-audit-status-enum'

export const PF_INDICATOR_STATUS_OPTIONS: Array<{ value: PfIndicatorStatusCode, label: string }>
  = ALL_PF_INDICATOR_STATUS_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PfIndicatorStatusDescription, value, '指标状态'),
  }))

export {
  ALL_PF_ELIGIBILITY_NODE_TYPE_CODES,
  PfEligibilityNodeTypeCode,
  PfEligibilityNodeTypeDescription,
} from '@/types/enums/pf-eligibility-node-type-enum'

export {
  ALL_PF_ELIGIBILITY_RULE_STATUS_CODES,
  PfEligibilityRuleStatusCode,
  PfEligibilityRuleStatusDescription,
} from '@/types/enums/pf-eligibility-rule-status-enum'

export {
  pfImpactApprovalAllowsPublish,
  PfImpactApprovalStatusCode,
  PfImpactApprovalStatusDescription,
} from '@/types/enums/pf-impact-approval-status-enum'

export {
  ALL_PF_IMPACT_REPORT_STATUS_CODES,
  PfImpactReportStatusCode,
  PfImpactReportStatusDescription,
} from '@/types/enums/pf-impact-report-status-enum'

export {
  ALL_PF_INDICATOR_DATA_SOURCE_CHANNEL_CODES,
  PfIndicatorDataSourceChannelCode,
  PfIndicatorDataSourceChannelDescription,
} from '@/types/enums/pf-indicator-data-source-channel-enum'

export const PF_INDICATOR_BUSINESS_REFERENCE_SCENE_OPTIONS: Array<{
  value: PfSceneCode
  label: string
}> = PF_BUSINESS_REFERENCE_SCENE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(
    PfSceneCodeDescription,
    value,
    '指标业务引用场景',
  ),
}))

export const PF_INDICATOR_DATA_SOURCE_CHANNEL_OPTIONS: Array<{
  value: PfIndicatorDataSourceChannelCode
  label: string
}> = ALL_PF_INDICATOR_DATA_SOURCE_CHANNEL_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PfIndicatorDataSourceChannelDescription, value, '指标数据来源渠道'),
}))

export {
  ALL_PF_INDICATOR_STATUS_CODES,
  PfIndicatorStatusCode,
  PfIndicatorStatusDescription,
} from '@/types/enums/pf-indicator-status-enum'

export const PF_SCORE_RULE_TYPE_OPTIONS: Array<{ value: PfScoreRuleTypeCode, label: string }>
  = ALL_PF_SCORE_RULE_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PfScoreRuleTypeDescription, value, '计分规则类型'),
  }))

export {
  ALL_PF_MODEL_STATUS_CODES,
  PfModelStatusCode,
  PfModelStatusDescription,
} from '@/types/enums/pf-model-status-enum'

export const PF_MODEL_STATUS_OPTIONS: Array<{ value: PfModelStatusCode, label: string }>
  = ALL_PF_MODEL_STATUS_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PfModelStatusDescription, value, '场景模型状态'),
  }))

export {
  PfRuleChangeLevelCode,
  PfRuleChangeLevelDescription,
  pfRuleChangeLevelRequiresApproval,
} from '@/types/enums/pf-rule-change-level-enum'

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
  sceneCode: PfSceneCode
  enabled?: boolean
  weightPct?: string
}

/** 指标业务场景引用行 - PortfolioIndicatorBusinessSceneReferenceVO */
export interface PortfolioIndicatorBusinessSceneReferenceVO {
  referenceScene: PfSceneCode
  enabled?: boolean
}

export interface PortfolioIndicatorReferenceStatusVO {
  indicatorCode: string
  indicatorName: string
  tenantEnabled?: boolean
  defaultDataSource?: PfIndicatorDataSourceChannelCode
  sceneReferences: PortfolioIndicatorReferenceSceneVO[]
  businessSceneReferences: PortfolioIndicatorBusinessSceneReferenceVO[]
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

/** Score 规则模板参数 — PortfolioIndicatorSeedTemplateParamsDto */
export interface PortfolioIndicatorSeedTemplateParamsDto {
  passValue?: number
  standardScore?: number
  minValue?: number
  maxValue?: number
  targetRatio?: number
  cumulativeCap?: number
  capScore?: number
  addScore?: number
  subScore?: number
  weight?: number
}

/** 与 PortfolioIndicatorSeedTemplateParamsDto 同形（后端无单独 TemplateParamsDto） */
export type PortfolioIndicatorTemplateParamsDto = PortfolioIndicatorSeedTemplateParamsDto

/** 租户指标审核链 — PortfolioIndicatorAuditChainDto */
export interface PortfolioIndicatorAuditChainDto {
  stepRoleCodes?: string[]
}

export interface PortfolioIndicatorRuleTemplateVO {
  id: string
  templateCode: string
  templateName: string
  ruleType: PfScoreRuleTypeCode
  params: PortfolioIndicatorSeedTemplateParamsDto
  status: PfIndicatorStatusCode
}

export interface PortfolioIndicatorRuleTemplateSaveRequest {
  id?: string
  templateCode: string
  templateName: string
  ruleType: PfScoreRuleTypeCode
  params: PortfolioIndicatorSeedTemplateParamsDto
  description?: string
  status: PfIndicatorStatusCode
}

export interface PortfolioIndicatorIndustryPackDictionarySectionDto {
  categories?: string[]
  requiredFields?: string[]
  levels?: string[]
  roleOptions?: string[]
}

export interface PortfolioIndicatorIndustryPackDictionaryDto {
  enterprisePractice?: PortfolioIndicatorIndustryPackDictionarySectionDto
  qualification?: PortfolioIndicatorIndustryPackDictionarySectionDto
  industryProject?: PortfolioIndicatorIndustryPackDictionarySectionDto
}

export interface PortfolioIndicatorIndustryPackWeightsDto {
  enterprisePractice?: number
  qualification?: number
  industryProject?: number
  teachingContribution?: number
  socialService?: number
  trainingDevelopment?: number
}

export interface PortfolioIndicatorIndustryPackAssessmentSectionDto {
  sectionId?: string
  title?: string
  fieldRefs?: string[]
}

export interface PortfolioIndicatorIndustryPackAssessmentTemplateDto {
  templateId?: string
  sections?: PortfolioIndicatorIndustryPackAssessmentSectionDto[]
}

export interface PortfolioIndicatorIndustryPackMaterialChecklistDto {
  required?: string[]
  optional?: string[]
}

export type PortfolioIndustryPackDictionarySectionDto
  = PortfolioIndicatorIndustryPackDictionarySectionDto
export type PortfolioIndustryPackDictionaryDto = PortfolioIndicatorIndustryPackDictionaryDto
export type PortfolioIndustryPackWeightsDto = PortfolioIndicatorIndustryPackWeightsDto
export type PortfolioIndustryPackAssessmentSectionDto
  = PortfolioIndicatorIndustryPackAssessmentSectionDto
export type PortfolioIndustryPackAssessmentTemplateDto
  = PortfolioIndicatorIndustryPackAssessmentTemplateDto
export type PortfolioIndustryPackMaterialChecklistDto
  = PortfolioIndicatorIndustryPackMaterialChecklistDto

/** 行业包结构化定义 — PortfolioIndicatorIndustryPackDefDto */
export interface PortfolioIndicatorIndustryPackDefDto {
  packId: string
  packName: string
  version: string
  applicableMajors?: string[]
  dictionary?: PortfolioIndicatorIndustryPackDictionaryDto
  weights?: PortfolioIndicatorIndustryPackWeightsDto
  assessmentTemplate?: PortfolioIndicatorIndustryPackAssessmentTemplateDto
  materialChecklist?: PortfolioIndicatorIndustryPackMaterialChecklistDto
}

/** 与 PortfolioIndicatorIndustryPackDefDto 同形 */
export type PortfolioIndustryPackDefDto = PortfolioIndicatorIndustryPackDefDto

export interface PortfolioIndustryPackVO {
  id: string
  packCode: string
  packName: string
  packVersion: string
  packDef: PortfolioIndicatorIndustryPackDefDto
  seedVersion?: string
  status: PfIndicatorStatusCode
}

export interface PortfolioIndustryPackSaveRequest {
  id?: string
  packCode: string
  packName: string
  packVersion: string
  packDef: PortfolioIndicatorIndustryPackDefDto
  status: PfIndicatorStatusCode
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
  ALL_PF_SCENE_CODES,
  PF_BUSINESS_REFERENCE_SCENE_CODES,
  PF_MODEL_SCENE_CODES,
  PfSceneCode,
  PfSceneCodeDescription,
} from '@/types/enums/pf-scene-code-enum'

export interface PortfolioIndicatorBusinessReferenceStatusVO {
  referenceScene: PfSceneCode
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
  changeType?: PfIndicatorPublishChangeTypeCode
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
  paramsOverride?: PortfolioIndicatorSeedTemplateParamsDto
  applicableTeacherTypes?: string
  applicableScenes?: PfSceneCode[]
  auditChain?: PortfolioIndicatorAuditChainDto
}

export interface PortfolioTenantIndicatorConfigSaveRequest {
  indicatorCode: string
  enabled?: boolean
  standardScore?: number
  capScore?: number
  paramsOverride?: PortfolioIndicatorSeedTemplateParamsDto
  applicableTeacherTypes?: string
  applicableScenes?: PfSceneCode[]
  auditChain?: PortfolioIndicatorAuditChainDto
}

export interface PortfolioIndustryPackBindConfigDto {
  remark?: string
  majorGroupCode?: string
  packMergeWeight?: number
}

export interface PortfolioIndustryPackBindItem {
  packCode: string
  majorGroupCode?: string
  majorGroupName?: string
  enabled?: boolean
  bindConfig?: PortfolioIndustryPackBindConfigDto
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
  defaultDataSource?: PfIndicatorDataSourceChannelCode
  defaultRuleTemplateId?: string
  policyAlign?: string
  applicableTeachers?: string
  seedVersion?: string
  auditRequired?: boolean
  redLineFlag?: boolean
  sortOrder?: number
  status?: PfIndicatorStatusCode
}

export interface PortfolioIndicatorRuleTemplatePageRequest extends QueryDto {
  templateCode?: string
  ruleType?: PfScoreRuleTypeCode
  status?: PfIndicatorStatusCode
}

export interface PortfolioIndicatorComputeTrialRequest {
  ruleType: PfScoreRuleTypeCode
  indicatorCode?: string
  params: PortfolioIndicatorSeedTemplateParamsDto
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
  logType: PfExplainLogTypeCode
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
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
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
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
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
  ruleTree: PfEligibilityRuleTreeNodeDto
  status: PfEligibilityRuleStatusCode
}

export interface PfEligibilityRuleTreeNodeDto {
  nodeType: PfEligibilityNodeTypeCode
  fieldKey?: string
  expectedValue?: string
  auditStatus?: PfEligibilityAuditStatusCode
  children?: PfEligibilityRuleTreeNodeDto[]
}

export interface PfEligibilityExplainNodeDto {
  nodeType: PfEligibilityNodeTypeCode
  fieldKey?: string
  expectedValue?: string
  actualValue?: string
  auditStatus?: PfEligibilityAuditStatusCode
  actualAuditStatus?: PfEligibilityAuditStatusCode
  passed?: boolean
  children?: PfEligibilityExplainNodeDto[]
}

export interface PfEligibilityExplainStructDto {
  ruleTrack?: PortfolioRuleTrackCode
  eligibilityCode?: string
  snapshotId?: string
  eligible?: boolean
  root?: PfEligibilityExplainNodeDto
  eligibilityGaps?: string[]
  generatedTime?: string
}

export interface PfScoreExplainInputsDto {
  rawValue?: number
  unit?: string
}

export interface PfScoreExplainRuleHitDto {
  ruleType?: PfScoreRuleTypeCode
  segmentLabel?: string
  standardScore?: number
  dimensionWeight?: number
  calcScore?: number
  passed?: boolean
}

export interface PfScoreExplainAuditDto {
  required?: boolean
  status?: PfEligibilityAuditStatusCode
  nodes?: string[]
}

export interface PfScoreExplainStructDto {
  ruleTrack?: PortfolioRuleTrackCode
  indicatorCode?: string
  indicatorName?: string
  snapshotId?: string
  snapshotVersion?: string
  academicYear?: string
  inputs?: PfScoreExplainInputsDto
  ruleHit?: PfScoreExplainRuleHitDto
  audit?: PfScoreExplainAuditDto
  eligibilityGaps?: string[]
  generatedTime?: string
}

export interface PortfolioExplainVO {
  ruleTrack?: PortfolioRuleTrackCode
  scoreExplain?: PfScoreExplainStructDto
  eligibilityExplain?: PfEligibilityExplainStructDto
}

export interface PortfolioPlatformRuleTemplateDraftItem {
  templateId?: string
  indicatorCode?: string
  ruleType?: PfScoreRuleTypeCode
  params?: PortfolioIndicatorSeedTemplateParamsDto
  templateUpdateTime?: string
}

export interface PortfolioIndicatorDraftPayloadDto {
  sceneCode?: PfSceneCode
  configs?: PortfolioTenantIndicatorConfigVO[]
  indicators?: PortfolioTenantSceneIndicatorItem[]
  eligibilityCodes?: string[]
  industryPackCodes?: string[]
  platformRuleTemplates?: PortfolioPlatformRuleTemplateDraftItem[]
}

export interface PortfolioImpactTeacherSummaryDto {
  affectedTeacherCount?: number
  sampleTeacherCount?: number
}

export interface PortfolioImpactOrgSummaryDto {
  affectedDepartmentCount?: number
  departmentRows?: PortfolioImpactOrgItemDto[]
}

export interface PortfolioImpactOrgItemDto {
  departmentId?: string
  departmentName?: string
  affectedTeacherCount?: number
}

export interface PortfolioImpactEligibilitySummaryDto {
  affectedEligibilityCount?: number
  changedEligibilityCodes?: string[]
}

export interface PortfolioImpactSampleCaseDto {
  teacherId?: string
  teacherName?: string
  indicatorCode?: string
  beforeScore?: number
  afterScore?: number
  deltaScore?: number
}

export interface PortfolioImpactEvaluationTaskSummaryDto {
  inProgressTaskCount?: number
  frozenInProgressTaskCount?: number
  publicizedOrArchivedTaskCount?: number
  affectedTeacherCount?: number
  averageProgressRatio?: number
}

export interface PortfolioPublishImpactReportVO {
  id: string
  createUser: string
  sceneCode: PfSceneCode
  draftSnapshotHash: string
  reportStatus: PfImpactReportStatusCode
  indicatorSummary?: PortfolioImpactIndicatorSummaryDto
  teacherSummary?: PortfolioImpactTeacherSummaryDto
  orgSummary?: PortfolioImpactOrgSummaryDto
  eligibilitySummary?: PortfolioImpactEligibilitySummaryDto
  sampleCases?: PortfolioImpactSampleCaseDto[]
  expiredTime: string
  changeLevel?: PfRuleChangeLevelCode
  evaluationTaskSummary?: PortfolioImpactEvaluationTaskSummaryDto
  approvalStatus?: PfImpactApprovalStatusCode
  approvedUser?: string
  approvedTime?: string
  approvalOpinion?: string
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
  snapshotSummary: PortfolioIndicatorDraftPayloadDto
}

export interface PortfolioIndicatorSourceMappingVO {
  indicatorCode: string
  indicatorName: string
  defaultDataSource: PfIndicatorDataSourceChannelCode
  outOfScope: boolean
  autoCollectSupported: boolean
}

export interface PortfolioIndicatorCollectedValueVO {
  indicatorCode: string
  channelCode: PfIndicatorDataSourceChannelCode
  collected: boolean
  rawValue?: string
  skipReason?: string
}

export interface PortfolioIndicatorAutoCollectSummaryResponse {
  teacherId: string
  collectedCount: number
  skippedCount: number
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
  /** 归属教师多身份并列层（ACTIVE 身份；§8.50 / US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string
}

export interface PortfolioIndicatorAutoCollectPageRequest extends QueryDto {
  teacherId: string
}

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
  explainStruct: PfEligibilityExplainStructDto
  auditStatuses?: PortfolioEligibilityAuditStatusItem[]
}

export interface PortfolioIndicatorScoreComputeResult {
  calcScore?: number
  finalScore?: number | null
  hitSegment?: string
  ruleType?: PfScoreRuleTypeCode
  explainText: string
  explainStruct: PfScoreExplainStructDto
}

export interface PortfolioIndicatorDefinitionPageRequest extends QueryDto {
  indicatorCode?: string
  indicatorName?: string
  dimensionL1Name?: string
  status?: PfIndicatorStatusCode
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
  currentTaskRuleStrategy?: PfCurrentTaskRuleStrategyCode
}

export interface PortfolioPublishImpactApproveRequest {
  impactReportId: string
  approved: boolean
  approvalOpinion?: string
}

export interface PortfolioEligibilityRuleSaveRequest {
  eligibilityCode: string
  eligibilityName: string
  sceneCode: PfSceneCode
  ruleTree: PfEligibilityRuleTreeNodeDto
  status: PfEligibilityRuleStatusCode
}

export interface PortfolioEligibilityRuleGetRequest {
  eligibilityCode: string
}

export interface PortfolioPublishImpactReportGetRequest {
  id: string
  /** 仅导出时必填；get 查询可不传 */
  exportPurpose?: string
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
  auditStatus: PfEligibilityAuditStatusCode
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
  exportPurpose: string
}

export interface PortfolioIndicatorCatalogExportRequest {
  exportPurpose: string
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
  approveImpactReport: (
    data: PortfolioPublishImpactApproveRequest,
  ) => Promise<PortfolioPublishImpactReportVO>
  pageImpactReport: (data: QueryDto) => Promise<PageResult<PortfolioPublishImpactReportVO>>
  evaluateEligibility: (
    data: PortfolioEligibilityEvaluateRequest,
  ) => Promise<PortfolioEligibilityEvalResultDto>
  pageEvalLog: (data: QueryDto) => Promise<PageResult<PortfolioEligibilityEvalLogVO>>
  getExplain: (data: PortfolioExplainGetRequest) => Promise<PortfolioExplainVO>
  exportIndicatorCatalog: (
    data: PortfolioIndicatorCatalogExportRequest,
  ) => Promise<PortfolioIndicatorExportResultVO>
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
