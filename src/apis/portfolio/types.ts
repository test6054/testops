import type { ArchiveMaterialOcrStatusCode } from '@/apis/mark/archive-ocr-status'
import type { AiTaskStatusCode } from '@/apis/quality/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { QueryDto } from '@/types'
import type { PortfolioAiAnalysisReviewStatusCode } from '@/types/enums/portfolio-ai-analysis-review-status-enum'
import type { PortfolioAiAnalysisTypeCode } from '@/types/enums/portfolio-ai-analysis-type-enum'
import type { PortfolioAiExtractTaskTypeCode } from '@/types/enums/portfolio-ai-extract-task-type-enum'
import {
  ALL_PORTFOLIO_AI_EXTRACT_TASK_TYPE_CODES,
  PortfolioAiExtractTaskTypeDescription
} from '@/types/enums/portfolio-ai-extract-task-type-enum'
import type { PortfolioAiTaskTypeCode } from '@/types/enums/portfolio-ai-task-type-enum'
import type { PortfolioArchiveCategoryScopeCode } from '@/types/enums/portfolio-archive-category-scope-enum'
import {
  ALL_PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_CODES,
  PortfolioArchiveCategoryScopeDescription
} from '@/types/enums/portfolio-archive-category-scope-enum'
import type { PortfolioArchiveCategoryStatusCode } from '@/types/enums/portfolio-archive-category-status-enum'
import {
  ALL_PORTFOLIO_ARCHIVE_CATEGORY_STATUS_CODES,
  PortfolioArchiveCategoryStatusDescription
} from '@/types/enums/portfolio-archive-category-status-enum'
import type { PortfolioArchiveFieldSourceTypeCode } from '@/types/enums/portfolio-archive-field-source-type-enum'
import {
  ALL_PORTFOLIO_ARCHIVE_FIELD_SOURCE_TYPE_CODES,
  PortfolioArchiveFieldSourceTypeDescription
} from '@/types/enums/portfolio-archive-field-source-type-enum'
import type { PortfolioArchiveFieldTypeCode } from '@/types/enums/portfolio-archive-field-type-enum'
import {
  ALL_PORTFOLIO_ARCHIVE_FIELD_TYPE_CODES,
  PortfolioArchiveFieldTypeDescription
} from '@/types/enums/portfolio-archive-field-type-enum'
import type { PortfolioArchiveRecordSourceTypeCode } from '@/types/enums/portfolio-archive-record-source-type-enum'
import type {
  PortfolioArchiveTemplateVersionStatusCode
} from '@/types/enums/portfolio-archive-template-version-status-enum'
import type { PortfolioCorrectionHandleActionCode } from '@/types/enums/portfolio-correction-handle-action-enum'
import type { PortfolioEduUserOrgTreeNodeTypeCode } from '@/types/enums/portfolio-edu-user-org-tree-node-type-enum'
import type { PortfolioEvaluationObjectionTypeCode } from '@/types/enums/portfolio-evaluation-objection-type-enum'
import {
  ALL_PORTFOLIO_EVALUATION_OBJECTION_TYPE_CODES,
  PortfolioEvaluationObjectionTypeDescription
} from '@/types/enums/portfolio-evaluation-objection-type-enum'
import type {
  PortfolioEvaluationTaskAdvanceActionCode
} from '@/types/enums/portfolio-evaluation-task-advance-action-enum'
import type { PortfolioEvaluationTaskStatusCode } from '@/types/enums/portfolio-evaluation-task-status-enum'
import type { PortfolioGapTaskStatusCode } from '@/types/enums/portfolio-gap-task-status-enum'
import type { PortfolioMaterialTypeCode } from '@/types/enums/portfolio-material-type-enum'
import {
  ALL_PORTFOLIO_MATERIAL_TYPE_CODES,
  PortfolioMaterialTypeDescription
} from '@/types/enums/portfolio-material-type-enum'
import type { PortfolioOrgAliasTargetTypeCode } from '@/types/enums/portfolio-org-alias-target-type-enum'
import type { PortfolioOrgUnitTypeCode } from '@/types/enums/portfolio-org-unit-type-enum'
import {
  ALL_PORTFOLIO_ORG_UNIT_TYPE_CODES,
  PortfolioOrgUnitTypeDescription
} from '@/types/enums/portfolio-org-unit-type-enum'
import type { PortfolioPortraitCohortTypeCode } from '@/types/enums/portfolio-portrait-cohort-type-enum'
import type { PortfolioPortraitCohortDisplayModeCode } from '@/types/enums/portfolio-portrait-cohort-display-mode-enum'
import type { PortfolioPortraitDimensionCode } from '@/types/enums/portfolio-portrait-dimension-enum'
import type {
  PortfolioPortraitIndicatorEvidenceTypeCode
} from '@/types/enums/portfolio-portrait-indicator-evidence-type-enum'
import type { PortfolioPortraitStageCode } from '@/types/enums/portfolio-portrait-stage-code-enum'
import type { PortfolioReportSceneCode } from '@/types/enums/portfolio-report-scene-enum'
import {
  ALL_PORTFOLIO_REPORT_SCENE_CODES,
  PortfolioReportSceneDescription
} from '@/types/enums/portfolio-report-scene-enum'
import type { PortfolioReviewActionTypeCode } from '@/types/enums/portfolio-review-action-type-enum'
import type { PortfolioTeacherIdentityStatusCode } from '@/types/enums/portfolio-teacher-identity-status-enum'
import {
  ALL_PORTFOLIO_TEACHER_IDENTITY_STATUS_CODES,
  PortfolioTeacherIdentityStatusDescription
} from '@/types/enums/portfolio-teacher-identity-status-enum'
import type { PortfolioTeacherIdentityTypeCode } from '@/types/enums/portfolio-teacher-identity-type-enum'
import {
  ALL_PORTFOLIO_TEACHER_IDENTITY_TYPE_CODES,
  PortfolioTeacherIdentityTypeDescription
} from '@/types/enums/portfolio-teacher-identity-type-enum'
import type { PortfolioTodoTypeCode } from '@/types/enums/portfolio-todo-type-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { UserStatusEnum } from '@/types/enums/user-status'
import {
  ALL_PORTFOLIO_ARCHIVE_RECORD_STATUS_CODES,
  PortfolioArchiveRecordStatusCode,
  PortfolioArchiveRecordStatusDescription
} from '@/types/enums/portfolio-archive-record-status-enum'
import { PortfolioCandidateConfirmStatusCode } from '@/types/enums/portfolio-candidate-confirm-status-enum'
import { PortfolioCompletenessLevelCode } from '@/types/enums/portfolio-completeness-level-enum'
import { PortfolioCorrectionRequestStatusCode } from '@/types/enums/portfolio-correction-request-status-enum'
import {
  PortfolioEvaluationObjectionHandleActionCode
} from '@/types/enums/portfolio-evaluation-objection-handle-action-enum'
import { PortfolioEvaluationObjectionStatusCode } from '@/types/enums/portfolio-evaluation-objection-status-enum'
import { PortfolioEvaluationPublicityStatusCode } from '@/types/enums/portfolio-evaluation-publicity-status-enum'
import {
  PortfolioEvaluationTeacherNoticeStatusCode
} from '@/types/enums/portfolio-evaluation-teacher-notice-status-enum'
import { PortfolioMaterialIntakeStageCode } from '@/types/enums/portfolio-material-intake-stage-enum'
import { PortfolioMaterialRiskLevelCode } from '@/types/enums/portfolio-material-risk-level-enum'
import {
  ALL_PORTFOLIO_MATERIAL_STATUS_CODES,
  PortfolioMaterialStatusCode,
  PortfolioMaterialStatusDescription
} from '@/types/enums/portfolio-material-status-enum'
import { PortfolioPolicyMatchConclusionCode } from '@/types/enums/portfolio-policy-match-conclusion-enum'
import { PortfolioPortraitDimensionReadinessCode } from '@/types/enums/portfolio-portrait-dimension-readiness-enum'
import { PortfolioReviewTaskStatusCode } from '@/types/enums/portfolio-review-task-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

