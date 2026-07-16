import type { BadgeTone } from '@/components/ui-guide/ui/types'

import type { PortfolioArchiveRecordStatusCode } from '@/types/enums/portfolio-archive-record-status-enum'
import {
  ALL_PORTFOLIO_ARCHIVE_RECORD_STATUS_CODES,
  PortfolioArchiveRecordStatusDescription,
} from '@/types/enums/portfolio-archive-record-status-enum'
import type { PortfolioEvaluationModeCode } from '@/types/enums/portfolio-evaluation-mode-enum'
import {
  ALL_PORTFOLIO_EVALUATION_MODE_CODES,
  PortfolioEvaluationModeDescription,
} from '@/types/enums/portfolio-evaluation-mode-enum'
import type { PortfolioEvaluationObjectionTypeCode } from '@/types/enums/portfolio-evaluation-objection-type-enum'
import {
  ALL_PORTFOLIO_EVALUATION_OBJECTION_TYPE_CODES,
  PortfolioEvaluationObjectionTypeDescription,
} from '@/types/enums/portfolio-evaluation-objection-type-enum'
import type { PortfolioExternalTeacherDataStatusCode } from '@/types/enums/portfolio-external-teacher-data-status-enum'
import {
  ALL_PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_CODES,
  PortfolioExternalTeacherDataStatusDescription,
} from '@/types/enums/portfolio-external-teacher-data-status-enum'
import type { PortfolioKeyTeacherRegistryTypeCode } from '@/types/enums/portfolio-key-teacher-registry-type-enum'
import {
  ALL_PORTFOLIO_KEY_TEACHER_REGISTRY_TYPE_CODES,
  PortfolioKeyTeacherRegistryTypeDescription,
} from '@/types/enums/portfolio-key-teacher-registry-type-enum'
import type { PortfolioMaterialStatusCode } from '@/types/enums/portfolio-material-status-enum'
import {
  ALL_PORTFOLIO_MATERIAL_STATUS_CODES,
  PortfolioMaterialStatusDescription,
} from '@/types/enums/portfolio-material-status-enum'
import type { PortfolioMaterialTypeCode } from '@/types/enums/portfolio-material-type-enum'
import {
  ALL_PORTFOLIO_MATERIAL_TYPE_CODES,
  PortfolioMaterialTypeDescription,
} from '@/types/enums/portfolio-material-type-enum'
import type { PortfolioOrgUnitTypeCode } from '@/types/enums/portfolio-org-unit-type-enum'
import {
  ALL_PORTFOLIO_ORG_UNIT_TYPE_CODES,
  PortfolioOrgUnitTypeDescription,
} from '@/types/enums/portfolio-org-unit-type-enum'
import type { PortfolioTeacherIdentityStatusCode } from '@/types/enums/portfolio-teacher-identity-status-enum'
import {
  ALL_PORTFOLIO_TEACHER_IDENTITY_STATUS_CODES,
  PortfolioTeacherIdentityStatusDescription,
} from '@/types/enums/portfolio-teacher-identity-status-enum'
import type { PortfolioTeacherIdentityTypeCode } from '@/types/enums/portfolio-teacher-identity-type-enum'
import {
  ALL_PORTFOLIO_TEACHER_IDENTITY_TYPE_CODES,
  PortfolioTeacherIdentityTypeDescription,
} from '@/types/enums/portfolio-teacher-identity-type-enum'
import {
  ALL_PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_CODES,
  PortfolioDevelopmentPlanItemStatusCode,
  PortfolioDevelopmentPlanItemStatusDescription,
} from '@/types/enums/portfolio-development-plan-item-status-enum'
import {
  ALL_PORTFOLIO_DEVELOPMENT_PLAN_STATUS_CODES,
  PortfolioDevelopmentPlanStatusCode,
  PortfolioDevelopmentPlanStatusDescription,
} from '@/types/enums/portfolio-development-plan-status-enum'
import {
  ALL_PORTFOLIO_EVALUATION_TASK_STATUS_CODES,
  PortfolioEvaluationTaskStatusCode,
  PortfolioEvaluationTaskStatusDescription,
} from '@/types/enums/portfolio-evaluation-task-status-enum'
import { PortfolioPortraitDimensionCode } from '@/types/enums/portfolio-portrait-dimension-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_PORTFOLIO_AI_ANALYSIS_REVIEW_STATUS_CODES,
  PortfolioAiAnalysisReviewStatusCode,
  PortfolioAiAnalysisReviewStatusDescription,
} from '@/types/enums/portfolio-ai-analysis-review-status-enum'
export {
  ALL_PORTFOLIO_AI_ANALYSIS_TYPE_CODES,
  PortfolioAiAnalysisTypeCode,
  PortfolioAiAnalysisTypeDescription,
} from '@/types/enums/portfolio-ai-analysis-type-enum'
export {
  ALL_PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_CODES,
  PortfolioArchiveCategoryScopeCode,
  PortfolioArchiveCategoryScopeDescription,
} from '@/types/enums/portfolio-archive-category-scope-enum'
export {
  ALL_PORTFOLIO_ARCHIVE_CATEGORY_STATUS_CODES,
  PortfolioArchiveCategoryStatusCode,
  PortfolioArchiveCategoryStatusDescription,
} from '@/types/enums/portfolio-archive-category-status-enum'
export {
  ALL_PORTFOLIO_ARCHIVE_FIELD_SOURCE_TYPE_CODES,
  PortfolioArchiveFieldSourceTypeCode,
  PortfolioArchiveFieldSourceTypeDescription,
} from '@/types/enums/portfolio-archive-field-source-type-enum'
export {
  ALL_PORTFOLIO_ARCHIVE_FIELD_TYPE_CODES,
  PortfolioArchiveFieldTypeCode,
  PortfolioArchiveFieldTypeDescription,
} from '@/types/enums/portfolio-archive-field-type-enum'
export {
  ALL_PORTFOLIO_ARCHIVE_RECORD_SOURCE_TYPE_CODES,
  PortfolioArchiveRecordSourceTypeCode,
  PortfolioArchiveRecordSourceTypeDescription,
} from '@/types/enums/portfolio-archive-record-source-type-enum'
export {
  ALL_PORTFOLIO_ARCHIVE_RECORD_STATUS_CODES,
  PortfolioArchiveRecordStatusCode,
  PortfolioArchiveRecordStatusDescription,
} from '@/types/enums/portfolio-archive-record-status-enum'
export {
  ALL_PORTFOLIO_ARCHIVE_SUPPORT_MATERIAL_SOURCE_TYPE_CODES,
  PortfolioArchiveSupportMaterialSourceTypeCode,
  PortfolioArchiveSupportMaterialSourceTypeDescription,
} from '@/types/enums/portfolio-archive-support-material-source-type-enum'
export {
  ALL_PORTFOLIO_ARCHIVE_TEMPLATE_VERSION_STATUS_CODES,
  PortfolioArchiveTemplateVersionStatusCode,
  PortfolioArchiveTemplateVersionStatusDescription,
} from '@/types/enums/portfolio-archive-template-version-status-enum'
export {
  ALL_PORTFOLIO_CANDIDATE_CONFIRM_STATUS_CODES,
  PortfolioCandidateConfirmStatusCode,
  PortfolioCandidateConfirmStatusDescription,
} from '@/types/enums/portfolio-candidate-confirm-status-enum'
export {
  ALL_PORTFOLIO_COMPLETENESS_LEVEL_CODES,
  PortfolioCompletenessLevelCode,
  PortfolioCompletenessLevelDescription,
} from '@/types/enums/portfolio-completeness-level-enum'
export {
  ALL_PORTFOLIO_CORRECTION_HANDLE_ACTION_CODES,
  PortfolioCorrectionHandleActionCode,
} from '@/types/enums/portfolio-correction-handle-action-enum'
export {
  ALL_PORTFOLIO_CORRECTION_IMPACT_RECOMPUTE_STATUS_CODES,
  PortfolioCorrectionImpactRecomputeStatusCode,
  PortfolioCorrectionImpactRecomputeStatusDescription,
} from '@/types/enums/portfolio-correction-impact-recompute-status-enum'
export {
  ALL_PORTFOLIO_CORRECTION_REQUEST_STATUS_CODES,
  PortfolioCorrectionRequestStatusCode,
  PortfolioCorrectionRequestStatusDescription,
} from '@/types/enums/portfolio-correction-request-status-enum'
export {
  ALL_PORTFOLIO_DEVELOPMENT_PLAN_HISTORY_IMPORT_BATCH_STATUS_CODES,
  PortfolioDevelopmentPlanHistoryImportBatchStatusCode,
  PortfolioDevelopmentPlanHistoryImportBatchStatusDescription,
} from '@/types/enums/portfolio-development-plan-history-import-batch-status-enum'
export {
  ALL_PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_CODES,
  PortfolioDevelopmentPlanItemStatusCode,
  PortfolioDevelopmentPlanItemStatusDescription,
} from '@/types/enums/portfolio-development-plan-item-status-enum'
export {
  ALL_PORTFOLIO_DEVELOPMENT_PLAN_STATUS_CODES,
  PortfolioDevelopmentPlanStatusCode,
  PortfolioDevelopmentPlanStatusDescription,
} from '@/types/enums/portfolio-development-plan-status-enum'
export {
  ALL_PORTFOLIO_DEVELOPMENT_PLAN_TYPE_CODES,
  PortfolioDevelopmentPlanTypeCode,
  PortfolioDevelopmentPlanTypeDescription,
} from '@/types/enums/portfolio-development-plan-type-enum'

