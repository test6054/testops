/**
 * 教学质量评价 API 共享类型 - 对应 edu-quality 模块
 *
 * 后端约束：
 * - 业务写操作与复杂查询使用 POST + DTO；模板下载、公开问卷读取等只读资源可使用 GET；禁止 PUT / DELETE / PATCH
 * - 租户与操作人由 UserHold 注入，前端只传业务字段
 * - 后端 Long ID 全部以 string 表达到前端，避免 JS Number 精度丢失
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import {
  AccreditationTypeCode,
  AccreditationTypeDescription,
  ALL_ACCREDITATION_TYPE_CODES,
} from '@/types/enums/accreditation-type-enum'
import {
  AchievementAuditStatusCode,
  AchievementAuditStatusDescription,
  ALL_ACHIEVEMENT_AUDIT_STATUS_CODES,
} from '@/types/enums/achievement-audit-status-enum'
import {
  AchievementDetailTypeCode,
  AchievementDetailTypeDescription,
  ALL_ACHIEVEMENT_DETAIL_TYPE_CODES,
} from '@/types/enums/achievement-detail-type-enum'
import {
  AchievementStaleSourceTypeCode,
  AchievementStaleSourceTypeDescription,
} from '@/types/enums/achievement-stale-source-type-enum'
import {
  AchievementStatusCode,
  AchievementStatusDescription,
  ALL_ACHIEVEMENT_STATUS_CODES,
} from '@/types/enums/achievement-status-enum'
import {
  AchievementTargetTypeCode,
  AchievementTargetTypeDescription,
  ALL_ACHIEVEMENT_TARGET_TYPE_CODES,
} from '@/types/enums/achievement-target-type-enum'
import {
  AggregationFunctionCode,
  AggregationFunctionDescription,
  ALL_AGGREGATION_FUNCTION_CODES,
} from '@/types/enums/aggregation-function-enum'
import {
  AiHealthStatusCode,
  AiHealthStatusDescription,
  ALL_AI_HEALTH_STATUS_CODES,
} from '@/types/enums/ai-health-status-enum'
import {
  AiManualHandlingStatusCode,
  AiManualHandlingStatusDescription,
  ALL_AI_MANUAL_HANDLING_STATUS_CODES,
} from '@/types/enums/ai-manual-handling-status-enum'
import {
  AiOutputValidationCode,
  AiOutputValidationDescription,
  ALL_AI_OUTPUT_VALIDATION_CODES,
} from '@/types/enums/ai-output-validation-enum'
import {
  AiProviderTypeCode,
  AiProviderTypeDescription,
  ALL_AI_PROVIDER_TYPE_CODES,
} from '@/types/enums/ai-provider-type-enum'
import {
  AiSensitiveCheckStatusCode,
  AiSensitiveCheckStatusDescription,
  ALL_AI_SENSITIVE_CHECK_STATUS_CODES,
} from '@/types/enums/ai-sensitive-check-status-enum'
import {
  AiTaskBusinessTypeCode,
  AiTaskBusinessTypeDescription,
  ALL_AI_TASK_BUSINESS_TYPE_CODES,
} from '@/types/enums/ai-task-business-type-enum'
import {
  AiTaskFailurePhaseCode,
  AiTaskFailurePhaseDescription,
  ALL_AI_TASK_FAILURE_PHASE_CODES,
} from '@/types/enums/ai-task-failure-phase-enum'
import {
  AiTaskShardFailurePhaseCode,
  AiTaskShardFailurePhaseDescription,
  ALL_AI_TASK_SHARD_FAILURE_PHASE_CODES,
} from '@/types/enums/ai-task-shard-failure-phase-enum'
import {
  AiTaskStatusCode,
  AiTaskStatusDescription,
  ALL_AI_TASK_STATUS_CODES,
} from '@/types/enums/ai-task-status-enum'
import {
  AiTaskTypeCode,
  AiTaskTypeDescription,
  ALL_AI_TASK_TYPE_CODES,
} from '@/types/enums/ai-task-type-enum'
import {
  ALL_ARCHIVE_BUSINESS_TYPE_CODES,
  ArchiveBusinessTypeCode,
  ArchiveBusinessTypeDescription,
} from '@/types/enums/archive-business-type-enum'
import {
  ALL_ASSESSMENT_ITEM_TYPE_CODES,
  AssessmentItemTypeCode,
  AssessmentItemTypeDescription,
} from '@/types/enums/assessment-item-type-enum'
import {
  ALL_ASSESSMENT_RATIONALITY_AUDIT_STATUS_CODES,
  AssessmentRationalityAuditStatusCode,
  AssessmentRationalityAuditStatusDescription,
} from '@/types/enums/assessment-rationality-audit-status-enum'
import {
  ALL_AUDIT_ISSUE_STATUS_CODES,
  AuditIssueStatusCode,
  AuditIssueStatusDescription,
} from '@/types/enums/audit-issue-status-enum'
import {
  ALL_AUDIT_RECTIFICATION_STATUS_CODES,
  AuditRectificationStatusCode,
  AuditRectificationStatusDescription,
} from '@/types/enums/audit-rectification-status-enum'
import {
  ALL_AUDIT_SUPERVISION_TYPE_CODES,
  AuditSupervisionTypeCode,
  AuditSupervisionTypeDescription,
} from '@/types/enums/audit-supervision-type-enum'
import {
  ALL_CIVIC_DIMENSION_CODES,
  CivicDimensionCode,
  CivicDimensionDescription,
} from '@/types/enums/civic-dimension-enum'
import {
  ALL_CONFIRMATION_STATUS_CODES,
  ConfirmationStatusCode,
  ConfirmationStatusDescription,
} from '@/types/enums/confirmation-status-enum'
import {
  ALL_DATA_SOURCE_MODE_CODES,
  DataSourceModeCode,
  DataSourceModeDescription,
} from '@/types/enums/data-source-mode-enum'
import {
  ALL_EVALUATION_CYCLE_CODES,
  EvaluationCycleCode,
  EvaluationCycleDescription,
} from '@/types/enums/evaluation-cycle-enum'
import {
  ALL_EVALUATION_METHOD_CODES,
  EvaluationMethodCode,
  EvaluationMethodDescription,
} from '@/types/enums/evaluation-method-enum'
import {
  ALL_EXPERT_PACKAGE_TYPE_CODES,
  ExpertPackageTypeCode,
  ExpertPackageTypeDescription,
} from '@/types/enums/expert-package-type-enum'
import {
  ALL_EXTERNAL_PULL_AUDIT_CHECK_STATUS_CODES,
  ExternalPullAuditCheckStatusCode,
  ExternalPullAuditCheckStatusDescription,
} from '@/types/enums/external-pull-audit-check-status-enum'
import {
  ALL_EXTERNAL_PULL_AUDIT_EVENT_CODES,
  ExternalPullAuditEventCode,
  ExternalPullAuditEventDescription,
} from '@/types/enums/external-pull-audit-event-enum'
import {
  ALL_EXTERNAL_PULL_CONFIRMATION_STATUS_CODES,
  ExternalPullConfirmationStatusCode,
  ExternalPullConfirmationStatusDescription,
} from '@/types/enums/external-pull-confirmation-status-enum'
import {
  ALL_EXTERNAL_PULL_FAILURE_PHASE_CODES,
  ExternalPullFailurePhaseCode,
  ExternalPullFailurePhaseDescription,
} from '@/types/enums/external-pull-failure-phase-enum'
import {
  ALL_EXTERNAL_PULL_TASK_STATUS_CODES,
  ExternalPullTaskStatusCode,
  ExternalPullTaskStatusDescription,
} from '@/types/enums/external-pull-task-status-enum'
import {
  ALL_EXTERNAL_SOURCE_TYPE_CODES,
  ExternalSourceTypeCode,
  ExternalSourceTypeDescription,
} from '@/types/enums/external-source-type-enum'
import {
  ALL_IMPROVEMENT_TASK_STATUS_CODES,
  ImprovementTaskStatusCode,
  ImprovementTaskStatusDescription,
} from '@/types/enums/improvement-task-status-enum'
import {
  ALL_INDIRECT_EVALUATION_FORM_STATUS_CODES,
  IndirectEvaluationFormStatusCode,
  IndirectEvaluationFormStatusDescription,
} from '@/types/enums/indirect-evaluation-form-status-enum'
import {
  ALL_INDIRECT_FORM_ACCESS_MODE_CODES,
  IndirectFormAccessModeCode,
  IndirectFormAccessModeDescription,
} from '@/types/enums/indirect-form-access-mode-enum'
import {
  ALL_INDIRECT_FORM_TYPE_CODES,
  IndirectFormTypeCode,
  IndirectFormTypeDescription,
} from '@/types/enums/indirect-form-type-enum'
import {
  ALL_MANUAL_REVIEW_DECISION_CODES,
  ManualReviewDecisionCode,
  ManualReviewDecisionDescription,
} from '@/types/enums/manual-review-decision-enum'
import {
  ALL_PROCESS_NODE_TYPE_CODES,
  ProcessNodeTypeCode,
  ProcessNodeTypeDescription,
} from '@/types/enums/process-node-type-enum'
import {
  ALL_REPORT_EXPORT_STATUS_CODES,
  ReportExportStatusCode,
  ReportExportStatusDescription,
} from '@/types/enums/report-export-status-enum'
import {
  ALL_REPORT_STATUS_CODES,
  ReportStatusCode,
  ReportStatusDescription,
} from '@/types/enums/report-status-enum'
import {
  ALL_REPORT_TYPE_CODES,
  ReportTypeCode,
  ReportTypeDescription,
} from '@/types/enums/report-type-enum'
import {
  ALL_SCALE_TYPE_CODES,
  ScaleTypeCode,
  ScaleTypeDescription,
} from '@/types/enums/scale-type-enum'
import {
  ALL_SCORE_BATCH_FAILURE_PHASE_CODES,
  ScoreBatchFailurePhaseCode,
  ScoreBatchFailurePhaseDescription,
} from '@/types/enums/score-batch-failure-phase-enum'
import {
  ALL_SCORE_BATCH_STATUS_CODES,
  ScoreBatchStatusCode,
  ScoreBatchStatusDescription,
} from '@/types/enums/score-batch-status-enum'
import {
  ALL_SUPPORT_LEVEL_CODES,
  SupportLevelCode,
  SupportLevelDescription,
} from '@/types/enums/support-level-enum'
import {
  ALL_WORKGROUP_LEVEL_CODES,
  WorkgroupLevelCode,
  WorkgroupLevelDescription,
} from '@/types/enums/workgroup-level-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  AccreditationTypeCode,
  AccreditationTypeDescription,
  AchievementAuditStatusCode,
  AchievementAuditStatusDescription,
  AchievementDetailTypeCode,
  AchievementDetailTypeDescription,
  AchievementStaleSourceTypeCode,
  AchievementStaleSourceTypeDescription,
  AchievementStatusCode,
  AchievementStatusDescription,
  AchievementTargetTypeCode,
  AchievementTargetTypeDescription,
  AggregationFunctionCode,
  AggregationFunctionDescription,
  AiHealthStatusCode,
  AiHealthStatusDescription,
  AiManualHandlingStatusCode,
  AiManualHandlingStatusDescription,
  AiOutputValidationCode,
  AiOutputValidationDescription,
  AiProviderTypeCode,
  AiProviderTypeDescription,
  AiSensitiveCheckStatusCode,
  AiSensitiveCheckStatusDescription,
  AiTaskBusinessTypeCode,
  AiTaskBusinessTypeDescription,
  AiTaskFailurePhaseCode,
  AiTaskFailurePhaseDescription,
  AiTaskShardFailurePhaseCode,
  AiTaskShardFailurePhaseDescription,
  AiTaskStatusCode,
  AiTaskStatusDescription,
  AiTaskTypeCode,
  AiTaskTypeDescription,
  ALL_ACCREDITATION_TYPE_CODES,
  ALL_ACHIEVEMENT_AUDIT_STATUS_CODES,
  ALL_ACHIEVEMENT_DETAIL_TYPE_CODES,
  ALL_ACHIEVEMENT_STATUS_CODES,
  ALL_ACHIEVEMENT_TARGET_TYPE_CODES,
  ALL_AGGREGATION_FUNCTION_CODES,
  ALL_AI_HEALTH_STATUS_CODES,
  ALL_AI_MANUAL_HANDLING_STATUS_CODES,
  ALL_AI_OUTPUT_VALIDATION_CODES,
  ALL_AI_PROVIDER_TYPE_CODES,
  ALL_AI_SENSITIVE_CHECK_STATUS_CODES,
  ALL_AI_TASK_BUSINESS_TYPE_CODES,
  ALL_AI_TASK_FAILURE_PHASE_CODES,
  ALL_AI_TASK_SHARD_FAILURE_PHASE_CODES,
  ALL_AI_TASK_STATUS_CODES,
  ALL_AI_TASK_TYPE_CODES,
  ALL_ARCHIVE_BUSINESS_TYPE_CODES,
  ALL_ASSESSMENT_ITEM_TYPE_CODES,
  ALL_ASSESSMENT_RATIONALITY_AUDIT_STATUS_CODES,
  ALL_AUDIT_ISSUE_STATUS_CODES,
  ALL_AUDIT_RECTIFICATION_STATUS_CODES,
  ALL_AUDIT_SUPERVISION_TYPE_CODES,
  ALL_CIVIC_DIMENSION_CODES,
  ALL_CONFIRMATION_STATUS_CODES,
  ALL_DATA_SOURCE_MODE_CODES,
  ALL_EVALUATION_CYCLE_CODES,
  ALL_EVALUATION_METHOD_CODES,
  ALL_EXPERT_PACKAGE_TYPE_CODES,
  ALL_EXTERNAL_PULL_AUDIT_CHECK_STATUS_CODES,
  ALL_EXTERNAL_PULL_AUDIT_EVENT_CODES,
  ALL_EXTERNAL_PULL_CONFIRMATION_STATUS_CODES,
  ALL_EXTERNAL_PULL_FAILURE_PHASE_CODES,
  ALL_EXTERNAL_PULL_TASK_STATUS_CODES,
  ALL_EXTERNAL_SOURCE_TYPE_CODES,
  ALL_IMPROVEMENT_TASK_STATUS_CODES,
  ALL_INDIRECT_EVALUATION_FORM_STATUS_CODES,
  ALL_INDIRECT_FORM_ACCESS_MODE_CODES,
  ALL_INDIRECT_FORM_TYPE_CODES,
  ALL_MANUAL_REVIEW_DECISION_CODES,
  ALL_PROCESS_NODE_TYPE_CODES,
  ALL_REPORT_EXPORT_STATUS_CODES,
  ALL_REPORT_STATUS_CODES,
  ALL_REPORT_TYPE_CODES,
  ALL_SCALE_TYPE_CODES,
  ALL_SCORE_BATCH_FAILURE_PHASE_CODES,
  ALL_SCORE_BATCH_STATUS_CODES,
  ALL_SUPPORT_LEVEL_CODES,
  ALL_WORKGROUP_LEVEL_CODES,
  ArchiveBusinessTypeCode,
  ArchiveBusinessTypeDescription,
  AssessmentItemTypeCode,
  AssessmentItemTypeDescription,
  AssessmentRationalityAuditStatusCode,
  AssessmentRationalityAuditStatusDescription,
  AuditIssueStatusCode,
  AuditIssueStatusDescription,
  AuditRectificationStatusCode,
  AuditRectificationStatusDescription,
  AuditSupervisionTypeCode,
  AuditSupervisionTypeDescription,
  CivicDimensionCode,
  CivicDimensionDescription,
  ConfirmationStatusCode,
  ConfirmationStatusDescription,
  DataSourceModeCode,
  DataSourceModeDescription,
  EvaluationCycleCode,
  EvaluationCycleDescription,
  EvaluationMethodCode,
  EvaluationMethodDescription,
  ExpertPackageTypeCode,
  ExpertPackageTypeDescription,
  ExternalPullAuditCheckStatusCode,
  ExternalPullAuditCheckStatusDescription,
  ExternalPullAuditEventCode,
  ExternalPullAuditEventDescription,
  ExternalPullConfirmationStatusCode,
  ExternalPullConfirmationStatusDescription,
  ExternalPullFailurePhaseCode,
  ExternalPullFailurePhaseDescription,
  ExternalPullTaskStatusCode,
  ExternalPullTaskStatusDescription,
  ExternalSourceTypeCode,
  ExternalSourceTypeDescription,
  ImprovementTaskStatusCode,
  ImprovementTaskStatusDescription,
  IndirectEvaluationFormStatusCode,
  IndirectEvaluationFormStatusDescription,
  IndirectFormAccessModeCode,
  IndirectFormAccessModeDescription,
  IndirectFormTypeCode,
  IndirectFormTypeDescription,
  ManualReviewDecisionCode,
  ManualReviewDecisionDescription,
  ProcessNodeTypeCode,
  ProcessNodeTypeDescription,
  ReportExportStatusCode,
  ReportExportStatusDescription,
  ReportStatusCode,
  ReportStatusDescription,
  ReportTypeCode,
  ReportTypeDescription,
  ScaleTypeCode,
  ScaleTypeDescription,
  ScoreBatchFailurePhaseCode,
  ScoreBatchFailurePhaseDescription,
  ScoreBatchStatusCode,
  ScoreBatchStatusDescription,
  SupportLevelCode,
  SupportLevelDescription,
  WorkgroupLevelCode,
  WorkgroupLevelDescription,
}

export const ACHIEVEMENT_AUDIT_STATUS_COLOR: Record<AchievementAuditStatusCode, BadgeTone> = {
  [AchievementAuditStatusCode.DRAFT]: 'gray',
  [AchievementAuditStatusCode.CALCULATED]: 'blue',
  [AchievementAuditStatusCode.SUBMITTED]: 'blue',
  [AchievementAuditStatusCode.CONFIRMED]: 'green',
  [AchievementAuditStatusCode.RETURNED]: 'orange',
  [AchievementAuditStatusCode.ARCHIVED]: 'yellow',
}

export const MANUAL_REVIEW_DECISION_COLOR: Record<ManualReviewDecisionCode, BadgeTone> = {
  [ManualReviewDecisionCode.CONFIRMED]: 'green',
  [ManualReviewDecisionCode.RETURNED]: 'orange',
  [ManualReviewDecisionCode.ARCHIVED]: 'yellow',
}

export const ACHIEVEMENT_STATUS_COLOR: Record<AchievementStatusCode, BadgeTone> = {
  [AchievementStatusCode.ACHIEVED]: 'green',
  [AchievementStatusCode.PARTIALLY_ACHIEVED]: 'orange',
  [AchievementStatusCode.NOT_ACHIEVED]: 'red',
  [AchievementStatusCode.INSUFFICIENT_EVIDENCE]: 'gray',
}

export const AI_TASK_STATUS_COLOR: Record<AiTaskStatusCode, BadgeTone> = {
  [AiTaskStatusCode.NOT_STARTED]: 'gray',
  [AiTaskStatusCode.PENDING]: 'gray',
  [AiTaskStatusCode.PROCESSING]: 'blue',
  [AiTaskStatusCode.COMPLETED]: 'green',
  [AiTaskStatusCode.FAILED]: 'red',
  [AiTaskStatusCode.CANCELLED]: 'orange',
}

export const AI_OUTPUT_VALIDATION_COLOR: Record<AiOutputValidationCode, BadgeTone> = {
  [AiOutputValidationCode.PASSED]: 'green',
  [AiOutputValidationCode.REJECTED]: 'red',
  [AiOutputValidationCode.WARN]: 'orange',
}

export const AI_SENSITIVE_CHECK_STATUS_COLOR: Record<AiSensitiveCheckStatusCode, BadgeTone> = {
  [AiSensitiveCheckStatusCode.CLEAN]: 'green',
  [AiSensitiveCheckStatusCode.LEAK_DETECTED]: 'red',
}

export const AI_HEALTH_STATUS_COLOR: Record<AiHealthStatusCode, BadgeTone> = {
  [AiHealthStatusCode.UNKNOWN]: 'gray',
  [AiHealthStatusCode.HEALTHY]: 'green',
  [AiHealthStatusCode.FAILED]: 'red',
}

export const SCORE_BATCH_STATUS_COLOR: Record<ScoreBatchStatusCode, BadgeTone> = {
  [ScoreBatchStatusCode.PENDING]: 'gray',
  [ScoreBatchStatusCode.PARSING]: 'blue',
  [ScoreBatchStatusCode.PREVIEW_READY]: 'orange',
  [ScoreBatchStatusCode.VALIDATED]: 'blue',
  [ScoreBatchStatusCode.CONFIRMED]: 'green',
  [ScoreBatchStatusCode.FAILED]: 'red',
  [ScoreBatchStatusCode.CANCELLED]: 'gray',
}

export const IMPROVEMENT_TASK_STATUS_COLOR: Record<ImprovementTaskStatusCode, BadgeTone> = {
  [ImprovementTaskStatusCode.OPEN]: 'orange',
  [ImprovementTaskStatusCode.IN_PROGRESS]: 'blue',
  [ImprovementTaskStatusCode.SUBMITTED]: 'blue',
  [ImprovementTaskStatusCode.CLOSED]: 'green',
  [ImprovementTaskStatusCode.RETURNED]: 'red',
}

export const IMPROVEMENT_TASK_STATUS_OPTIONS: Array<{ value: ImprovementTaskStatusCode, label: string }>
  = ALL_IMPROVEMENT_TASK_STATUS_CODES.map(value => ({
    value,
    label: strictEnumLabel(ImprovementTaskStatusDescription, value, '改进任务状态'),
  }))

export const REPORT_STATUS_COLOR: Record<ReportStatusCode, BadgeTone> = {
  [ReportStatusCode.DRAFT]: 'gray',
  [ReportStatusCode.SUBMITTED]: 'blue',
  [ReportStatusCode.RETURNED]: 'orange',
  [ReportStatusCode.CONFIRMED]: 'green',
  [ReportStatusCode.ARCHIVED]: 'yellow',
}

export const REPORT_EXPORT_STATUS_COLOR: Record<ReportExportStatusCode, BadgeTone> = {
  [ReportExportStatusCode.IDLE]: 'gray',
  [ReportExportStatusCode.PENDING]: 'blue',
  [ReportExportStatusCode.PROCESSING]: 'blue',
  [ReportExportStatusCode.COMPLETED]: 'green',
  [ReportExportStatusCode.FAILED]: 'red',
}

export const SUPPORT_LEVEL_COLOR: Record<SupportLevelCode, BadgeTone> = {
  [SupportLevelCode.HIGH]: 'red',
  [SupportLevelCode.MEDIUM]: 'orange',
  [SupportLevelCode.LOW]: 'blue',
}

export const SUPPORT_LEVEL_DEFAULT_FACTOR: Record<SupportLevelCode, number> = {
  [SupportLevelCode.HIGH]: 1.0,
  [SupportLevelCode.MEDIUM]: 0.8,
  [SupportLevelCode.LOW]: 0.6,
}

export const AUDIT_ISSUE_STATUS_COLOR: Record<AuditIssueStatusCode, BadgeTone> = {
  [AuditIssueStatusCode.OPEN]: 'orange',
  [AuditIssueStatusCode.IN_RECTIFICATION]: 'blue',
  [AuditIssueStatusCode.RECTIFIED]: 'blue',
  [AuditIssueStatusCode.VERIFIED]: 'purple',
  [AuditIssueStatusCode.CLOSED]: 'green',
}

export const AUDIT_ISSUE_STATUS_OPTIONS: Array<{ value: AuditIssueStatusCode, label: string }>
  = ALL_AUDIT_ISSUE_STATUS_CODES.map(value => ({
    value,
    label: strictEnumLabel(AuditIssueStatusDescription, value, '审核问题状态'),
  }))

export const AUDIT_RECTIFICATION_STATUS_COLOR: Record<AuditRectificationStatusCode, BadgeTone> = {
  [AuditRectificationStatusCode.PLANNED]: 'gray',
  [AuditRectificationStatusCode.IN_PROGRESS]: 'blue',
  [AuditRectificationStatusCode.SUBMITTED]: 'blue',
  [AuditRectificationStatusCode.VERIFIED]: 'purple',
  [AuditRectificationStatusCode.RETURNED]: 'orange',
  [AuditRectificationStatusCode.CLOSED]: 'green',
}

export const AUDIT_RECTIFICATION_STATUS_OPTIONS: Array<{ value: AuditRectificationStatusCode, label: string }>
  = ALL_AUDIT_RECTIFICATION_STATUS_CODES.map(value => ({
    value,
    label: strictEnumLabel(AuditRectificationStatusDescription, value, '整改状态'),
  }))

export const AUDIT_SUPERVISION_TYPE_OPTIONS: Array<{ value: AuditSupervisionTypeCode, label: string }>
  = ALL_AUDIT_SUPERVISION_TYPE_CODES.map(value => ({
    value,
    label: strictEnumLabel(AuditSupervisionTypeDescription, value, '督导类型'),
  }))

export const WORKGROUP_LEVEL_OPTIONS: Array<{ label: string, value: WorkgroupLevelCode }>
  = ALL_WORKGROUP_LEVEL_CODES.map(value => ({
    value,
    label: strictEnumLabel(WorkgroupLevelDescription, value, '工作组层级'),
  }))

export { EXTERNAL_SOURCE_TYPE_OPTIONS } from '@/types/enums/external-source-type-enum'

export const EXTERNAL_PULL_TASK_STATUS_COLOR: Record<ExternalPullTaskStatusCode, BadgeTone> = {
  [ExternalPullTaskStatusCode.PENDING]: 'gray',
  [ExternalPullTaskStatusCode.RUNNING]: 'blue',
  [ExternalPullTaskStatusCode.SUCCEEDED]: 'green',
  [ExternalPullTaskStatusCode.FAILED]: 'red',
  [ExternalPullTaskStatusCode.CANCELLED]: 'orange',
}

export const EXTERNAL_PULL_TASK_STATUS_OPTIONS: Array<{ label: string, value: ExternalPullTaskStatusCode }>
  = ALL_EXTERNAL_PULL_TASK_STATUS_CODES.map(value => ({
    value,
    label: strictEnumLabel(ExternalPullTaskStatusDescription, value, '外部拉取任务状态'),
  }))

export const EXTERNAL_PULL_CONFIRMATION_STATUS_COLOR: Record<ExternalPullConfirmationStatusCode, BadgeTone> = {
  [ExternalPullConfirmationStatusCode.PREVIEW]: 'orange',
  [ExternalPullConfirmationStatusCode.CONFIRMED]: 'green',
  [ExternalPullConfirmationStatusCode.REJECTED]: 'red',
}

/** 过程性评价节点/记录共用确认状态流转表，与后端 ConfirmationStatusEnum.canTransitTo 一致 */
export const CONFIRMATION_STATUS_TRANSIT_MAP: Record<ConfirmationStatusCode, ConfirmationStatusCode[]> = {
  [ConfirmationStatusCode.DRAFT]: [ConfirmationStatusCode.SUBMITTED],
  [ConfirmationStatusCode.SUBMITTED]: [ConfirmationStatusCode.CONFIRMED, ConfirmationStatusCode.RETURNED],
  [ConfirmationStatusCode.RETURNED]: [ConfirmationStatusCode.DRAFT, ConfirmationStatusCode.SUBMITTED],
  [ConfirmationStatusCode.CONFIRMED]: [],
}

export const CONFIRMATION_STATUS_COLOR: Record<ConfirmationStatusCode, BadgeTone> = {
  [ConfirmationStatusCode.DRAFT]: 'gray',
  [ConfirmationStatusCode.SUBMITTED]: 'blue',
  [ConfirmationStatusCode.CONFIRMED]: 'green',
  [ConfirmationStatusCode.RETURNED]: 'orange',
}

export const PROCESS_NODE_TYPE_OPTIONS: Array<{ label: string, value: ProcessNodeTypeCode }>
  = ALL_PROCESS_NODE_TYPE_CODES.map(value => ({
    value,
    label: strictEnumLabel(ProcessNodeTypeDescription, value, '过程节点类型'),
  }))

/** 间接评价应答人类型 - 对应 RespondentTypeEnum */
export {
  formatRespondentType,
  isRespondentType,
  isSystemCollectedRespondentType,
  MANUAL_RESPONDENT_TYPE_OPTIONS,
  RespondentTypeCode,
  RespondentTypeDescription,
} from '@/types/enums/respondent-type-enum'