/**
 * 教学档案袋 API 共享类型 - 对应 edu-quality 标准包（controller/model 扁平化后）
 */

export {
  ALL_PORTFOLIO_AI_ANALYSIS_REVIEW_STATUS_CODES,
  PortfolioAiAnalysisReviewStatusCode,
  PortfolioAiAnalysisReviewStatusDescription,
} from '@/types/enums/portfolio-ai-analysis-review-status-enum'

export const PORTFOLIO_ORG_UNIT_TYPE_OPTIONS: Array<{ value: PortfolioOrgUnitTypeCode, label: string }>
  = ALL_PORTFOLIO_ORG_UNIT_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortfolioOrgUnitTypeDescription, value, '组织单元类型'),
  }))

export {
  ALL_PORTFOLIO_AI_ANALYSIS_TYPE_CODES,
  PortfolioAiAnalysisTypeCode,
  PortfolioAiAnalysisTypeDescription,
} from '@/types/enums/portfolio-ai-analysis-type-enum'

export {
  ALL_PORTFOLIO_AI_EXTRACT_TASK_TYPE_CODES,
  PortfolioAiExtractTaskTypeCode,
  PortfolioAiExtractTaskTypeDescription,
} from '@/types/enums/portfolio-ai-extract-task-type-enum'

export const PORTFOLIO_TEACHER_IDENTITY_TYPE_OPTIONS: Array<{ value: PortfolioTeacherIdentityTypeCode, label: string }>
  = ALL_PORTFOLIO_TEACHER_IDENTITY_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortfolioTeacherIdentityTypeDescription, value, '教师身份类型'),
  }))

export {
  ALL_PORTFOLIO_AI_TASK_TYPE_CODES,
  PortfolioAiTaskTypeCode,
  PortfolioAiTaskTypeDescription,
} from '@/types/enums/portfolio-ai-task-type-enum'

export const PORTFOLIO_TEACHER_IDENTITY_STATUS_OPTIONS: Array<{ value: PortfolioTeacherIdentityStatusCode, label: string }>
  = ALL_PORTFOLIO_TEACHER_IDENTITY_STATUS_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortfolioTeacherIdentityStatusDescription, value, '教师身份状态'),
  }))

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

export const PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_OPTIONS: Array<{ value: PortfolioArchiveCategoryScopeCode, label: string }>
  = ALL_PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortfolioArchiveCategoryScopeDescription, value, '档案类目范围'),
  }))

export {
  ALL_PORTFOLIO_ARCHIVE_FIELD_SOURCE_TYPE_CODES,
  PortfolioArchiveFieldSourceTypeCode,
  PortfolioArchiveFieldSourceTypeDescription,
} from '@/types/enums/portfolio-archive-field-source-type-enum'

export const PORTFOLIO_ARCHIVE_CATEGORY_STATUS_OPTIONS: Array<{ value: PortfolioArchiveCategoryStatusCode, label: string }>
  = ALL_PORTFOLIO_ARCHIVE_CATEGORY_STATUS_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortfolioArchiveCategoryStatusDescription, value, '档案类目状态'),
  }))

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

export const PORTFOLIO_ARCHIVE_FIELD_TYPE_OPTIONS: Array<{ value: PortfolioArchiveFieldTypeCode, label: string }>
  = ALL_PORTFOLIO_ARCHIVE_FIELD_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortfolioArchiveFieldTypeDescription, value, '档案字段类型'),
  }))

export {
  ALL_PORTFOLIO_ARCHIVE_RECORD_STATUS_CODES,
  PortfolioArchiveRecordStatusCode,
  PortfolioArchiveRecordStatusDescription,
} from '@/types/enums/portfolio-archive-record-status-enum'

export const PORTFOLIO_ARCHIVE_FIELD_SOURCE_TYPE_OPTIONS: Array<{ value: PortfolioArchiveFieldSourceTypeCode, label: string }>
  = ALL_PORTFOLIO_ARCHIVE_FIELD_SOURCE_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortfolioArchiveFieldSourceTypeDescription, value, '档案字段来源类型'),
  }))

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

export const PORTFOLIO_POLICY_MATCH_CONCLUSION_TONE: Record<PortfolioPolicyMatchConclusionCode, BadgeTone> = {
  [PortfolioPolicyMatchConclusionCode.MATCHED]: 'green',
  [PortfolioPolicyMatchConclusionCode.PARTIAL]: 'blue',
  [PortfolioPolicyMatchConclusionCode.NOT_MATCHED]: 'orange',
  [PortfolioPolicyMatchConclusionCode.INSUFFICIENT_EVIDENCE]: 'gray',
}

export {
  ALL_PORTFOLIO_CORRECTION_HANDLE_ACTION_CODES,
  PortfolioCorrectionHandleActionCode,
} from '@/types/enums/portfolio-correction-handle-action-enum'

export {
  ALL_PORTFOLIO_CORRECTION_REQUEST_STATUS_CODES,
  PortfolioCorrectionRequestStatusCode,
  PortfolioCorrectionRequestStatusDescription,
} from '@/types/enums/portfolio-correction-request-status-enum'

export const PORTFOLIO_AI_EXTRACT_TASK_TYPE_OPTIONS: Array<{ value: PortfolioAiExtractTaskTypeCode, label: string }>
  = ALL_PORTFOLIO_AI_EXTRACT_TASK_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortfolioAiExtractTaskTypeDescription, value, '档案袋 AI 抽取任务类型'),
  }))

export {
  ALL_PORTFOLIO_EDU_USER_ORG_TREE_NODE_TYPE_CODES,
  PortfolioEduUserOrgTreeNodeTypeCode,
  PortfolioEduUserOrgTreeNodeTypeDescription,
} from '@/types/enums/portfolio-edu-user-org-tree-node-type-enum'

export const PORTFOLIO_MATERIAL_TYPE_OPTIONS: Array<{ value: PortfolioMaterialTypeCode, label: string }>
  = ALL_PORTFOLIO_MATERIAL_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortfolioMaterialTypeDescription, value, '材料类型'),
  }))

export {
  ALL_PORTFOLIO_EVALUATION_OBJECTION_HANDLE_ACTION_CODES,
  PortfolioEvaluationObjectionHandleActionCode,
  PortfolioEvaluationObjectionHandleActionDescription,
} from '@/types/enums/portfolio-evaluation-objection-handle-action-enum'

export const PORTFOLIO_CANDIDATE_CONFIRM_STATUS_TONE: Record<PortfolioCandidateConfirmStatusCode, BadgeTone> = {
  [PortfolioCandidateConfirmStatusCode.PENDING_CONFIRM]: 'blue',
  [PortfolioCandidateConfirmStatusCode.CONFIRMED]: 'green',
  [PortfolioCandidateConfirmStatusCode.REJECTED]: 'red',
  [PortfolioCandidateConfirmStatusCode.NEEDS_MANUAL_FILL]: 'orange',
}

/** 系统预置档案分类编码（与后端种子一致） */
export const PORTFOLIO_TEMPLATE_CODE_CERTIFICATE = 'CERTIFICATE'
export const PORTFOLIO_TEMPLATE_CODE_DOCUMENT = 'DOCUMENT'

/** 系统预置默认审核流编码 */
export const PORTFOLIO_DEFAULT_AUDIT_FLOW_CODE = 'PORTFOLIO_DEFAULT_REVIEW'

/** 学校复审审核流编码（敏感材料） */
export const PORTFOLIO_SCHOOL_REVIEW_FLOW_CODE = 'PORTFOLIO_SCHOOL_REVIEW'

export {
  ALL_PORTFOLIO_EVALUATION_OBJECTION_STATUS_CODES,
  PortfolioEvaluationObjectionStatusCode,
  PortfolioEvaluationObjectionStatusDescription,
} from '@/types/enums/portfolio-evaluation-objection-status-enum'

export const PORTFOLIO_REPORT_SCENE_OPTIONS: Array<{ value: PortfolioReportSceneCode, label: string }>
  = ALL_PORTFOLIO_REPORT_SCENE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortfolioReportSceneDescription, value, '报告场景'),
  }))