export {
  ALL_PORTFOLIO_DEVELOPMENT_RECORD_STATUS_CODES,
  PortfolioDevelopmentRecordStatusCode,
  PortfolioDevelopmentRecordStatusDescription,
} from '@/types/enums/portfolio-development-record-status-enum'
export {
  ALL_PORTFOLIO_DEVELOPMENT_RECORD_TYPE_CODES,
  PortfolioDevelopmentRecordTypeCode,
  PortfolioDevelopmentRecordTypeDescription,
} from '@/types/enums/portfolio-development-record-type-enum'
export {
  ALL_PORTFOLIO_DUAL_TEACHER_APPLICATION_STATUS_CODES,
  PortfolioDualTeacherApplicationStatusCode,
  PortfolioDualTeacherApplicationStatusDescription,
} from '@/types/enums/portfolio-dual-teacher-application-status-enum'
export {
  ALL_PORTFOLIO_EDU_USER_ORG_TREE_NODE_TYPE_CODES,
  PortfolioEduUserOrgTreeNodeTypeCode,
  PortfolioEduUserOrgTreeNodeTypeDescription,
} from '@/types/enums/portfolio-edu-user-org-tree-node-type-enum'
export {
  ALL_PORTFOLIO_EVALUATION_MODE_CODES,
  PortfolioEvaluationModeCode,
  PortfolioEvaluationModeDescription,
} from '@/types/enums/portfolio-evaluation-mode-enum'
export {
  ALL_PORTFOLIO_EVALUATION_OBJECTION_HANDLE_ACTION_CODES,
  PortfolioEvaluationObjectionHandleActionCode,
  PortfolioEvaluationObjectionHandleActionDescription,
} from '@/types/enums/portfolio-evaluation-objection-handle-action-enum'
export {
  ALL_PORTFOLIO_EVALUATION_OBJECTION_STATUS_CODES,
  PortfolioEvaluationObjectionStatusCode,
  PortfolioEvaluationObjectionStatusDescription,
} from '@/types/enums/portfolio-evaluation-objection-status-enum'
export {
  ALL_PORTFOLIO_EVALUATION_OBJECTION_TYPE_CODES,
  PortfolioEvaluationObjectionTypeCode,
  PortfolioEvaluationObjectionTypeDescription,
} from '@/types/enums/portfolio-evaluation-objection-type-enum'
export {
  ALL_PORTFOLIO_EVALUATION_PUBLICITY_STATUS_CODES,
  PortfolioEvaluationPublicityStatusCode,
  PortfolioEvaluationPublicityStatusDescription,
} from '@/types/enums/portfolio-evaluation-publicity-status-enum'
export {
  ALL_PORTFOLIO_EVALUATION_TASK_ADVANCE_ACTION_CODES,
  PortfolioEvaluationTaskAdvanceActionCode,
  PortfolioEvaluationTaskAdvanceActionDescription,
} from '@/types/enums/portfolio-evaluation-task-advance-action-enum'
export {
  ALL_PORTFOLIO_EVALUATION_TASK_STATUS_CODES,
  PortfolioEvaluationTaskStatusCode,
  PortfolioEvaluationTaskStatusDescription,
} from '@/types/enums/portfolio-evaluation-task-status-enum'
export {
  ALL_PORTFOLIO_EVALUATION_TEACHER_NOTICE_STATUS_CODES,
  PortfolioEvaluationTeacherNoticeStatusCode,
  PortfolioEvaluationTeacherNoticeStatusDescription,
} from '@/types/enums/portfolio-evaluation-teacher-notice-status-enum'
export {
  ALL_PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_CODES,
  PortfolioExternalTeacherDataStatusCode,
  PortfolioExternalTeacherDataStatusDescription,
} from '@/types/enums/portfolio-external-teacher-data-status-enum'
export {
  ALL_PORTFOLIO_EXTERNAL_TEACHER_IMPORT_BATCH_STATUS_CODES,
  PortfolioExternalTeacherImportBatchStatusCode,
  PortfolioExternalTeacherImportBatchStatusDescription,
} from '@/types/enums/portfolio-external-teacher-import-batch-status-enum'
export {
  ALL_PORTFOLIO_GAP_TASK_STATUS_CODES,
  PortfolioGapTaskStatusCode,
  PortfolioGapTaskStatusDescription,
} from '@/types/enums/portfolio-gap-task-status-enum'
export {
  ALL_PORTFOLIO_KEY_TEACHER_REGISTRY_STATUS_CODES,
  PortfolioKeyTeacherRegistryStatusCode,
  PortfolioKeyTeacherRegistryStatusDescription,
} from '@/types/enums/portfolio-key-teacher-registry-status-enum'
export {
  ALL_PORTFOLIO_KEY_TEACHER_REGISTRY_TYPE_CODES,
  PortfolioKeyTeacherRegistryTypeCode,
  PortfolioKeyTeacherRegistryTypeDescription,
} from '@/types/enums/portfolio-key-teacher-registry-type-enum'
export {
  ALL_PORTFOLIO_MATERIAL_INTAKE_STAGE_CODES,
  PortfolioMaterialIntakeStageCode,
  PortfolioMaterialIntakeStageDescription,
} from '@/types/enums/portfolio-material-intake-stage-enum'
export {
  ALL_PORTFOLIO_MATERIAL_RISK_LEVEL_CODES,
  PortfolioMaterialRiskLevelCode,
  PortfolioMaterialRiskLevelDescription,
} from '@/types/enums/portfolio-material-risk-level-enum'
export {
  ALL_PORTFOLIO_MATERIAL_STATUS_CODES,
  PortfolioMaterialStatusCode,
  PortfolioMaterialStatusDescription,
} from '@/types/enums/portfolio-material-status-enum'
export {
  ALL_PORTFOLIO_MATERIAL_TYPE_CODES,
  PortfolioMaterialTypeCode,
  PortfolioMaterialTypeDescription,
} from '@/types/enums/portfolio-material-type-enum'
export {
  ALL_PORTFOLIO_ORG_ALIAS_TARGET_TYPE_CODES,
  PortfolioOrgAliasTargetTypeCode,
  PortfolioOrgAliasTargetTypeDescription,
} from '@/types/enums/portfolio-org-alias-target-type-enum'
export {
  ALL_PORTFOLIO_ORG_UNIT_TYPE_CODES,
  PortfolioOrgUnitTypeCode,
  PortfolioOrgUnitTypeDescription,
} from '@/types/enums/portfolio-org-unit-type-enum'
export {
  ALL_PORTFOLIO_POLICY_MATCH_CONCLUSION_CODES,
  PortfolioPolicyMatchConclusionCode,
  PortfolioPolicyMatchConclusionDescription,
} from '@/types/enums/portfolio-policy-match-conclusion-enum'
export {
  ALL_PORTFOLIO_PORTRAIT_DIMENSION_CODES,
  PortfolioPortraitDimensionCode,
  PortfolioPortraitDimensionDescription,
} from '@/types/enums/portfolio-portrait-dimension-enum'
export {
  ALL_PORTFOLIO_PORTRAIT_DIMENSION_READINESS_CODES,
  PortfolioPortraitDimensionReadinessCode,
  PortfolioPortraitDimensionReadinessDescription,
} from '@/types/enums/portfolio-portrait-dimension-readiness-enum'
export {
  ALL_PORTFOLIO_PORTRAIT_INDICATOR_EVIDENCE_TYPE_CODES,
  PortfolioPortraitIndicatorEvidenceTypeCode,
  PortfolioPortraitIndicatorEvidenceTypeDescription,
} from '@/types/enums/portfolio-portrait-indicator-evidence-type-enum'
export {
  ALL_PORTFOLIO_REVIEW_ACTION_TYPE_CODES,
  PortfolioReviewActionTypeCode,
  PortfolioReviewActionTypeDescription,
} from '@/types/enums/portfolio-review-action-type-enum'
export {
  ALL_PORTFOLIO_REVIEW_TASK_STATUS_CODES,
  PortfolioReviewTaskStatusCode,
  PortfolioReviewTaskStatusDescription,
} from '@/types/enums/portfolio-review-task-status-enum'
export {
  ALL_PORTFOLIO_TEACHER_IDENTITY_STATUS_CODES,
  PortfolioTeacherIdentityStatusCode,
  PortfolioTeacherIdentityStatusDescription,
} from '@/types/enums/portfolio-teacher-identity-status-enum'
export {
  ALL_PORTFOLIO_TEACHER_IDENTITY_TYPE_CODES,
  PortfolioTeacherIdentityTypeCode,
  PortfolioTeacherIdentityTypeDescription,
} from '@/types/enums/portfolio-teacher-identity-type-enum'
export {
  ALL_PORTFOLIO_TEACHER_RECOMMEND_RUN_MODE_CODES,
  PortfolioTeacherRecommendRunModeCode,
  PortfolioTeacherRecommendRunModeDescription,
} from '@/types/enums/portfolio-teacher-recommend-run-mode-enum'
export {
  ALL_PORTFOLIO_TEACHER_RECOMMEND_RUN_STATUS_CODES,
  PortfolioTeacherRecommendRunStatusCode,
  PortfolioTeacherRecommendRunStatusDescription,
} from '@/types/enums/portfolio-teacher-recommend-run-status-enum'
export {
  ALL_PORTFOLIO_TEACHER_RECOMMEND_SCENE_CODES,
  PortfolioTeacherRecommendSceneCode,
  PortfolioTeacherRecommendSceneDescription,
} from '@/types/enums/portfolio-teacher-recommend-scene-enum'