export {
  ALL_PORTFOLIO_EVALUATION_OBJECTION_TYPE_CODES,
  PortfolioEvaluationObjectionTypeCode,
  PortfolioEvaluationObjectionTypeDescription,
} from '@/types/enums/portfolio-evaluation-objection-type-enum'

export const PORTFOLIO_REVIEW_TASK_STATUS_TONE: Record<PortfolioReviewTaskStatusCode, BadgeTone> = {
  [PortfolioReviewTaskStatusCode.PENDING]: 'blue',
  [PortfolioReviewTaskStatusCode.SECOND_REVIEW]: 'purple',
  [PortfolioReviewTaskStatusCode.APPROVED]: 'green',
  [PortfolioReviewTaskStatusCode.RETURNED]: 'orange',
  [PortfolioReviewTaskStatusCode.DISMISSED]: 'red',
  [PortfolioReviewTaskStatusCode.CLOSED]: 'gray',
}

export {
  ALL_PORTFOLIO_EVALUATION_PUBLICITY_STATUS_CODES,
  PortfolioEvaluationPublicityStatusCode,
  PortfolioEvaluationPublicityStatusDescription,
} from '@/types/enums/portfolio-evaluation-publicity-status-enum'

export const PORTFOLIO_MATERIAL_RISK_LEVEL_TONE: Record<PortfolioMaterialRiskLevelCode, BadgeTone> = {
  [PortfolioMaterialRiskLevelCode.LOW]: 'green',
  [PortfolioMaterialRiskLevelCode.SENSITIVE]: 'red',
}

export {
  ALL_PORTFOLIO_EVALUATION_TASK_ADVANCE_ACTION_CODES,
  PortfolioEvaluationTaskAdvanceActionCode,
  PortfolioEvaluationTaskAdvanceActionDescription,
} from '@/types/enums/portfolio-evaluation-task-advance-action-enum'

export const PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE: Record<PortfolioArchiveRecordStatusCode, BadgeTone> = {
  [PortfolioArchiveRecordStatusCode.DRAFT]: 'gray',
  [PortfolioArchiveRecordStatusCode.PENDING_CONFIRM]: 'blue',
  [PortfolioArchiveRecordStatusCode.PENDING_REVIEW]: 'blue',
  [PortfolioArchiveRecordStatusCode.OFFICIAL]: 'green',
  [PortfolioArchiveRecordStatusCode.SUPERSEDED]: 'gray',
  [PortfolioArchiveRecordStatusCode.RETURNED]: 'orange',
  [PortfolioArchiveRecordStatusCode.VOID]: 'gray',
}

export const PORTFOLIO_ARCHIVE_RECORD_STATUS_OPTIONS: Array<{ value: PortfolioArchiveRecordStatusCode, label: string }>
  = ALL_PORTFOLIO_ARCHIVE_RECORD_STATUS_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortfolioArchiveRecordStatusDescription, value, '档案记录状态'),
  }))

export {
  ALL_PORTFOLIO_EVALUATION_TEACHER_NOTICE_STATUS_CODES,
  PortfolioEvaluationTeacherNoticeStatusCode,
  PortfolioEvaluationTeacherNoticeStatusDescription,
} from '@/types/enums/portfolio-evaluation-teacher-notice-status-enum'

export {
  ALL_PORTFOLIO_GAP_TASK_STATUS_CODES,
  PortfolioGapTaskStatusCode,
  PortfolioGapTaskStatusDescription,
} from '@/types/enums/portfolio-gap-task-status-enum'

export {
  ALL_PORTFOLIO_MATERIAL_INTAKE_STAGE_CODES,
  PortfolioMaterialIntakeStageCode,
  PortfolioMaterialIntakeStageDescription,
} from '@/types/enums/portfolio-material-intake-stage-enum'

export const PORTFOLIO_COMPLETENESS_LEVEL_TONE: Record<PortfolioCompletenessLevelCode, BadgeTone> = {
  [PortfolioCompletenessLevelCode.COMPLETE]: 'green',
  [PortfolioCompletenessLevelCode.BASIC]: 'blue',
  [PortfolioCompletenessLevelCode.PENDING]: 'orange',
  [PortfolioCompletenessLevelCode.SEVERE]: 'red',
}

export {
  ALL_PORTFOLIO_MATERIAL_RISK_LEVEL_CODES,
  PortfolioMaterialRiskLevelCode,
  PortfolioMaterialRiskLevelDescription,
} from '@/types/enums/portfolio-material-risk-level-enum'

export const PORTFOLIO_MATERIAL_INTAKE_STAGE_TONE: Record<PortfolioMaterialIntakeStageCode, BadgeTone> = {
  [PortfolioMaterialIntakeStageCode.EMPTY]: 'gray',
  [PortfolioMaterialIntakeStageCode.UPLOADED]: 'blue',
  [PortfolioMaterialIntakeStageCode.OCR_PENDING]: 'blue',
  [PortfolioMaterialIntakeStageCode.AI_PROCESSING]: 'blue',
  [PortfolioMaterialIntakeStageCode.AI_FAILED]: 'red',
  [PortfolioMaterialIntakeStageCode.CATEGORY_PENDING]: 'orange',
  [PortfolioMaterialIntakeStageCode.FIELDS_INCOMPLETE]: 'orange',
  [PortfolioMaterialIntakeStageCode.READY_TO_SUBMIT]: 'green',
  [PortfolioMaterialIntakeStageCode.SUBMITTED]: 'green',
  [PortfolioMaterialIntakeStageCode.UNDER_REVIEW]: 'blue',
  [PortfolioMaterialIntakeStageCode.RETURNED]: 'orange',
}

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

export const PORTFOLIO_PORTRAIT_DIMENSION_READINESS_TONE: Record<PortfolioPortraitDimensionReadinessCode, BadgeTone> = {
  [PortfolioPortraitDimensionReadinessCode.READY]: 'green',
  [PortfolioPortraitDimensionReadinessCode.PENDING]: 'orange',
}

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
  ALL_PORTFOLIO_PORTRAIT_COHORT_DISPLAY_MODE_CODES,
  PortfolioPortraitCohortDisplayModeCode,
  PortfolioPortraitCohortDisplayModeDescription,
} from '@/types/enums/portfolio-portrait-cohort-display-mode-enum'

export const PORTFOLIO_CORRECTION_REQUEST_STATUS_TONE: Record<PortfolioCorrectionRequestStatusCode, BadgeTone> = {
  [PortfolioCorrectionRequestStatusCode.SUBMITTED]: 'blue',
  [PortfolioCorrectionRequestStatusCode.ACCEPTING]: 'orange',
  [PortfolioCorrectionRequestStatusCode.ARCHIVE_CORRECTING]: 'orange',
  [PortfolioCorrectionRequestStatusCode.SOURCE_FIXING]: 'orange',
  [PortfolioCorrectionRequestStatusCode.PENDING_VERIFY]: 'blue',
  [PortfolioCorrectionRequestStatusCode.CLOSED]: 'green',
  [PortfolioCorrectionRequestStatusCode.REJECTED]: 'red',
}

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

export const PORTFOLIO_EVALUATION_TEACHER_NOTICE_STATUS_TONE: Record<PortfolioEvaluationTeacherNoticeStatusCode, BadgeTone> = {
  [PortfolioEvaluationTeacherNoticeStatusCode.MATERIAL_CONFIRM]: 'blue',
  [PortfolioEvaluationTeacherNoticeStatusCode.RETURNED_SUPPLEMENT]: 'orange',
  [PortfolioEvaluationTeacherNoticeStatusCode.CONFIRMED]: 'green',
}

export {
  ALL_PORTFOLIO_REPORT_SCENE_CODES,
  PortfolioReportSceneCode,
  PortfolioReportSceneDescription,
} from '@/types/enums/portfolio-report-scene-enum'

export const PORTFOLIO_EVALUATION_PUBLICITY_STATUS_TONE: Record<PortfolioEvaluationPublicityStatusCode, BadgeTone> = {
  [PortfolioEvaluationPublicityStatusCode.OPEN]: 'blue',
  [PortfolioEvaluationPublicityStatusCode.CLOSED]: 'gray',
}

export {
  ALL_PORTFOLIO_REVIEW_ACTION_TYPE_CODES,
  PortfolioReviewActionTypeCode,
  PortfolioReviewActionTypeDescription,
} from '@/types/enums/portfolio-review-action-type-enum'

export const PORTFOLIO_EVALUATION_OBJECTION_STATUS_TONE: Record<PortfolioEvaluationObjectionStatusCode, BadgeTone> = {
  [PortfolioEvaluationObjectionStatusCode.SUBMITTED]: 'blue',
  [PortfolioEvaluationObjectionStatusCode.UPHELD]: 'green',
  [PortfolioEvaluationObjectionStatusCode.REJECTED]: 'red',
  [PortfolioEvaluationObjectionStatusCode.CLOSED]: 'gray',
}

export {
  ALL_PORTFOLIO_REVIEW_TASK_STATUS_CODES,
  PortfolioReviewTaskStatusCode,
  PortfolioReviewTaskStatusDescription,
} from '@/types/enums/portfolio-review-task-status-enum'

export const PORTFOLIO_EVALUATION_OBJECTION_TYPE_OPTIONS: Array<{ value: PortfolioEvaluationObjectionTypeCode, label: string }>
  = ALL_PORTFOLIO_EVALUATION_OBJECTION_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortfolioEvaluationObjectionTypeDescription, value, '评价异议类型'),
  }))

export {
  ALL_PORTFOLIO_TEACHER_IDENTITY_STATUS_CODES,
  PortfolioTeacherIdentityStatusCode,
  PortfolioTeacherIdentityStatusDescription,
} from '@/types/enums/portfolio-teacher-identity-status-enum'

export const PORTFOLIO_EVALUATION_OBJECTION_HANDLE_ACTION_TONE: Record<PortfolioEvaluationObjectionHandleActionCode, BadgeTone> = {
  [PortfolioEvaluationObjectionHandleActionCode.MAINTAIN]: 'gray',
  [PortfolioEvaluationObjectionHandleActionCode.CORRECT]: 'green',
  [PortfolioEvaluationObjectionHandleActionCode.REVOKE]: 'orange',
  [PortfolioEvaluationObjectionHandleActionCode.RE_REVIEW]: 'blue',
}

export {
  ALL_PORTFOLIO_TEACHER_IDENTITY_TYPE_CODES,
  PortfolioTeacherIdentityTypeCode,
  PortfolioTeacherIdentityTypeDescription,
} from '@/types/enums/portfolio-teacher-identity-type-enum'

export {
  ALL_PORTFOLIO_TODO_TYPE_CODES,
  PortfolioTodoTypeCode,
} from '@/types/enums/portfolio-todo-type-enum'

export const PORTFOLIO_MATERIAL_STATUS_TONE: Record<PortfolioMaterialStatusCode, BadgeTone> = {
  [PortfolioMaterialStatusCode.ACTIVE]: 'green',
}

export const PORTFOLIO_MATERIAL_STATUS_OPTIONS: Array<{ value: PortfolioMaterialStatusCode, label: string }>
  = ALL_PORTFOLIO_MATERIAL_STATUS_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortfolioMaterialStatusDescription, value, '材料状态'),
  }))

export interface PortfolioOrgAliasVO {
  id: string
  aliasName: string
  effectiveFrom?: string
  effectiveTo?: string
  remark?: string
}

export interface PortfolioOrgTreeNodeVO {
  id: string
  nodeType: PortfolioEduUserOrgTreeNodeTypeCode | PortfolioOrgUnitTypeCode
  parentId?: string
  parentNodeType?: PortfolioEduUserOrgTreeNodeTypeCode | PortfolioOrgUnitTypeCode
  name: string
  code?: string
  anchorDepartmentId?: string
  anchorMajorId?: string
  portfolioOrgId?: string
  leaderUserId?: string
  leaderUserName?: string
  leaderTeacherNo?: string
  aliases?: PortfolioOrgAliasVO[]
  children?: PortfolioOrgTreeNodeVO[]
}

export interface PortfolioOrgTreeRequest {
  includeClasses?: boolean
  rootDepartmentId?: string
}

export interface PortfolioOrgUnitSaveRequest {
  id?: string
  orgType: PortfolioOrgUnitTypeCode
  orgCode?: string
  orgName: string
  parentPortfolioOrgId?: string
  anchorDepartmentId?: string
  anchorMajorId?: string
  sortOrder?: number
  status?: string
  leaderUserId?: string
}

export interface PortfolioOrgAliasSaveRequest {
  id?: string
  targetType: PortfolioOrgAliasTargetTypeCode
  targetId: string
  aliasName: string
  effectiveFrom?: string
  effectiveTo?: string
  remark?: string
}

export interface PortfolioOrgSyncInvalidUnitVO {
  id: string
  orgName: string
  orgCode?: string
}

export interface PortfolioOrgSyncResultVO {
  syncedTime: string
  departmentCount: number
  majorCount: number
  classCount: number
  invalidPortfolioOrgUnitIds: string[]
  invalidPortfolioOrgUnits: PortfolioOrgSyncInvalidUnitVO[]
}

export interface PortfolioOrgSyncLogVO {
  id: string
  syncedTime: string
  departmentCount: number
  majorCount: number
  classCount: number
  invalidUnitCount: number
}

export interface PortfolioTeacherPageRequest extends QueryDto {
  departmentId?: string
  portfolioOrgId?: string
  title?: string
  identityType?: PortfolioTeacherIdentityTypeCode
  searchText?: string
  status?: UserStatusEnum
}

export interface PortfolioTeacherSummaryVO {
  userId: string
  userName?: string
  nickName?: string
  teacherNumber?: string
  departmentId?: string
  departmentName?: string
  title?: string
  status?: string
  primaryIdentityType?: PortfolioTeacherIdentityTypeCode
  identityTags?: PortfolioTeacherIdentityTypeCode[]
}

export interface PortfolioTeacherIdentityVO {
  id: string
  teacherUserId?: string
  identityType: PortfolioTeacherIdentityTypeCode
  identityStatus: PortfolioTeacherIdentityStatusCode
  appointmentNo?: string
  displayName?: string
  enterpriseName?: string
  anchorDepartmentId?: string
  anchorPortfolioOrgId?: string
  titleAtIdentity?: string
  validFrom?: string
  validTo?: string
}

export interface PortfolioTeacherDetailVO {
  userId: string
  userName?: string
  nickName?: string
  teacherNumber?: string
  email?: string
  mobile?: string
  departmentId?: string
  departmentName?: string
  /** 专业 ID（后端由学术档案 majorId 归并，档案袋 AI 提交 programId 同源） */
  programId?: string
  title?: string
  schoolId?: string
  schoolName?: string
  status?: string
  createTime?: string
  identities: PortfolioTeacherIdentityVO[]
}

export interface PortfolioTeacherIdentitySaveRequest {
  id?: string
  teacherUserId?: string
  identityType: PortfolioTeacherIdentityTypeCode
  identityStatus: PortfolioTeacherIdentityStatusCode
  appointmentNo?: string
  displayName?: string
  enterpriseName?: string
  anchorDepartmentId?: string
  anchorPortfolioOrgId?: string
  titleAtIdentity?: string
  validFrom?: string
  validTo?: string
}

export interface PortfolioArchiveTemplateDiffSummary {
  added: string[]
  removed: string[]
  changed: string[]
}

export interface PortfolioArchiveTemplateSeedResultVO {
  createdCategoryCodes: string[]
  skippedCategoryCodes: string[]
}

export interface PortfolioTargetFieldDefinition {
  fieldDefId?: string
  fieldCode: string
  fieldLabel: string
  fieldType?: PortfolioArchiveFieldTypeCode
  readonly?: boolean
  required?: boolean
}

export interface PortfolioArchiveAuditFlowBindRequest {
  categoryId: string
  auditFlowCode: string
}

export interface PortfolioArchiveAuditFlowBindingVO {
  categoryId: string
  auditFlowCode: string
}

export interface PortfolioAiAskRequest {
  teacherId: string
  fileNodeId: string
  userQuestion: string
  materialId: string
  materialType: PortfolioMaterialTypeCode
  programId?: string
}