export const PORTFOLIO_ARCHIVE_RECORD_STATUS_OPTIONS: Array<{
  value: PortfolioArchiveRecordStatusCode
  label: string
}> = ALL_PORTFOLIO_ARCHIVE_RECORD_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PortfolioArchiveRecordStatusDescription, value, '档案记录状态'),
}))

export const PORTFOLIO_EVALUATION_OBJECTION_TYPE_OPTIONS: Array<{
  value: PortfolioEvaluationObjectionTypeCode
  label: string
}> = ALL_PORTFOLIO_EVALUATION_OBJECTION_TYPE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PortfolioEvaluationObjectionTypeDescription, value, '评价异议类型'),
}))

export const PORTFOLIO_MATERIAL_STATUS_OPTIONS: Array<{
  value: PortfolioMaterialStatusCode
  label: string
}> = ALL_PORTFOLIO_MATERIAL_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PortfolioMaterialStatusDescription, value, '材料状态'),
}))

export const PORTFOLIO_MATERIAL_TYPE_OPTIONS: Array<{
  value: PortfolioMaterialTypeCode
  label: string
}> = ALL_PORTFOLIO_MATERIAL_TYPE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PortfolioMaterialTypeDescription, value, '材料类型'),
}))

export const PORTFOLIO_ORG_UNIT_TYPE_OPTIONS: Array<{
  value: PortfolioOrgUnitTypeCode
  label: string
}> = ALL_PORTFOLIO_ORG_UNIT_TYPE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PortfolioOrgUnitTypeDescription, value, '组织单元类型'),
}))