export interface PortfolioAiPolicyCheckRequest {
  teacherId: string
  policyClauseText: string
  materialType: PortfolioMaterialTypeCode
  fileNodeId?: string
  /** 带 fileNodeId 的政策核验须传已登记材料 materialId */
  materialId?: string
  templateCode?: string
  categoryId?: string
  programId?: string
  teacherProfileSummary?: string
}

/** 驾驶舱指标问数 - PortfolioAiCockpitAskRequest */
export interface PortfolioAiCockpitAskRequest {
  departmentId?: string
  userQuestion: string
}

export interface PortfolioAiAnalysisIssueVO {
  issueTitle: string
  issueDescription?: string
  severity?: string
}

export interface PortfolioAiAnalysisEvidenceVO {
  evidenceTitle: string
  evidenceSource?: string
  evidenceContent: string
}

export interface PortfolioAiAnalysisSuggestionVO {
  suggestionTitle: string
  suggestionContent: string
  priority?: string
}

export interface PortfolioCockpitSummaryVO {
  departmentId?: string
  departmentName?: string
  teacherCount?: number
  dualTeacherCount?: number
  keyTeacherCount?: number
  achievementTotalCount?: number
  honorTotalCount?: number
  tenantEnabledIndicatorCount?: number
}

/** 驾驶舱问数教师行 - PortfolioCockpitAskTeacherRow */
export interface PortfolioCockpitAskTeacherRow {
  teacherUserId?: string
  teacherNumber?: string
  nickName?: string
  departmentName?: string
  metricValue?: string
  metricCode?: string
}

/** 驾驶舱问数结构化结果 - PortfolioCockpitAskResultPayload */
export interface PortfolioCockpitAskResultPayload {
  queryPlan?: {
    planType?: string
    indicatorCode?: string
    operator?: string
    threshold?: number
    refusalReason?: string
    narrativeSummary?: string
  }
  teacherRows?: PortfolioCockpitAskTeacherRow[]
  indicatorRefs?: string[]
  drillLinks?: string[]
}

export interface PortfolioArchiveCategoryListRequest {
  scope?: PortfolioArchiveCategoryScopeCode
  teacherId?: string
}

export interface PortfolioArchiveCategoryDeleteRequest {
  categoryId: string
}

export interface PortfolioArchiveCategoryTreeNodeVO {
  id: string
  categoryCode: string
  categoryName: string
  parentId?: string
  scope: PortfolioArchiveCategoryScopeCode
  sortOrder?: number
  status: PortfolioArchiveCategoryStatusCode
  draftVersionId?: string
  publishedVersionId?: string
  children?: PortfolioArchiveCategoryTreeNodeVO[]
}

export interface PortfolioArchiveCategorySaveRequest {
  id?: string
  categoryCode: string
  categoryName: string
  parentId?: string
  scope?: PortfolioArchiveCategoryScopeCode
  sortOrder?: number
  status?: PortfolioArchiveCategoryStatusCode
}

export interface PortfolioArchiveFieldDefVO {
  id: string
  templateVersionId: string
  fieldCode: string
  fieldLabel: string
  fieldType: PortfolioArchiveFieldTypeCode
  required?: boolean
  readonly?: boolean
  enumRef?: string
  sourceType: PortfolioArchiveFieldSourceTypeCode
  sortOrder?: number
}

export interface PortfolioArchiveFieldDefSaveRequest {
  id?: string
  templateVersionId: string
  fieldCode: string
  fieldLabel: string
  fieldType?: PortfolioArchiveFieldTypeCode
  required?: boolean
  readonly?: boolean
  enumRef?: string
  sourceType?: PortfolioArchiveFieldSourceTypeCode
  sortOrder?: number
}

export interface PortfolioArchiveFieldListRequest {
  templateVersionId: string
}

export interface PortfolioArchiveVersionActionRequest {
  categoryId: string
  templateVersionId?: string
  changeSummary?: string
}

export interface PortfolioArchiveVersionMutationRequest {
  categoryId: string
  templateVersionId: string
  changeSummary?: string
}

export interface PortfolioArchiveFieldDeleteRequest {
  fieldId: string
  templateVersionId: string
}

export interface PortfolioArchiveTemplateVersionVO {
  id: string
  categoryId: string
  templateCode: string
  versionNo: string
  status: PortfolioArchiveTemplateVersionStatusCode
  publishedTime?: string
  changeSummary?: string
}

export interface PortfolioArchiveTemplateChangeLogVO {
  id: string
  categoryId: string
  fromVersionId?: string
  toVersionId: string
  diffSummaryJson?: string
  createTime?: string
}

export interface PortfolioArchivePublishedFieldsRequest {
  categoryId?: string
  templateCode?: string
}

export interface PortfolioArchivePublishedFieldsVO {
  categoryId: string
  templateCode: string
  templateVersionId: string
  versionNo: string
  targetFields: PortfolioTargetFieldDefinition[]
}

export interface PortfolioAiJobSubmitRequest {
  taskType: PortfolioAiTaskTypeCode
  teacherId: string
  materialId?: string
  fileNodeId?: string
  materialType: PortfolioMaterialTypeCode
  templateCode?: string
  categoryId?: string
  programId?: string
  userQuestion?: string
  context?: PortfolioAiJobContext
  frozenProviderChain?: string
}

/** 报告生成任务上下文 */
export interface PortfolioAiJobContext {
  targetFields?: PortfolioTargetFieldDefinition[]
  categoryId?: string
  templateVersionId?: string
  policyClauseText?: string
  reportScene?: string
  reportPeriodLabel?: string
  teacherName?: string
  teacherProfileSummary?: string
  scanWorkOrderId?: string
  archiveRecordId?: string
  departmentId?: string
}

export interface PortfolioAiJobSubmitVO {
  taskId: string
  portfolioAiJobId?: string
  status: AiTaskStatusCode
}

export interface PortfolioAiJobPageRequest extends QueryDto {
  teacherId?: string
  taskType?: PortfolioAiTaskTypeCode
  status?: AiTaskStatusCode
  /** 仅候选确认链（OCR / 文档抽取） */
  candidateExtractOnly?: boolean
}

export interface PortfolioCandidateFieldVO {
  id: string
  aiTaskId: string
  aiJobId: string
  teacherId: string
  fileNodeId?: string
  fieldCode: string
  fieldLabel: string
  candidateValue: string
  evidenceRef: string
  confirmStatus: PortfolioCandidateConfirmStatusCode
  manualFillRequired?: boolean
}

export interface PortfolioCandidateConfirmRequest {
  candidateFieldId: string
  aiTaskId: string
  confirmStatus: PortfolioCandidateConfirmStatusCode
  correctedCandidateValue?: string
}

export interface PortfolioAiAnalysisSummaryVO {
  id: string
  aiTaskId: string
  aiJobId?: string
  teacherId?: string
  teacherName?: string
  teacherNumber?: string
  departmentName?: string
  fileNodeId?: string
  analysisType: PortfolioAiAnalysisTypeCode
  resultTitle: string
  summary: string
  conclusionCode?: PortfolioPolicyMatchConclusionCode
  reportScene?: string
  reportPeriodLabel?: string
  reviewStatus: PortfolioAiAnalysisReviewStatusCode
  taskStatus?: AiTaskStatusCode
  taskFailurePhase?: string
  taskFailureReason?: string
  modelName?: string
  promptTokenCount?: number
  completionTokenCount?: number
  generatedTime?: string
  createTime?: string
}

/** AI 初审分析详情 - PortfolioAiAnalysisDetailVO */
export interface PortfolioAiAnalysisDetailVO extends PortfolioAiAnalysisSummaryVO {
  policyClauseDigest?: string
  draftMarkdown?: string
  issueItems: PortfolioAiAnalysisIssueVO[]
  evidenceItems: PortfolioAiAnalysisEvidenceVO[]
  suggestionItems: PortfolioAiAnalysisSuggestionVO[]
}

/** 教学档案袋 AI 分析结果分页 - PortfolioAiAnalysisPageRequest */
export interface PortfolioAiAnalysisPageRequest extends QueryDto {
  teacherId?: string
  analysisType?: PortfolioAiAnalysisTypeCode
  reviewStatus?: PortfolioAiAnalysisReviewStatusCode
  taskStatus?: AiTaskStatusCode
  searchText?: string
  /** 驾驶舱问数院系 scope；仅 COCKPIT_ASK 时生效 */
  departmentId?: string
  /** 驾驶舱问数仅全校范围；仅 COCKPIT_ASK 时生效 */
  schoolScopeOnly?: boolean
}

export interface PortfolioReviewTaskPageRequest extends QueryDto {
  reviewStatus?: PortfolioReviewTaskStatusCode
  teacherId?: string
  categoryId?: string
  departmentId?: string
  auditFlowCode?: string
}

/** 审核任务操作日志分页查询 */
export interface PortfolioReviewLogPageRequest extends QueryDto {
  reviewTaskId: string
}

/** 审核档案记录字段分页查询 */
export interface PortfolioReviewArchiveRecordFieldPageRequest extends QueryDto {
  archiveRecordId: string
}

export interface PortfolioReviewTaskSummaryVO {
  id: string
  archiveRecordId: string
  teacherId: string
  teacherName?: string
  teacherNumber?: string
  departmentName?: string
  categoryId: string
  categoryName?: string
  reviewStatus: PortfolioReviewTaskStatusCode
  recordStatus?: PortfolioArchiveRecordStatusCode
  sourceType?: PortfolioArchiveRecordSourceTypeCode
  auditFlowCode?: string
  batchApproveAllowed?: boolean
  aiPreReviewSummary?: string
  riskLevel?: PortfolioMaterialRiskLevelCode
  referenceAiTaskId?: string
  singleReviewRequired?: boolean
  escalateAllowed?: boolean
  reviewActionAllowed?: boolean
  createTime?: string
}

export interface PortfolioReviewTaskEscalateRequest {
  reviewTaskId: string
  reason: string
}

export interface PortfolioReviewTaskApproveRequest {
  reviewTaskId: string
  opinion?: string
}

export interface PortfolioReviewTaskRejectRequest {
  reviewTaskId: string
  reason: string
  returnDeadline: string
}

export interface PortfolioReviewTaskDismissRequest {
  reviewTaskId: string
  reason: string
}

export interface PortfolioReviewTaskBatchApproveRequest {
  reviewTaskIds: string[]
  opinion?: string
}

export interface PortfolioReviewTaskBatchRejectRequest {
  reviewTaskIds: string[]
  reason: string
  returnDeadline: string
}

export interface PortfolioReviewLogVO {
  id: string
  reviewTaskId: string
  archiveRecordId: string
  actionType: PortfolioReviewActionTypeCode
  opinion?: string
  returnDeadline?: string
  reviewerUserId: string
  createTime?: string
}

export interface PortfolioReviewRecordFieldVO {
  fieldCode: string
  fieldLabel?: string
  fieldValue: string
  evidenceRef?: string
}

export interface PortfolioReviewArchiveRecordDetailVO {
  id: string
  teacherId: string
  categoryId: string
  categoryName?: string
  recordStatus: PortfolioArchiveRecordStatusCode
  sourceType: PortfolioArchiveRecordSourceTypeCode
  aiTaskId?: string
  academicYear?: string
  fields: PortfolioReviewRecordFieldVO[]
}

export interface PortfolioTeacherCompletenessGetRequest {
  teacherId?: string
}

export interface PortfolioTeacherProgressCockpitGetRequest {
  teacherId?: string
}

export interface PortfolioTeacherWorkbenchSummaryVO {
  teacherUserId: string
  pendingTodoCount: number
  currentAcademicYear?: string
  completenessPercent: number
  completenessLevel?: PortfolioCompletenessLevelCode
  requiredCategoryTotal?: number
  requiredCategoryDone?: number
  compositeScore: number
  pendingReviewCount?: number
  returnedCount?: number
  openGapCount?: number
}

export interface PortfolioTeacherOnboardingStateVO {
  teacherId: string
  currentStep: number
  completed: boolean
  dismissedUntil?: string
  templateReady?: boolean
}

export interface PortfolioOnboardingFieldSpecSummaryVO {
  categoryId: string
  categoryName: string
  fieldLabels: string[]
}

export interface PortfolioTeacherOnboardingReviewContentVO {
  categoryTree: PortfolioArchiveCategoryTreeNodeVO[]
  fieldSpecSummaries: PortfolioOnboardingFieldSpecSummaryVO[]
}

export interface PortfolioArchiveTeacherReadinessVO {
  templatePublished: boolean
  categoryCount: number
  blockingReason?: string
  adminContactHint?: string
}

export interface PortfolioMaterialIntakeValidationDiagnosticVO {
  code?: string
  fieldCode: string
  message: string
}

export interface PortfolioMaterialUnmappedFieldVO {
  fieldCode: string
  fieldLabel?: string
  fieldValue?: string
}

export interface PortfolioMaterialIntakeStatusVO {
  intakeSessionId: string
  materialId: string
  teacherId?: string
  materialTitle?: string
  fileNodeId?: string
  archiveRecordId?: string
  aiTaskId?: string
  stage: PortfolioMaterialIntakeStageCode
  categoryId?: string
  categoryName?: string
  ocrStatus?: ArchiveMaterialOcrStatusCode
  aiTaskStatus?: AiTaskStatusCode
  pendingCandidateCount?: number
  missingFieldCount?: number
  diagnostics?: PortfolioMaterialIntakeValidationDiagnosticVO[]
  demoMode?: boolean
  recordStatus?: PortfolioArchiveRecordStatusCode
  latestRejectReason?: string
  fieldValues?: PortfolioArchiveRecordFieldVO[]
  targetFields?: PortfolioTargetFieldDefinition[]
  clearedFieldsFromReassign?: PortfolioMaterialUnmappedFieldVO[]
}

export interface PortfolioMaterialIntakeStartResultVO {
  intakeSessionId: string
  materialId: string
  aiTaskId?: string
}

export interface PortfolioTeacherProgressPeriodRowVO {
  academicYear: string
  completenessPercent: number
  pendingReviewCount?: number
  returnedCount?: number
  openGapCount?: number
  topGapCategoryNames: string[]
}

export interface PortfolioTeacherProgressCockpitVO {
  teacherId: string
  currentAcademicYear: string
  completenessPercent: number
  pendingReviewCount: number
  returnedCount: number
  openGapCount: number
  completenessDeltaVsPreviousYear?: number
  periodRows: PortfolioTeacherProgressPeriodRowVO[]
}

export interface PortfolioTeacherReviewStatusPageRequest extends QueryDto {
  teacherId?: string
  academicYear?: string
  recordStatus?: PortfolioArchiveRecordStatusCode
  locateRecordId?: string
}

export interface PortfolioTeacherReviewStatusRowVO {
  archiveRecordId: string
  categoryId: string
  categoryName: string
  recordStatus: PortfolioArchiveRecordStatusCode
  academicYear?: string
  reviewTaskId?: string
  reviewTaskStatus?: PortfolioReviewTaskStatusCode
  updateTime?: string
  latestRejectReason?: string
}

export interface PortfolioMaterialReassignCategoryResultVO {
  archiveRecordId: string
  reusedFieldCount: number
  clearedFieldCount: number
  stageAfterReassign: PortfolioMaterialIntakeStageCode
  clearedFields?: PortfolioMaterialUnmappedFieldVO[]
}

export interface PortfolioTeacherCompletenessVO {
  teacherId: string
  completenessPercent: number
  completenessLevel: PortfolioCompletenessLevelCode
  requiredCategoryTotal: number
  requiredCategoryDone: number
  computedTime?: string
}

export interface PortfolioTeacherPortraitGetRequest {
  teacherId?: string
  cohortType?: PortfolioPortraitCohortTypeCode
}

export interface PortfolioPortraitStrengthTagVO {
  tagCode: string
  tagLabel: string
  score: number
  tagType: string
}

export interface PortfolioPortraitGapItemVO {
  indicatorCode: string
  indicatorName: string
  dimensionL1Name?: string
  portraitDimensionCode?: string
  gapReason: string
  calcScore?: number
}