export const PORTFOLIO_TEACHER_IDENTITY_STATUS_OPTIONS: Array<{
  value: PortfolioTeacherIdentityStatusCode
  label: string
}> = ALL_PORTFOLIO_TEACHER_IDENTITY_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PortfolioTeacherIdentityStatusDescription, value, '教师身份状态'),
}))

export const PORTFOLIO_TEACHER_IDENTITY_TYPE_OPTIONS: Array<{
  value: PortfolioTeacherIdentityTypeCode
  label: string
}> = ALL_PORTFOLIO_TEACHER_IDENTITY_TYPE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PortfolioTeacherIdentityTypeDescription, value, '教师身份类型'),
}))

/** PK 对比默认维度集（与集成测试一致） */
export const PORTFOLIO_PK_COMPARE_DEFAULT_DIMENSIONS: PortfolioPortraitDimensionCode[] = [
  PortfolioPortraitDimensionCode.TEACHING,
  PortfolioPortraitDimensionCode.RESEARCH,
  PortfolioPortraitDimensionCode.TRAINING,
  PortfolioPortraitDimensionCode.PRACTICE,
]

export const PORTFOLIO_KEY_TEACHER_REGISTRY_TYPE_OPTIONS: Array<{
  value: PortfolioKeyTeacherRegistryTypeCode
  label: string
}> = ALL_PORTFOLIO_KEY_TEACHER_REGISTRY_TYPE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PortfolioKeyTeacherRegistryTypeDescription, value, '重点教师名录类型'),
}))

export const PORTFOLIO_EVALUATION_MODE_OPTIONS: Array<{
  value: PortfolioEvaluationModeCode
  label: string
}> = ALL_PORTFOLIO_EVALUATION_MODE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PortfolioEvaluationModeDescription, value, '评价模式'),
}))

/** 多元评价填报可读任务状态（不含草稿/作废/关闭） */
export const PORTFOLIO_EVALUATION_ENTRY_DATA_READABLE_STATUSES: PortfolioEvaluationTaskStatusCode[] =
  [
    PortfolioEvaluationTaskStatusCode.PUBLISHED,
    PortfolioEvaluationTaskStatusCode.PRELIMINARY_REVIEW,
    PortfolioEvaluationTaskStatusCode.SCHOOL_REVIEW,
    PortfolioEvaluationTaskStatusCode.EXPERT_REVIEW,
    PortfolioEvaluationTaskStatusCode.RESULT_SUMMARY,
    PortfolioEvaluationTaskStatusCode.PUBLICITY,
    PortfolioEvaluationTaskStatusCode.OBJECTION_HANDLING,
    PortfolioEvaluationTaskStatusCode.ARCHIVED,
    PortfolioEvaluationTaskStatusCode.SUSPENDED,
  ]

export const PORTFOLIO_EVALUATION_TASK_STATUS_TONE: Record<
  PortfolioEvaluationTaskStatusCode,
  BadgeTone