export interface PortfolioTeacherPortraitDimensionVO {
  dimensionCode: PortfolioPortraitDimensionCode
  dimensionLabel: string
  score: number
  weightPercent: number
  dataSource: string
  readiness: PortfolioPortraitDimensionReadinessCode
}

export interface PortfolioTeacherPortraitVO {
  teacherId: string
  compositeScore: number
  developmentCoreScore: number
  teachingScore: number
  researchScore: number
  trainingScore: number
  practiceScore: number
  officialRecordCount: number
  lastArchiveRecordId?: string
  computedTime?: string
  ruleSnapshotId?: string
  stageCode?: PortfolioPortraitStageCode
  dataSource?: string
  strengthTags: PortfolioPortraitStrengthTagVO[]
  gapItems: PortfolioPortraitGapItemVO[]
  dimensions: PortfolioTeacherPortraitDimensionVO[]
}

export interface PortfolioTeacherPortraitTrendGetRequest extends PortfolioTeacherPortraitGetRequest {
  /** 返回最近快照条数，默认 12，范围 1–36 */
  limit?: number
}

export interface PortfolioTeacherPortraitTrendPointVO {
  computedTime: string
  compositeScore: number
  developmentCoreScore: number
  teachingScore: number
  researchScore: number
  trainingScore: number
  practiceScore: number
}

export interface PortfolioTeacherPortraitTrendVO {
  teacherId: string
  points: PortfolioTeacherPortraitTrendPointVO[]
}

export interface PortfolioTeacherPortraitCohortDimensionVO {
  dimensionCode: PortfolioPortraitDimensionCode
  dimensionLabel: string
  personalScore: number
  cohortAverage?: number
  cohortMedian?: number
  cohortPercentileLow?: number
  cohortPercentileHigh?: number
}

export interface PortfolioTeacherPortraitCohortCompareVO {
  teacherId: string
  cohortLabel?: string
  cohortType?: PortfolioPortraitCohortTypeCode
  /** 已有画像快照的同群体教师数 */
  sampleSize: number
  displayMode: PortfolioPortraitCohortDisplayModeCode
  dimensions: PortfolioTeacherPortraitCohortDimensionVO[]
}

export interface PortfolioTeacherPortraitIndicatorDetailRequest {
  teacherId?: string
  dimensionCode: PortfolioPortraitDimensionCode
}

export interface PortfolioTeacherPortraitIndicatorEvidenceVO {
  evidenceType: PortfolioPortraitIndicatorEvidenceTypeCode
  archiveRecordId?: string
  categoryName?: string
  categoryCode?: string
  recordStatus?: PortfolioArchiveRecordStatusCode
  scoreContribution?: number
  summary?: string
  updateTime?: string
}

export interface PortfolioTeacherPortraitIndicatorDetailVO {
  teacherId: string
  dimensionCode: PortfolioPortraitDimensionCode
  dimensionLabel: string
  dimensionScore: number
  dataSource: string
  computedTime?: string
  evidences: PortfolioTeacherPortraitIndicatorEvidenceVO[]
}

export interface PortfolioArchiveRecordPageRequest extends QueryDto {
  teacherId?: string
  categoryId?: string
  recordStatus?: PortfolioArchiveRecordStatusCode
  academicYear?: string
  semester?: SemesterCode
  courseCode?: string
  achievementType?: string
  materialType?: string
}

export interface PortfolioArchiveRecordSummaryVO {
  id: string
  teacherId: string
  categoryId: string
  categoryName?: string
  recordStatus: PortfolioArchiveRecordStatusCode
  sourceType: PortfolioArchiveRecordSourceTypeCode
  updateTime?: string
  evaluationIncluded: boolean
  referenceAiTaskId?: string
  createTime?: string
  documentVersionNo?: number
  currentOfficial?: boolean
}

export interface PortfolioArchiveRecordVersionVO {
  id: string
  rootRecordId?: string
  documentVersionNo?: number
  recordStatus: PortfolioArchiveRecordStatusCode
  supersededById?: string
  currentOfficial?: boolean
  updateTime?: string
}

export interface PortfolioArchiveRecordFieldVO {
  fieldCode: string
  fieldLabel?: string
  fieldValue: string
  evidenceRef?: string
  referenceCandidateFieldId?: string
  updateTime?: string
  fieldCorrecting?: boolean
}

export interface PortfolioArchiveRecordDetailVO {
  id: string
  teacherId: string
  categoryId: string
  categoryName?: string
  recordStatus: PortfolioArchiveRecordStatusCode
  sourceType: PortfolioArchiveRecordSourceTypeCode
  updateTime?: string
  evaluationIncluded: boolean
  referenceAiTaskId?: string
  latestRejectReason?: string
  fields: PortfolioArchiveRecordFieldVO[]
  rootRecordId?: string
  documentVersionNo?: number
  supersededById?: string
  versionHistory?: PortfolioArchiveRecordVersionVO[]
}

export interface PortfolioArchiveTimelineRequest {
  teacherId?: string
  limit?: number
}

export interface PortfolioArchiveTimelineItemVO {
  archiveRecordId: string
  categoryId: string
  categoryName?: string
  recordStatus: PortfolioArchiveRecordStatusCode
  sourceType: PortfolioArchiveRecordSourceTypeCode
  eventTime?: string
  evaluationIncluded: boolean
  referenceAiTaskId?: string
}

export interface PortfolioTeacherOneTableGetRequest {
  teacherId?: string
}

export interface PortfolioTeacherOneTableCategoryVO {
  categoryId: string
  categoryName: string
  parentId?: string
  recordCount: number
  officialRecordId?: string
  latestRecordStatus?: PortfolioArchiveRecordStatusCode
  latestUpdateTime?: string
}

export interface PortfolioTeacherOneTableVO {
  teacherId: string
  categories: PortfolioTeacherOneTableCategoryVO[]
}

export interface PortfolioArchiveRecordFieldInput {
  fieldCode: string
  fieldValue?: string
  evidenceRef?: string
}

export interface PortfolioArchiveRecordSaveDraftRequest {
  teacherId?: string
  recordId?: string
  categoryId?: string
  fileNodeId?: string
  fields: PortfolioArchiveRecordFieldInput[]
}

export interface PortfolioArchiveRecordSubmitRequest {
  teacherId?: string
  recordId?: string
  categoryId?: string
  fileNodeId?: string
  fields: PortfolioArchiveRecordFieldInput[]
}

export interface PortfolioArchiveRecordWriteResultVO {
  recordId: string
  recordStatus: PortfolioArchiveRecordStatusCode
}

export interface PortfolioTodoPageRequest extends QueryDto {
  teacherId?: string
  todoType?: PortfolioTodoTypeCode
}

export interface PortfolioTodoCompleteRequest {
  todoType: PortfolioTodoTypeCode
  refId: string
}

export interface PortfolioTodoSummaryVO {
  todoType: PortfolioTodoTypeCode
  refId: string
  title: string
  summary?: string
  dueTime?: string
  categoryId?: string
  categoryName?: string
  archiveRecordId?: string
  referenceAiTaskId?: string
  updateTime?: string
}

export interface PortfolioCorrectionSubmitRequest {
  teacherId?: string
  archiveRecordId?: string
  categoryId: string
  fieldCode: string
  fieldLabel?: string
  wrongValue?: string
  expectedValue?: string
  reason: string
  evidenceRef?: string
}

export interface PortfolioCorrectionPageRequest extends QueryDto {
  teacherId?: string
  requestStatus?: PortfolioCorrectionRequestStatusCode
}

export interface PortfolioCorrectionSummaryVO {
  id: string
  teacherId: string
  teacherName?: string
  archiveRecordId?: string
  categoryId: string
  categoryName?: string
  fieldCode: string
  fieldLabel?: string
  requestStatus: PortfolioCorrectionRequestStatusCode
  reason: string
  handleOpinion?: string
  createTime?: string
  updateTime?: string
}

export interface PortfolioCorrectionDetailVO {
  id: string
  teacherId: string
  archiveRecordId?: string
  categoryId: string
  categoryName?: string
  fieldCode: string
  fieldLabel?: string
  wrongValue?: string
  expectedValue?: string
  reason: string
  evidenceRef?: string
  sourceType?: PortfolioArchiveRecordSourceTypeCode
  requestStatus: PortfolioCorrectionRequestStatusCode
  handleOpinion?: string
  handledTime?: string
  createTime?: string
  updateTime?: string
}