> = {
  [PortfolioEvaluationTaskStatusCode.DRAFT]: 'gray',
  [PortfolioEvaluationTaskStatusCode.PUBLISHED]: 'green',
  [PortfolioEvaluationTaskStatusCode.PRELIMINARY_REVIEW]: 'blue',
  [PortfolioEvaluationTaskStatusCode.SCHOOL_REVIEW]: 'blue',
  [PortfolioEvaluationTaskStatusCode.EXPERT_REVIEW]: 'blue',
  [PortfolioEvaluationTaskStatusCode.RESULT_SUMMARY]: 'orange',
  [PortfolioEvaluationTaskStatusCode.PUBLICITY]: 'orange',
  [PortfolioEvaluationTaskStatusCode.OBJECTION_HANDLING]: 'orange',
  [PortfolioEvaluationTaskStatusCode.ARCHIVED]: 'green',
  [PortfolioEvaluationTaskStatusCode.SUSPENDED]: 'gray',
  [PortfolioEvaluationTaskStatusCode.VOID]: 'red',
  [PortfolioEvaluationTaskStatusCode.CLOSED]: 'blue',
}

export const PORTFOLIO_EVALUATION_TASK_STATUS_OPTIONS: Array<{
  value: PortfolioEvaluationTaskStatusCode
  label: string
}> = ALL_PORTFOLIO_EVALUATION_TASK_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PortfolioEvaluationTaskStatusDescription, value, '评价任务状态'),
}))

export const PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE: Record<
  PortfolioDevelopmentPlanStatusCode,
  BadgeTone
> = {
  [PortfolioDevelopmentPlanStatusCode.DRAFT]: 'gray',
  [PortfolioDevelopmentPlanStatusCode.DEPARTMENT_PENDING]: 'blue',
  [PortfolioDevelopmentPlanStatusCode.DEPARTMENT_RETURNED]: 'orange',
  [PortfolioDevelopmentPlanStatusCode.APPROVED]: 'green',
  [PortfolioDevelopmentPlanStatusCode.HISTORICAL]: 'gray',
}

export const PORTFOLIO_DEVELOPMENT_PLAN_STATUS_OPTIONS: Array<{
  value: PortfolioDevelopmentPlanStatusCode
  label: string
}> = ALL_PORTFOLIO_DEVELOPMENT_PLAN_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PortfolioDevelopmentPlanStatusDescription, value, '发展计划状态'),
}))

export const PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_TONE: Record<
  PortfolioDevelopmentPlanItemStatusCode,
  BadgeTone
> = {
  [PortfolioDevelopmentPlanItemStatusCode.NOT_STARTED]: 'gray',
  [PortfolioDevelopmentPlanItemStatusCode.IN_PROGRESS]: 'blue',
  [PortfolioDevelopmentPlanItemStatusCode.COMPLETED]: 'green',
}

export const PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_OPTIONS: Array<{
  value: PortfolioDevelopmentPlanItemStatusCode
  label: string
}> = ALL_PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PortfolioDevelopmentPlanItemStatusDescription, value, '发展计划条目状态'),
}))

export const PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_OPTIONS: Array<{
  value: PortfolioExternalTeacherDataStatusCode
  label: string
}> = ALL_PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PortfolioExternalTeacherDataStatusDescription, value, '外部教师数据状态'),
}))