export interface PortfolioGapMissingFieldVO {
  fieldCode: string
  fieldLabel?: string
  required?: boolean
  readonly?: boolean
  currentValue?: string
  missing?: boolean
}

export interface PortfolioGapTaskDetailVO {
  id: string
  teacherId: string
  categoryId: string
  categoryName?: string
  taskTitle?: string
  taskStatus: PortfolioGapTaskStatusCode
  dueTime?: string
  returnReason?: string
  archiveRecordId?: string
  officialRecordId?: string
  courseCode?: string
  academicYear?: string
  semester?: string
  missingFields: PortfolioGapMissingFieldVO[]
}

export interface PortfolioGapTaskSubmitRequest {
  gapTaskId: string
  teacherId?: string
  fileNodeId?: string
  fields: PortfolioArchiveRecordFieldInput[]
}

export interface PortfolioGapTaskSummaryVO {
  id: string
  teacherId: string
  categoryId: string
  categoryName?: string
  taskTitle?: string
  taskStatus: PortfolioGapTaskStatusCode
  returnReason?: string
  dueTime?: string
  updateTime?: string
}

export interface PortfolioGapTaskPageRequest extends QueryDto {
  teacherId?: string
  departmentId?: string
  taskStatus?: PortfolioGapTaskStatusCode
  openOnly?: boolean
}

export interface PortfolioGapUrgeRequest {
  gapTaskId: string
}

export interface PortfolioCorrectionHandleRequest {
  correctionRequestId: string
  action: PortfolioCorrectionHandleActionCode
  handleOpinion?: string
}

export interface PortfolioEvaluationTeacherNoticeVO {
  id: string
  teacherId: string
  evaluationTaskId: string
  taskTitle?: string
  noticeStatus: PortfolioEvaluationTeacherNoticeStatusCode
  returnReason?: string
  dueTime?: string
  updateTime?: string
}

export interface PortfolioEvaluationTeacherNoticePageRequest extends QueryDto {
  teacherId?: string
  noticeStatus?: PortfolioEvaluationTeacherNoticeStatusCode
  locateNoticeId?: string
}

export interface PortfolioEvaluationTeacherNoticeConfirmRequest {
  noticeId: string
}

export interface PortfolioEvaluationTeacherNoticeReturnRequest {
  noticeId: string
  returnReason: string
  dueTime?: string
}

export interface PortfolioEvaluationMaterialPreviewRequest {
  evaluationTaskId: string
  teacherId?: string
}

export interface PortfolioEvaluationMaterialCategoryItemVO {
  categoryId: string
  categoryName?: string
  completed?: boolean
}

export interface PortfolioEvaluationMaterialPreviewVO {
  evaluationTaskId: string
  taskName?: string
  taskStatus?: string
  startTime?: string
  endTime?: string
  noticeId?: string
  completenessPercent?: number
  requiredCategoryDone?: number
  requiredCategoryTotal?: number
  categories?: PortfolioEvaluationMaterialCategoryItemVO[]
}

export interface PortfolioEvaluationPublicityListRequest {
  evaluationTaskId?: string
  teacherId?: string
}

export interface PortfolioEvaluationPublicityListItemVO {
  publicityId: string
  evaluationTaskId: string
  taskName?: string
  taskStatus?: PortfolioEvaluationTaskStatusCode
  publicityTitle?: string
  publicityStatus: PortfolioEvaluationPublicityStatusCode
  startTime?: string
  endTime?: string
  teacherId?: string
  teacherName?: string
  canSubmitObjection?: boolean
  objectionStatus?: PortfolioEvaluationObjectionStatusCode
  objectionId?: string
  objectionType?: PortfolioEvaluationObjectionTypeCode
  objectionReason?: string
  evidenceRef?: string
  handleOpinion?: string
  handleAction?: PortfolioEvaluationObjectionHandleActionCode
}

export interface PortfolioEvaluationObjectionPageRequest extends QueryDto {
  evaluationTaskId?: string
  teacherId?: string
  objectionStatus?: PortfolioEvaluationObjectionStatusCode
}

export interface PortfolioEvaluationObjectionSummaryVO {
  objectionId: string
  evaluationTaskId: string
  taskName?: string
  publicityId: string
  publicityTitle?: string
  teacherId: string
  teacherName?: string
  objectionType: PortfolioEvaluationObjectionTypeCode
  objectionReason?: string
  evidenceRef?: string
  objectionStatus: PortfolioEvaluationObjectionStatusCode
  handleAction?: PortfolioEvaluationObjectionHandleActionCode
  handleOpinion?: string
  handlerUserId?: string
  handledTime?: string
  createTime?: string
}

export interface PortfolioEvaluationObjectionHandleRequest {
  objectionId: string
  action: PortfolioEvaluationObjectionHandleActionCode
  handleOpinion?: string
  correctedScore?: number
}

export interface PortfolioEvaluationResultSummaryRequest {
  evaluationTaskId: string
  teacherId?: string
}

export interface PortfolioEvaluationTeacherResultEntryVO {
  indicatorCode?: string
  score?: number
  commentText?: string
  evaluatorUserId?: string
}

export interface PortfolioEvaluationTeacherResultSummaryVO {
  evaluationTaskId: string
  taskName?: string
  teacherId: string
  teacherName?: string
  entryCount?: number
  averageScore?: number
  completenessPercent?: number
  requiredCategoryDone?: number
  requiredCategoryTotal?: number
  materialCategories?: PortfolioEvaluationMaterialCategoryItemVO[]
  entries?: PortfolioEvaluationTeacherResultEntryVO[]
}

export interface PortfolioEvaluationPublicityPublishRequest {
  evaluationTaskId: string
  publicityTitle: string
  startTime: string
  endTime: string
}

export interface PortfolioEvaluationObjectionSubmitRequest {
  evaluationTaskId: string
  publicityId: string
  objectionType: PortfolioEvaluationObjectionTypeCode
  objectionReason: string
  evidenceRef?: string
}

export interface PortfolioEvaluationTaskAdvanceRequest {
  taskId: string
  action: PortfolioEvaluationTaskAdvanceActionCode
}

export interface PortfolioMaterialVO {
  id: string
  teacherId: string
  materialType: PortfolioMaterialTypeCode
  materialTitle?: string
  fileNodeId?: string
  categoryCode?: string
  categoryId?: string
  archiveRecordId?: string
  recordStatus?: PortfolioArchiveRecordStatusCode
  intakeStage?: PortfolioMaterialIntakeStageCode
  status?: PortfolioMaterialStatusCode
  ocrStatus?: ArchiveMaterialOcrStatusCode
  ocrFinishedTime?: string
  ocrFailureReason?: string
  providerChain?: string
  /** 重分类未映射字段快照 JSON */
  unmappedFieldSnapshot?: string
}

/**
 * 材料库「重分类」跳转 Intake 路由 query。
 * materialId / recordId / categoryId 分别映射 PortfolioMaterialVO.id / archiveRecordId / categoryId。
 */
export interface PortfolioIntakeReassignRouteQuery {
  teacherId: string
  materialId: string
  recordId?: string
  categoryId?: string
}

export interface PortfolioMaterialSearchRequest extends QueryDto {
  keyword: string
  teacherId?: string
  materialType?: PortfolioMaterialTypeCode
}

export interface PortfolioMaterialSearchResponse {
  materialId: string
  teacherId: string
  materialType: PortfolioMaterialTypeCode
  materialTitle?: string
  fileNodeId?: string
  snippet?: string
}

export interface PortfolioMaterialPageRequest extends QueryDto {
  teacherId?: string
  materialType?: PortfolioMaterialTypeCode
  status?: PortfolioMaterialStatusCode
}

export interface PortfolioMaterialSaveRequest {
  id?: string
  teacherId?: string
  materialType: PortfolioMaterialTypeCode
  materialTitle: string
  fileNodeId: string
  categoryCode?: string
}
