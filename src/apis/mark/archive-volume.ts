import type { ArchiveMaterialOcrStatusCode } from './archive-ocr-status'
import type { ArchiveMaterialCatalogTemplateResponse } from '@/apis/mark/archive-platform-template'
import type { ScanWorkOrderStatusCode } from '@/apis/mark/scanner-work-order'
import type { WorkflowBlockingItem } from '@/components/workbench/workflow-readiness/types'
import type { ExtendedAxiosRequestConfig } from '@/config/axios/types'
/**
 * 统一归档卷 API - 对接 edu-mark ArchiveVolumeController
 */
import type { ArchiveAutoCreateFailureCategoryCode } from '@/constants/archive-auto-create-failure-category'
import type { PageResult, QueryDto } from '@/types'
import type { ArchiveAppraisalDecisionCode } from '@/types/enums/archive-appraisal-decision-enum'
import type { ArchiveDestructionDecisionCode } from '@/types/enums/archive-destruction-decision-enum'
import type { ArchiveElectronicOriginalStatusCode } from '@/types/enums/archive-electronic-original-status-enum'
import type { ArchiveEvaluationCampaignResolveMatchKindCode } from '@/types/enums/archive-evaluation-campaign-resolve-match-kind-enum'
import type { ArchiveEvaluationCampaignScopeMatchKindCode } from '@/types/enums/archive-evaluation-campaign-scope-match-kind-enum'
import type { ArchiveEvaluationCampaignStatusCode } from '@/types/enums/archive-evaluation-campaign-status-enum'
import type { ArchiveEvaluationExportModeCode } from '@/types/enums/archive-evaluation-export-mode-enum'
import type { ArchiveExamFormCode } from '@/types/enums/archive-exam-form-enum'
import type { ArchiveMaterialDeliveryModeCode } from '@/types/enums/archive-material-delivery-mode-enum'
import type { ArchiveMaterialMediaTypeCode } from '@/types/enums/archive-material-media-type-enum'
import type { ArchiveMaterialSortRuleCode } from '@/types/enums/archive-material-sort-rule-enum'
import type { ArchiveMaterialSubmissionStatusCode } from '@/types/enums/archive-material-submission-status-enum'
import type { ArchiveMaterialTypeCode } from '@/types/enums/archive-material-type-enum'
import type { ArchivePackageStatusCode } from '@/types/enums/archive-package-status-enum'
import type { ArchiveRemediationDiagnosticCode } from '@/types/enums/archive-remediation-diagnostic-enum'
import type { ArchiveRemediationPriorityCode } from '@/types/enums/archive-remediation-priority-enum'
import type { ArchiveScoreCompletionStatusCode } from '@/types/enums/archive-score-completion-status-enum'
import type { ArchiveScoreSourceCode } from '@/types/enums/archive-score-source-enum'
import type { ArchiveSecurityLevelCode } from '@/types/enums/archive-security-level-enum'
import type { ArchiveSharedMaterialRefTypeCode } from '@/types/enums/archive-shared-material-ref-type-enum'
import type { ArchiveTaskProvenanceCode } from '@/types/enums/archive-task-provenance-enum'
import type { ArchiveVolumeAutoCreatePendingStatusCode } from '@/types/enums/archive-volume-auto-create-pending-status-enum'
import type { ArchiveVolumeEventTypeCode } from '@/types/enums/archive-volume-event-type-enum'
import type { ArchiveVolumeMemberRoleCode } from '@/types/enums/archive-volume-member-role-enum'
import type { ArchiveVolumeMemberSourceCode } from '@/types/enums/archive-volume-member-source-enum'
import type { ArchiveVolumeNavigationChainStatusCode } from '@/types/enums/archive-volume-navigation-chain-status-enum'
import type { ArchiveVolumeRoleCode } from '@/types/enums/archive-volume-role-enum'
import type { ArchiveVolumeSignOffRoleCode } from '@/types/enums/archive-volume-sign-off-role-enum'
import type { ArchiveVolumeSubmitChecklistActionTypeCode } from '@/types/enums/archive-volume-submit-checklist-action-type-enum'
import type { ArchiveVolumeSubmitChecklistDimensionCode } from '@/types/enums/archive-volume-submit-checklist-dimension-enum'
import type { DocumentBusinessSceneCode } from '@/types/enums/document-business-scene-enum'
import type { DocumentMaterialBindingStatusCode } from '@/types/enums/document-material-binding-status-enum'
import type { DocumentOcrPageResultStatusCode } from '@/types/enums/document-ocr-page-result-status-enum'
import type { DocumentOcrTaskStatusCode } from '@/types/enums/document-ocr-task-status-enum'
import type { ExamKindCode } from '@/types/enums/exam-kind-enum'
import type { ExportTaskStatusCode } from '@/types/enums/export-task-status-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'
import {
  ALL_ARCHIVE_ACCESS_STATUS_CODES,
  ArchiveAccessStatusCode,
  ArchiveAccessStatusDescription,
} from '@/types/enums/archive-access-status-enum'
import { ArchiveAppraisalStatusCode } from '@/types/enums/archive-appraisal-status-enum'
import { ArchiveCatalogStatusCode } from '@/types/enums/archive-catalog-status-enum'
import { ArchiveDestructionStatusCode } from '@/types/enums/archive-destruction-status-enum'
import {
  ALL_ARCHIVE_EVALUATION_CAMPAIGN_STATUS_CODES,
  ArchiveEvaluationCampaignStatusDescription,
} from '@/types/enums/archive-evaluation-campaign-status-enum'
import {
  ALL_ARCHIVE_EXAM_FORM_CODES,
  ArchiveExamFormDescription,
} from '@/types/enums/archive-exam-form-enum'
import { ArchiveIntegrityStatusCode } from '@/types/enums/archive-integrity-status-enum'
import {
  ALL_ARCHIVE_MATERIAL_TYPE_CODES,
  ArchiveMaterialTypeDescription,
} from '@/types/enums/archive-material-type-enum'
import {
  ALL_ARCHIVE_REMEDIATION_DIAGNOSTIC_CODES,
  ArchiveRemediationDiagnosticDescription,
} from '@/types/enums/archive-remediation-diagnostic-enum'
import { ArchiveRemediationEvidenceStatusCode } from '@/types/enums/archive-remediation-evidence-status-enum'
import { ArchiveRemediationStatusCode } from '@/types/enums/archive-remediation-status-enum'
import {
  ALL_ARCHIVE_SECURITY_LEVEL_CODES,
  ArchiveSecurityLevelDescription,
} from '@/types/enums/archive-security-level-enum'
import { ArchiveSelfCheckStatusCode } from '@/types/enums/archive-self-check-status-enum'
import { ArchiveTransferStatusCode } from '@/types/enums/archive-transfer-status-enum'
import {
  ALL_ARCHIVE_VOLUME_EVENT_TYPE_CODES,
  ArchiveVolumeEventTypeDescription,
} from '@/types/enums/archive-volume-event-type-enum'
import {
  ALL_ARCHIVE_VOLUME_SOURCE_TYPE_CODES,
  ArchiveVolumeSourceTypeCode,
  ArchiveVolumeSourceTypeDescription,
} from '@/types/enums/archive-volume-source-type-enum'
import { ArchiveVolumeStatusCode } from '@/types/enums/archive-volume-status-enum'
import { ScanBatchQualityFlagCode } from '@/types/enums/scan-batch-quality-flag-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_ARCHIVE_ACCESS_STATUS_CODES,
  ArchiveAccessStatusCode,
  ArchiveAccessStatusDescription,
} from '@/types/enums/archive-access-status-enum'
export {
  ALL_ARCHIVE_APPRAISAL_STATUS_CODES,
  ArchiveAppraisalStatusCode,
  ArchiveAppraisalStatusDescription,
} from '@/types/enums/archive-appraisal-status-enum'
export {
  ALL_ARCHIVE_CATALOG_STATUS_CODES,
  ArchiveCatalogStatusCode,
  ArchiveCatalogStatusDescription,
} from '@/types/enums/archive-catalog-status-enum'
export {
  ALL_ARCHIVE_DESTRUCTION_STATUS_CODES,
  ArchiveDestructionStatusCode,
  ArchiveDestructionStatusDescription,
} from '@/types/enums/archive-destruction-status-enum'
export { ArchiveElectronicOriginalStatusCode } from '@/types/enums/archive-electronic-original-status-enum'
export {
  ALL_ARCHIVE_EVALUATION_CAMPAIGN_STATUS_CODES,
  ArchiveEvaluationCampaignStatusCode,
  ArchiveEvaluationCampaignStatusDescription,
} from '@/types/enums/archive-evaluation-campaign-status-enum'
export {
  ALL_ARCHIVE_EXAM_FORM_CODES,
  ArchiveExamFormCode,
  ArchiveExamFormDescription,
} from '@/types/enums/archive-exam-form-enum'
export {
  ALL_ARCHIVE_INTEGRITY_STATUS_CODES,
  ArchiveIntegrityStatusCode,
  ArchiveIntegrityStatusDescription,
} from '@/types/enums/archive-integrity-status-enum'
export { ArchiveMaterialMediaTypeCode } from '@/types/enums/archive-material-media-type-enum'
export { ArchiveMaterialSortRuleCode } from '@/types/enums/archive-material-sort-rule-enum'
export {
  ALL_ARCHIVE_MATERIAL_SUBMISSION_STATUS_CODES,
  ArchiveMaterialSubmissionStatusCode,
  ArchiveMaterialSubmissionStatusDescription,
} from '@/types/enums/archive-material-submission-status-enum'
export {
  ALL_ARCHIVE_MATERIAL_TYPE_CODES,
  ArchiveMaterialTypeCode,
  ArchiveMaterialTypeDescription,
} from '@/types/enums/archive-material-type-enum'
export {
  ALL_ARCHIVE_REMEDIATION_DIAGNOSTIC_CODES,
  ArchiveRemediationDiagnosticCode,
  ArchiveRemediationDiagnosticDescription,
} from '@/types/enums/archive-remediation-diagnostic-enum'
export {
  ALL_ARCHIVE_REMEDIATION_EVIDENCE_STATUS_CODES,
  ArchiveRemediationEvidenceStatusCode,
  ArchiveRemediationEvidenceStatusDescription,
} from '@/types/enums/archive-remediation-evidence-status-enum'
export { ArchiveRemediationPriorityCode } from '@/types/enums/archive-remediation-priority-enum'
export {
  ArchiveRemediationStatusCode,
  ArchiveRemediationStatusDescription,
} from '@/types/enums/archive-remediation-status-enum'
export {
  ALL_ARCHIVE_SCORE_COMPLETION_STATUS_CODES,
  ArchiveScoreCompletionStatusCode,
  ArchiveScoreCompletionStatusDescription,
} from '@/types/enums/archive-score-completion-status-enum'
export {
  ArchiveScoreSourceCode,
  ArchiveScoreSourceDescription,
} from '@/types/enums/archive-score-source-enum'
export {
  ALL_ARCHIVE_SECURITY_LEVEL_CODES,
  ArchiveSecurityLevelCode,
  ArchiveSecurityLevelDescription,
} from '@/types/enums/archive-security-level-enum'
export {
  ALL_ARCHIVE_SELF_CHECK_STATUS_CODES,
  ArchiveSelfCheckStatusCode,
  ArchiveSelfCheckStatusDescription,
} from '@/types/enums/archive-self-check-status-enum'
export { ArchiveSharedMaterialRefTypeCode } from '@/types/enums/archive-shared-material-ref-type-enum'
export {
  ALL_ARCHIVE_TASK_PROVENANCE_CODES,
  ArchiveTaskProvenanceCode,
  ArchiveTaskProvenanceDescription,
} from '@/types/enums/archive-task-provenance-enum'
export {
  ALL_ARCHIVE_TRANSFER_STATUS_CODES,
  ArchiveTransferStatusCode,
  ArchiveTransferStatusDescription,
} from '@/types/enums/archive-transfer-status-enum'
export {
  ALL_ARCHIVE_VOLUME_EVENT_TYPE_CODES,
  ArchiveVolumeEventTypeCode,
  ArchiveVolumeEventTypeDescription,
} from '@/types/enums/archive-volume-event-type-enum'
export { ArchiveVolumeNavigationChainStatusCode } from '@/types/enums/archive-volume-navigation-chain-status-enum'
export {
  ArchiveVolumeRoleCode,
  ArchiveVolumeRoleDescription,
} from '@/types/enums/archive-volume-role-enum'
export {
  ALL_ARCHIVE_VOLUME_SIGN_OFF_ROLE_CODES,
  ArchiveVolumeSignOffRoleCode,
} from '@/types/enums/archive-volume-sign-off-role-enum'
export {
  ALL_ARCHIVE_VOLUME_SOURCE_TYPE_CODES,
  ArchiveVolumeSourceTypeCode,
  ArchiveVolumeSourceTypeDescription,
} from '@/types/enums/archive-volume-source-type-enum'
export {
  ALL_ARCHIVE_VOLUME_STATUS_CODES,
  ArchiveVolumeStatusCode,
  ArchiveVolumeStatusDescription,
} from '@/types/enums/archive-volume-status-enum'
export { ArchiveVolumeSubmitChecklistActionTypeCode } from '@/types/enums/archive-volume-submit-checklist-action-type-enum'
export {
  ALL_DOCUMENT_BUSINESS_SCENE_CODES,
  DocumentBusinessSceneCode,
  DocumentBusinessSceneDescription,
} from '@/types/enums/document-business-scene-enum'
export {
  ALL_DOCUMENT_MATERIAL_BINDING_STATUS_CODES,
  DocumentMaterialBindingStatusCode,
  DocumentMaterialBindingStatusDescription,
} from '@/types/enums/document-material-binding-status-enum'
export {
  ALL_DOCUMENT_OCR_PAGE_RESULT_STATUS_CODES,
  DocumentOcrPageResultStatusCode,
  DocumentOcrPageResultStatusDescription,
} from '@/types/enums/document-ocr-page-result-status-enum'
export {
  DocumentOcrTaskStatusCode,
  DocumentOcrTaskStatusDescription,
} from '@/types/enums/document-ocr-task-status-enum'
export {
  ALL_EXAM_KIND_CODES,
  ExamKindCode,
  ExamKindDescription,
} from '@/types/enums/exam-kind-enum'

export const ARCHIVE_VOLUME_STATUS_TONE: Record<
  ArchiveVolumeStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ArchiveVolumeStatusCode.DRAFT]: 'gray',
  [ArchiveVolumeStatusCode.COLLECTING]: 'blue',
  [ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING]: 'orange',
  [ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED]: 'purple',
  [ArchiveVolumeStatusCode.SUBMITTED]: 'orange',
  [ArchiveVolumeStatusCode.STORED]: 'green',
  [ArchiveVolumeStatusCode.ARCHIVED_DESTROYED]: 'purple',
}

export const ARCHIVE_VOLUME_SOURCE_TYPE_OPTIONS: Array<{
  value: ArchiveVolumeSourceTypeCode
  label: string
}> = ALL_ARCHIVE_VOLUME_SOURCE_TYPE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ArchiveVolumeSourceTypeDescription, value, '归档卷来源类型'),
}))

export const ARCHIVE_INTEGRITY_STATUS_TONE: Record<
  ArchiveIntegrityStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ArchiveIntegrityStatusCode.UNKNOWN]: 'gray',
  [ArchiveIntegrityStatusCode.CHECKING]: 'blue',
  [ArchiveIntegrityStatusCode.PASSED]: 'green',
  [ArchiveIntegrityStatusCode.FAILED]: 'red',
  [ArchiveIntegrityStatusCode.WAIVED]: 'orange',
}

export const ARCHIVE_VOLUME_SOURCE_TYPE_TONE: Record<
  ArchiveVolumeSourceTypeCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ArchiveVolumeSourceTypeCode.ONLINE_MARKING]: 'blue',
  [ArchiveVolumeSourceTypeCode.OFFLINE_MARKED]: 'orange',
  [ArchiveVolumeSourceTypeCode.HISTORY_IMPORT]: 'gray',
  [ArchiveVolumeSourceTypeCode.RESEARCH_PROJECT]: 'purple',
  [ArchiveVolumeSourceTypeCode.GRADUATION_THESIS]: 'purple',
  [ArchiveVolumeSourceTypeCode.STUDENT_RECORD]: 'green',
}

export const ARCHIVE_TRANSFER_STATUS_TONE: Record<
  ArchiveTransferStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ArchiveTransferStatusCode.NOT_SUBMITTED]: 'gray',
  [ArchiveTransferStatusCode.PENDING_REVIEW]: 'orange',
  [ArchiveTransferStatusCode.APPROVED]: 'green',
  [ArchiveTransferStatusCode.REJECTED]: 'red',
}

export const ARCHIVE_APPRAISAL_STATUS_TONE: Record<
  ArchiveAppraisalStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ArchiveAppraisalStatusCode.NOT_DUE]: 'gray',
  [ArchiveAppraisalStatusCode.REMINDER_SENT]: 'orange',
  [ArchiveAppraisalStatusCode.REQUESTED]: 'blue',
  [ArchiveAppraisalStatusCode.APPROVED]: 'green',
  [ArchiveAppraisalStatusCode.REJECTED]: 'red',
  [ArchiveAppraisalStatusCode.OPINION_RECORDED]: 'purple',
}

export const ARCHIVE_DESTRUCTION_STATUS_TONE: Record<
  ArchiveDestructionStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ArchiveDestructionStatusCode.NONE]: 'gray',
  [ArchiveDestructionStatusCode.REQUESTED]: 'orange',
  [ArchiveDestructionStatusCode.REJECTED]: 'red',
  [ArchiveDestructionStatusCode.APPROVED]: 'blue',
  [ArchiveDestructionStatusCode.EXECUTING]: 'blue',
  [ArchiveDestructionStatusCode.EXECUTED]: 'green',
  [ArchiveDestructionStatusCode.FAILED]: 'red',
  [ArchiveDestructionStatusCode.LEDGER_ARCHIVED]: 'gray',
}

export const ARCHIVE_MATERIAL_TYPE_OPTIONS: Array<{
  value: ArchiveMaterialTypeCode
  label: string
}> = ALL_ARCHIVE_MATERIAL_TYPE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ArchiveMaterialTypeDescription, value, '归档材料类型'),
}))

export const ARCHIVE_REMEDIATION_STATUS_TONE: Record<
  ArchiveRemediationStatusCode,
  'blue' | 'orange' | 'green' | 'red'
> = {
  [ArchiveRemediationStatusCode.OPEN]: 'red',
  [ArchiveRemediationStatusCode.IN_PROGRESS]: 'blue',
  [ArchiveRemediationStatusCode.RESUBMITTED]: 'orange',
  [ArchiveRemediationStatusCode.CLOSED]: 'green',
}

export const ARCHIVE_EVALUATION_CAMPAIGN_STATUS_OPTIONS: Array<{
  value: ArchiveEvaluationCampaignStatusCode
  label: string
}> = ALL_ARCHIVE_EVALUATION_CAMPAIGN_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ArchiveEvaluationCampaignStatusDescription, value, '迎评任务状态'),
}))

export interface ArchiveVolumeResponse {
  volumeId: string
  examId?: string
  relatedExamId?: string
  relatedExamName?: string
  relatedExamNo?: string
  archiveNo: string
  archiveTitle: string
  courseId?: string
  /** 课程名称，详情/列表由 edu-user 课程目录反查 */
  courseName?: string
  departmentId?: string
  departmentName?: string
  teachingClassId?: string
  teachingClassName?: string
  academicYear: string
  semester: SemesterCode
  /** 考核形式 */
  examForm?: ArchiveExamFormCode
  /** 考试性质（考次），ExamKind 枚举码 */
  examKind?: ExamKindCode
  templateSetCode?: string
  /** 目录模板套名称（只读展示） */
  templateSetName?: string
  sourceType: ArchiveVolumeSourceTypeCode
  volumeStatus: ArchiveVolumeStatusCode
  integrityStatus: ArchiveIntegrityStatusCode
  transferStatus: ArchiveTransferStatusCode
  appraisalStatus?: ArchiveAppraisalStatusCode
  destructionStatus?: ArchiveDestructionStatusCode
  scoreSource: ArchiveScoreSourceCode
  securityLevel: ArchiveSecurityLevelCode
  securityLevelUpdatedAt?: string
  securityMarkConfirmedAt?: string
  securityMarkConfirmedUserId?: string
  securityMarkPending?: boolean
  retentionYears?: number
  retentionUntil?: string
  permanentRetention?: boolean
  responsibleUserId?: string
  scoreCompletionStatus: ArchiveScoreCompletionStatusCode
  scoreCompletionTime?: string
  scoreConfirmedUserId?: string
  scoreConfirmedUserNickName?: string
  externalSourceSystem?: string
  externalBusinessNo?: string
  archiveDueTime?: string
  archiveDueReminderLeadDays?: number
  departmentReviewRejectReason?: string
  overdueSubmitReason?: string
  createTime?: string
  fourPropertyStale?: boolean
  submitReady?: boolean
  /** 不可提交时的首条阻塞说明，与 checklist preview 同源 */
  submitBlockHint?: string
  /** 是否存在 OPEN/IN_PROGRESS/RESUBMITTED 整改任务，阻断提交 */
  hasBlockingRemediationForSubmit?: boolean
  /** 是否存在未关闭整改任务 */
  hasOpenRemediationTask?: boolean
  /** 成绩证明是否满足提交前置条件 */
  scoreSubmitReady?: boolean
  /** 线上阅卷归档双门禁是否开放 */
  examGateOpen?: boolean
  /** 成绩证明文件 ID */
  scoreProofFileId?: string
  selfCheckConfirmed?: boolean
  signOffReady?: boolean
  selfCheckReady?: boolean
  requireSelfCheckConfirm?: boolean
  /** 档案柜位合成串（排序用） */
  physicalStorageLocation?: string
  /** 柜位说明 */
  physicalLocationNote?: string
  /** 当前结构化柜位历史 ID，更新时作为客户端旧值 */
  physicalLocationId?: string
  /** 结构化库位：楼宇/库区 */
  physicalBuilding?: string
  /** 结构化库位：房间/库室 */
  physicalRoom?: string
  /** 结构化库位：柜号 */
  physicalCabinet?: string
  /** 结构化库位：层/格位 */
  physicalSlot?: string
  /** 当前用户在卷上的业务角色 */
  volumeRole?: ArchiveVolumeRoleCode
  /** 当前用户是否可提交该卷（列表 capabilities 摘要） */
  canSubmitVolume?: boolean
  /** 当前用户是否可发起院系审核（列表 capabilities 摘要） */
  canRequestDepartmentReview?: boolean
  /** 当前用户是否可审批院系审核（列表 capabilities 摘要） */
  canApproveDepartmentReview?: boolean
  /** 当前用户是否可撤回已通过院系审核（列表 capabilities 摘要） */
  canWithdrawDepartmentReview?: boolean
  /** 当前用户是否可催办该卷（列表 capabilities 摘要，MVR-319） */
  canRemindArchiveDue?: boolean
  /** MVR-329：列表行级鉴定管理能力；与详情 canManageAppraisal / ARCHIVE_ADMIN 同源 */
  canManageAppraisal?: boolean
  /** MVR-333：列表行级移交退回；与 requireTransferRejectPermission 同源 */
  canRejectTransfer?: boolean
  /** 最新待验收移交提交人；MVR-196 批量退回双人制同源 */
  transferSubmitUserId?: string
  /** 租户/院系是否启用院系审核门禁 */
  departmentReviewEnabled?: boolean
  /** 逾期提交是否须填写说明（硬阻断策略） */
  overdueSubmitBlocked?: boolean
}

export interface ArchiveVolumeSearchResponse {
  volumeId: string
  materialId: string
  archiveNo: string
  archiveTitle: string
  materialType: ArchiveMaterialTypeCode
  fileName?: string
  snippet?: string
  studentNo?: string
  studentName?: string
  ocrStatus?: ArchiveMaterialOcrStatusCode
  ocrStatusMessage?: string
  academicYear?: string
  semester?: SemesterCode
  catalogCode?: string
  catalogName?: string
  className?: string
  tags?: string[]
  /** OCR 关键词命中页码；无页级 OCR 绑定时为空 */
  matchPageNo?: number
  /** 当前用户是否可在检索命中后维护该材料 */
  canMaintainMaterial?: boolean
}

export const ARCHIVE_CATALOG_STATUS_TONE: Record<
  ArchiveCatalogStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ArchiveCatalogStatusCode.NOT_STARTED]: 'gray',
  [ArchiveCatalogStatusCode.DRAFT]: 'orange',
  [ArchiveCatalogStatusCode.CONFIRMED]: 'green',
}

export const ARCHIVE_SELF_CHECK_STATUS_TONE: Record<
  ArchiveSelfCheckStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ArchiveSelfCheckStatusCode.NOT_STARTED]: 'gray',
  [ArchiveSelfCheckStatusCode.IN_PROGRESS]: 'blue',
  [ArchiveSelfCheckStatusCode.COMPLETED]: 'green',
}

export type ArchiveVolumeSubmitChecklistPhaseKey
  = 'materials' | 'integrity' | 'catalog' | 'selfCheck' | 'departmentReview' | 'submit'

export const ArchiveVolumeSubmitChecklistPhaseDescription: Record<
  ArchiveVolumeSubmitChecklistPhaseKey,
  string
> = {
  materials: '材料收齐',
  integrity: '完整性自检',
  catalog: '编制目录',
  selfCheck: '自检清单',
  departmentReview: '院系审核',
  submit: '提交移交',
}

export interface ArchiveVolumeSubmitProgressVO {
  checklistPhaseKey: ArchiveVolumeSubmitChecklistPhaseKey
  pendingBlockingCount?: number
  baseReady?: boolean
  submitReady?: boolean
}

export interface ArchiveVolumeNavChainStepVO {
  tabKey: string
  label: string
  chainStatus: ArchiveVolumeNavigationChainStatusCode
  badgeCount?: number
}

export interface ArchiveVolumeNextStepActionVO {
  icon?: string
  label: string
  description: string
  targetTabKey?: string
  /** EVAL_CAMPAIGN | AI_ANALYSIS */
  externalRouteKey?: string
}

export interface ArchiveVolumeLifecycleNodeVO {
  label: string
  nodeStatus: ArchiveVolumeNavigationChainStatusCode
}

export interface ArchiveVolumeNavigationSummaryVO {
  chainSteps: ArchiveVolumeNavChainStepVO[]
  flowChainSteps: ArchiveVolumeNavChainStepVO[]
  nextStepActions: ArchiveVolumeNextStepActionVO[]
  lifecycleNodes: ArchiveVolumeLifecycleNodeVO[]
  pendingAccessCount: number
  completedLifecycleCount: number
  totalLifecycleCount: number
  suggestedTabKey: string
  fourPropertyStale?: boolean
}

export interface ArchiveVolumeDetailResponse {
  volume: ArchiveVolumeResponse
  materials: ArchiveVolumeMaterialResponse[]
  events: ArchiveVolumeEventVO[]
  latestFourPropertyCheck?: ArchiveFourPropertyCheckResponse
  fourPropertyStale?: boolean
  hasOpenRemediationTask?: boolean
  /** 是否存在 OPEN/IN_PROGRESS/RESUBMITTED 整改任务，阻断提交 */
  hasBlockingRemediationForSubmit?: boolean
  /** 最近一次鉴定决议 */
  appraisalDecision?: ArchiveAppraisalDecisionCode
  /** 最近一次鉴定申请人 */
  appraisalRequestUserId?: string
  /** 最近一次销毁申请人 */
  destructionRequestUserId?: string
  /** 最近一次销毁审批人 */
  destructionApproverUserId?: string
  /** 最近一次销毁执行发起人 */
  destructionExecutionUserId?: string
  latestIntegrityCheck?: ArchiveIntegrityCheckResponse
  /** 当前用户是否具备卷材料登记/补交写权限 */
  canManageMaterials?: boolean
  /** 当前用户是否具备 STORED 卷鉴定/销毁管理权限 */
  canManageAppraisal?: boolean
  /** 当前用户是否具备该院系 ARCHIVE_ADMIN 职责 */
  canManageArchiveAdmin?: boolean
  /** MVR-187：可授权材料缺失豁免（ARCHIVE_ADMIN + 收材/开放整改窗口） */
  canWaiveMaterialMissing?: boolean
  /** MVR-187：可登记延迟补交（COLLEGE_COORDINATOR + 收材/开放整改窗口） */
  canAllowMaterialDelay?: boolean
  /** MVR-188：可确认线下成绩完成（DRAFT/COLLECTING + OFFLINE_CONFIRMED 待确认 + 组织/提交/材料管理） */
  canConfirmScoreCompletion?: boolean
  /** 当前用户是否可确认卷密级定密标记 */
  canConfirmSecurityMark?: boolean
  /** 当前用户是否可变更卷密级 */
  canUpdateSecurityLevel?: boolean
  /** MVR-331：可移交验收（TRANSFER_REVIEWER 或 ARCHIVE_ADMIN；与 BE requireTransferReviewer 同源） */
  canReviewTransfer?: boolean
  /** MVR-331：可移交退回（TRANSFER_REVIEWER / COLLEGE_COORDINATOR / ARCHIVE_ADMIN） */
  canRejectTransfer?: boolean
  /** MVR-331：可审批销毁（院系 DESTRUCTION_APPROVER；与 approveDestruction 同源） */
  canApproveDestruction?: boolean
  /** MVR-339：可按协调人管理该卷整改（院系 COLLEGE_COORDINATOR） */
  canManageRemediationAsCoordinator?: boolean
  /** MVR-353：可在该卷新建整改（职责+状态+移交/开放整改互斥；与 createRemediationTask 同源） */
  canCreateRemediationTask?: boolean
  /** 最近一次移交验收记录 */
  latestTransferRecord?: ArchiveVolumeTransferRecordResponse
  /** 当前用户待处理整改任务 */
  viewerRemediationTask?: ArchiveRemediationTaskResponse
  /** 关联考试试题总数 */
  courseObjectiveTotalQuestionCount?: number
  /** 已配置试题-课程目标映射数 */
  courseObjectiveMappedQuestionCount?: number
  /** 是否满足生成课程目标达成报告 */
  courseObjectiveReportReady?: boolean
  /** quality 课程目标总数 */
  courseObjectiveTotalGoalCount?: number
  /** 至少映射一题的 quality 课程目标数 */
  courseObjectiveCoveredGoalCount?: number
  /** 当前查看用户在本卷的业务角色 */
  volumeRole?: ArchiveVolumeRoleCode
  /** 提交清单阶段进度（COLLECTING/SUBMITTED 时有值） */
  submitProgress?: ArchiveVolumeSubmitProgressVO
  /** 编目状态 */
  catalogStatus?: ArchiveCatalogStatusCode
  /** 逐项自查完成度 */
  selfCheckStatus?: ArchiveSelfCheckStatusCode
  /** 详情导航摘要 */
  navigationSummary?: ArchiveVolumeNavigationSummaryVO
  /** 当前用户操作能力 */
  capabilities?: ArchiveVolumeCapabilitiesVO
  /** 协作成员 */
  collaborators?: ArchiveVolumeMemberDisplayVO[]
  /** 能力拒绝提示 */
  capabilityDeniedHint?: string
}

export interface ArchiveVolumeCapabilitiesVO {
  member?: boolean
  canScan?: boolean
  canManageMaterials?: boolean
  /** 是否可解除合用材料跨卷引用（可不在收材窗口，MVR-183） */
  canRemoveSharedMaterialRef?: boolean
  /** 是否可维护材料标签/OCR（可不在收材窗口，MVR-185） */
  canMaintainMaterial?: boolean
  canReviewScanBatches?: boolean
  canEditCatalog?: boolean
  canSelfCheck?: boolean
  canRunIntegrityCheck?: boolean
  canSubmitVolume?: boolean
  canManageCollaborators?: boolean
  canRejectCollection?: boolean
  canRequestDepartmentReview?: boolean
  canApproveDepartmentReview?: boolean
  canWithdrawDepartmentReview?: boolean
  canReviewDepartmentMaterials?: boolean
  canViewDepartmentTasks?: boolean
  canRemindArchiveDue?: boolean
  canUpdateArchiveDueTime?: boolean
  canConfirmDigitalMaterials?: boolean
  canStartCollecting?: boolean
  departmentReviewEnabled?: boolean
}

export interface ArchiveVolumeMemberDisplayVO {
  memberId?: string
  userId?: string
  userName?: string
  loginName?: string
  departmentName?: string
  memberRole?: ArchiveVolumeMemberRoleCode
  memberSource?: ArchiveVolumeMemberSourceCode
  remark?: string
  createTime?: string
}

export interface ArchiveVolumeTransferRecordResponse {
  transferRecordId?: string
  transferStatus?: ArchiveTransferStatusCode
  submitUserId?: string
  submitUserNickName?: string
  submitTime?: string
  reviewerUserId?: string
  reviewerUserNickName?: string
  reviewedTime?: string
  rejectReason?: string
  /** DA/T93 移交信息包文件 ID */
  transferPackageFileId?: string
}

export interface ArchiveVolumeAppraisalFlowRecordResponse {
  eventId?: string
  eventType?: ArchiveVolumeEventTypeCode
  actionLabel?: string
  appraisalStatus?: ArchiveAppraisalStatusCode
  operatorUserId?: string
  operatorNickName?: string
  reason?: string
  occurredAt?: string
}

export interface ArchiveVolumeDestructionFlowRecordResponse {
  eventId?: string
  eventType?: ArchiveVolumeEventTypeCode
  actionLabel?: string
  destructionStatus?: ArchiveDestructionStatusCode
  operatorUserId?: string
  operatorNickName?: string
  reason?: string
  occurredAt?: string
}

export interface ArchiveVolumeMaterialResponse {
  materialId: string
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  requiredFlag?: boolean
  fileId?: string
  fileName?: string
  studentNo?: string
  studentName?: string
  mediaType?: ArchiveMaterialMediaTypeCode
  fileFormat?: string
  submissionStatus?: ArchiveMaterialSubmissionStatusCode
  ocrStatus?: ArchiveMaterialOcrStatusCode
  ocrFailureReason?: string
  tags?: string[]
  deliveryMode?: ArchiveMaterialDeliveryModeCode
  sourceSystem?: string
  electronicOriginalStatus?: string
}

export const ARCHIVE_VOLUME_EVENT_TYPE_OPTIONS: Array<{
  value: ArchiveVolumeEventTypeCode
  label: string
}> = ALL_ARCHIVE_VOLUME_EVENT_TYPE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ArchiveVolumeEventTypeDescription, value, '归档卷事件类型'),
}))

export const ARCHIVE_REMEDIATION_DIAGNOSTIC_CODE_OPTIONS: Array<{
  value: ArchiveRemediationDiagnosticCode
  label: string
}> = ALL_ARCHIVE_REMEDIATION_DIAGNOSTIC_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ArchiveRemediationDiagnosticDescription, value, '补救诊断码'),
}))

export const ARCHIVE_ACCESS_STATUS_TONE: Record<
  ArchiveAccessStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ArchiveAccessStatusCode.PENDING]: 'orange',
  [ArchiveAccessStatusCode.APPROVED]: 'blue',
  [ArchiveAccessStatusCode.REJECTED]: 'red',
  [ArchiveAccessStatusCode.ACTIVE]: 'green',
  [ArchiveAccessStatusCode.EXPIRED]: 'gray',
  [ArchiveAccessStatusCode.CLOSED]: 'gray',
}

export const ARCHIVE_ACCESS_STATUS_OPTIONS: Array<{
  value: ArchiveAccessStatusCode
  label: string
}> = ALL_ARCHIVE_ACCESS_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ArchiveAccessStatusDescription, value, '归档访问状态'),
}))

export const ARCHIVE_SECURITY_LEVEL_OPTIONS: Array<{
  value: ArchiveSecurityLevelCode
  label: string
}> = ALL_ARCHIVE_SECURITY_LEVEL_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ArchiveSecurityLevelDescription, value, '归档密级'),
}))

export const ARCHIVE_EXAM_FORM_OPTIONS: Array<{ value: ArchiveExamFormCode, label: string }>
  = ALL_ARCHIVE_EXAM_FORM_CODES.map((value) => ({
    value,
    label: strictEnumLabel(ArchiveExamFormDescription, value, '考试形式'),
  }))

export interface ArchiveVolumeEventVO {
  eventId: string
  eventType?: ArchiveVolumeEventTypeCode
  operatorUserId?: string
  reason?: string
  beforeStatus?: string
  afterStatus?: string
  createTime?: string
}

export interface ArchiveVolumeStatisticsResponse {
  departmentCompletions: ArchiveDepartmentCompletionVO[]
  missingMaterials: ArchiveMissingMaterialStatVO[]
  overdueVolumeCount: number
}

export interface ArchiveDepartmentCompletionVO {
  departmentId?: string
  departmentName?: string
  totalCount: number
  storedCount: number
  completionRate: number
}

export interface ArchiveMissingMaterialStatVO {
  materialType: ArchiveMaterialTypeCode
  missingVolumeCount: number
}

export interface ArchiveRemediationTaskStatusHistoryVO {
  taskStatus: ArchiveRemediationStatusCode
  operatorUserId?: string
  operatorNickName?: string
  eventTime?: string
  remark?: string
}

export const ARCHIVE_REMEDIATION_EVIDENCE_STATUS_TONE: Record<
  ArchiveRemediationEvidenceStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ArchiveRemediationEvidenceStatusCode.UPLOADED]: 'blue',
  [ArchiveRemediationEvidenceStatusCode.VERIFIED]: 'green',
}

export interface ArchiveRemediationEvidenceResponse {
  evidenceId: string
  taskId?: string
  fileId: string
  fileName: string
  fileSize?: number
  evidenceStatus: ArchiveRemediationEvidenceStatusCode
  createTime?: string
}

export interface ArchiveRemediationTaskResponse {
  taskId: string
  campaignId?: string
  volumeId: string
  taskTitle: string
  taskDescription?: string
  diagnosticCode?: ArchiveRemediationDiagnosticCode
  taskStatus: ArchiveRemediationStatusCode
  taskPriority: ArchiveRemediationPriorityCode
  assigneeUserId?: string
  assigneeNickName?: string
  createUserId?: string
  createUserNickName?: string
  dueTime?: string
  closedTime?: string
  createTime?: string
  verificationComment?: string
  verifiedByUserId?: string
  verifierNickName?: string
  verifiedTime?: string
  statusHistory?: ArchiveRemediationTaskStatusHistoryVO[]
  evidenceItems?: ArchiveRemediationEvidenceResponse[]
  /** MVR-338：可上传证据；与 assertRemediationEvidenceRegisterAllowed 同源 */
  canUploadEvidence?: boolean
  /** MVR-338：可更新任务；与 updateRemediationTask 写闸同源 */
  canUpdateTask?: boolean
  /** MVR-338：可按协调人维护；院系 COLLEGE_COORDINATOR 且未关闭 */
  canManageAsCoordinator?: boolean
  /** MVR-338：可复检关闭；协调人 + RESUBMITTED + 非责任人 */
  canCloseWithVerification?: boolean
}

export interface ArchiveRemediationTaskUpdateRequest {
  taskId: string
  taskTitle?: string
  taskDescription?: string
  diagnosticCode?: ArchiveRemediationDiagnosticCode
  taskStatus?: ArchiveRemediationStatusCode
  assigneeUserId?: string
  dueTime?: string
  verificationComment?: string
}

export interface ArchiveEvaluationCampaignResponse {
  campaignId: string
  campaignName: string
  academicYear?: string
  semester?: SemesterCode
  campaignStatus: ArchiveEvaluationCampaignStatusCode
  startTime?: string
  endTime?: string
  description?: string
  totalVolumeCount?: number
  readyVolumeCount?: number
  readinessRatePercent?: number
  openRemediationTaskCount?: number
}

export interface ArchiveEvaluationVolumeReadinessResponse {
  volumeId: string
  archiveNo?: string
  archiveTitle?: string
  teachingClassName?: string
  catalogReady?: boolean
  integrityReady?: boolean
  fourPropertyReady?: boolean
  transferReady?: boolean
  overallReady?: boolean
  hasDomainOpenRemediation?: boolean
  openRemediationTaskCount?: number
  primaryOpenRemediationTaskId?: string
  scopeMatchKind?: ArchiveEvaluationCampaignScopeMatchKindCode
}

export interface ArchiveVolumePageRequest extends QueryDto {
  keyword?: string
  departmentId?: string
  courseId?: string
  examId?: string
  academicYear?: string
  semester?: SemesterCode
  sourceType?: ArchiveVolumeSourceTypeCode
  volumeStatus?: ArchiveVolumeStatusCode
  integrityStatus?: ArchiveIntegrityStatusCode
  transferStatus?: ArchiveTransferStatusCode
  appraisalStatus?: ArchiveAppraisalStatusCode
  /** 到期鉴定 Tab：已提醒或保管期已到且仍为未到期状态的卷 */
  dueAppraisalOnly?: boolean
  destructionStatus?: ArchiveDestructionStatusCode
  scoreCompletionStatus?: ArchiveScoreCompletionStatusCode
  mineOnly?: boolean
  integrityFailedOnly?: boolean
  archiveOverdueOnly?: boolean
  delaySubmissionOverdueOnly?: boolean
  excludeVolumeStatus?: ArchiveVolumeStatusCode
  archiveDueSoonOnly?: boolean
  openRemediationTaskOnly?: boolean
  canSubmitOnly?: boolean
  catalogPendingOnly?: boolean
  /** 收材阶段：COLLECTING、DEPARTMENT_REVIEW_PENDING、DEPARTMENT_REVIEWED */
  collectingPhaseOnly?: boolean
  /** 排除自动建卷失败诊断 stub（departmentId 为空的占位卷） */
  excludeAutoCreateFailureStub?: boolean
}

export interface ArchiveVolumeSearchRequest extends QueryDto {
  keyword?: string
  volumeId?: string
  examId?: string
  studentNo?: string
  studentNameKeyword?: string
  ocrStatus?: ArchiveMaterialOcrStatusCode
  materialType?: ArchiveMaterialTypeCode
  academicYear?: string
  semester?: SemesterCode
  departmentId?: string
  courseId?: string
  catalogCode?: string
  catalogNameKeyword?: string
  tagAny?: string[]
  fileNameKeyword?: string
  archiveKeyword?: string
  classNameKeyword?: string
}

export interface ArchiveVolumeMaterialSearchCriteria {
  keyword?: string
  volumeId?: string
  examId?: string
  studentNo?: string
  studentNameKeyword?: string
  ocrStatus?: ArchiveMaterialOcrStatusCode
  materialType?: ArchiveMaterialTypeCode
  academicYear?: string
  semester?: SemesterCode
  departmentId?: string
  courseId?: string
  catalogCode?: string
  catalogNameKeyword?: string
  fileNameKeyword?: string
  archiveKeyword?: string
  classNameKeyword?: string
  tagAny?: string[]
}

export interface ArchiveVolumeMaterialSearchProfileResponse {
  profileId: string
  profileName: string
  sharedFlag: boolean
  ownedByCurrentUser: boolean
  ownerUserId: string
  criteria: ArchiveVolumeMaterialSearchCriteria
  updateTime?: string
}

export interface ArchiveVolumeMaterialSearchProfileSaveRequest {
  profileId?: string
  profileName: string
  sharedFlag: boolean
  criteria: ArchiveVolumeMaterialSearchCriteria
}

export interface ArchiveVolumeStatisticsRequest {
  academicYear?: string
  semester?: SemesterCode
  departmentId?: string
}

export function pageArchiveVolumes(
  request: ArchiveVolumePageRequest,
): Promise<PageResult<ArchiveVolumeResponse>> {
  return http.post<PageResult<ArchiveVolumeResponse>>('/api/mark/archive-volumes/page', request)
}

export function searchArchiveVolumes(
  request: ArchiveVolumeSearchRequest,
): Promise<ArchiveVolumeSearchPageResult> {
  return http.post<ArchiveVolumeSearchPageResult>('/api/mark/archive-volumes/search', request)
}

export interface ArchiveVolumeSearchPageResult extends PageResult<ArchiveVolumeSearchResponse> {
  hitVolumeCount?: number
}

export interface ArchiveMaterialSearchAuditPageRequest extends QueryDto {
  departmentId?: string
  searcherUserId?: string
}

export interface ArchiveMaterialSearchAuditRowResponse {
  auditId?: string
  searcherUserId?: string
  searcherNickName?: string
  searcherIdentifier?: string
  keywordHash?: string
  criteriaSummary?: string
  criteriaPayload?: string
  hitDepartmentNames?: string
  hitCount?: number
  hitVolumeCount?: number
  visibilityPaths?: string
  createTime?: string
}

export function pageMaterialSearchAudit(
  request: ArchiveMaterialSearchAuditPageRequest,
): Promise<PageResult<ArchiveMaterialSearchAuditRowResponse>> {
  return http.post<PageResult<ArchiveMaterialSearchAuditRowResponse>>(
    '/api/mark/archive-volumes/search/audit/page',
    request,
  )
}

export function listArchiveVolumeSearchProfiles(): Promise<
  ArchiveVolumeMaterialSearchProfileResponse[]
> {
  return http.post<ArchiveVolumeMaterialSearchProfileResponse[]>(
    '/api/mark/archive-volumes/search/profiles/list',
    {},
  )
}

export function saveArchiveVolumeSearchProfile(
  request: ArchiveVolumeMaterialSearchProfileSaveRequest,
): Promise<ArchiveVolumeMaterialSearchProfileResponse> {
  return http.post<ArchiveVolumeMaterialSearchProfileResponse>(
    '/api/mark/archive-volumes/search/profiles/save',
    request,
  )
}

export function deleteArchiveVolumeSearchProfile(profileId: string): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/search/profiles/delete', { profileId })
}

export interface ArchiveVolumeMaterialTagUpdateRequest {
  materialId: string
  tags: string[]
}

export function updateArchiveVolumeMaterialTags(
  request: ArchiveVolumeMaterialTagUpdateRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/materials/tags/update', request)
}

export interface ArchiveVolumeMaterialTagSuggestRequest {
  keyword?: string
  limit?: number
  /** 卷内标签建议须传；跨卷检索筛选不传 */
  volumeId?: string
  /** 检索筛选用 true；卷内登记用 false（默认） */
  searchScopeOnly?: boolean
}

export function suggestArchiveVolumeMaterialTags(
  request: ArchiveVolumeMaterialTagSuggestRequest = {},
): Promise<string[]> {
  return http.post<string[]>('/api/mark/archive-volumes/materials/tags/suggest', request)
}

export function getArchiveVolumeDetail(
  volumeId: string,
  config?: ExtendedAxiosRequestConfig,
): Promise<ArchiveVolumeDetailResponse> {
  return http.post<ArchiveVolumeDetailResponse>(
    '/api/mark/archive-volumes/detail',
    { volumeId },
    config,
  )
}

export interface ArchiveVolumeMaterialPageRequest extends QueryDto {
  volumeId: string
  catalogKey?: string
  materialType?: ArchiveMaterialTypeCode
  materialTypes?: ArchiveMaterialTypeCode[]
  ocrOverviewOnly?: boolean
}

export interface ArchiveVolumeMaterialStatsRequest {
  volumeId: string
}

export interface ArchiveVolumeMaterialReadySummaryVO {
  totalCount: number
  readyCount: number
}

export interface ArchiveVolumeMaterialCatalogReadySummaryVO {
  catalogKey: string
  totalCount: number
  readyCount: number
}

export interface ArchiveVolumeMaterialOcrOverviewStatsVO {
  searchableTotal: number
  pendingOcrCount: number
  activeOcrCount: number
}

export interface ArchiveVolumeMaterialStatsResponse {
  volumeSummary: ArchiveVolumeMaterialReadySummaryVO
  catalogSummaries: ArchiveVolumeMaterialCatalogReadySummaryVO[]
  ocrOverview: ArchiveVolumeMaterialOcrOverviewStatsVO
}

export function pageArchiveVolumeMaterials(
  request: ArchiveVolumeMaterialPageRequest,
): Promise<PageResult<ArchiveVolumeMaterialResponse>> {
  return http.post<PageResult<ArchiveVolumeMaterialResponse>>(
    '/api/mark/archive-volumes/materials/page',
    request,
  )
}

export function getArchiveVolumeMaterialStats(
  request: ArchiveVolumeMaterialStatsRequest,
): Promise<ArchiveVolumeMaterialStatsResponse> {
  return http.post<ArchiveVolumeMaterialStatsResponse>(
    '/api/mark/archive-volumes/materials/stats',
    request,
  )
}

export interface ArchiveVolumeMaterialBatchOcrTriggerResponse {
  triggeredCount: number
}

export function batchTriggerArchiveVolumeMaterialOcr(
  volumeId: string,
): Promise<ArchiveVolumeMaterialBatchOcrTriggerResponse> {
  return http.post<ArchiveVolumeMaterialBatchOcrTriggerResponse>(
    '/api/mark/archive-volumes/materials/ocr/batch-trigger',
    { volumeId },
  )
}

export interface ArchiveVolumeMemberAddRequest {
  volumeId: string
  userId: string
  memberRole: ArchiveVolumeMemberRoleCode
  remark?: string
}

export interface ArchiveVolumeMemberRemoveRequest {
  volumeId: string
  memberId: string
}

export interface ArchiveVolumeCollectionRejectRequest {
  volumeId: string
  rejectReason: string
}

export function addArchiveVolumeMember(
  request: ArchiveVolumeMemberAddRequest,
): Promise<ArchiveVolumeMemberDisplayVO> {
  return http.post<ArchiveVolumeMemberDisplayVO>('/api/mark/archive-volumes/members/add', request)
}

export function removeArchiveVolumeMember(
  request: ArchiveVolumeMemberRemoveRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/members/remove', request)
}

export function rejectArchiveVolumeCollection(
  request: ArchiveVolumeCollectionRejectRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>('/api/mark/archive-volumes/collection/reject', request)
}

export function pageSupervisionArchiveVolumes(
  request: ArchiveVolumePageRequest,
): Promise<PageResult<ArchiveVolumeResponse>> {
  return http.post<PageResult<ArchiveVolumeResponse>>(
    '/api/mark/archive-volumes/supervision/volumes/page',
    request,
  )
}

export function getSupervisionArchiveVolumeDetail(
  volumeId: string,
): Promise<ArchiveVolumeDetailResponse> {
  return http.post<ArchiveVolumeDetailResponse>(
    '/api/mark/archive-volumes/supervision/volumes/detail',
    {
      volumeId,
    },
  )
}

export function pageSupervisionRemediationTasks(
  request: ArchiveRemediationTaskPageRequest,
): Promise<PageResult<ArchiveRemediationTaskResponse>> {
  return http.post<PageResult<ArchiveRemediationTaskResponse>>(
    '/api/mark/archive-volumes/supervision/remediation/page',
    request,
  )
}

export function pageSupervisionCampaigns(
  request: ArchiveEvaluationCampaignPageRequest,
): Promise<PageResult<ArchiveEvaluationCampaignResponse>> {
  return http.post<PageResult<ArchiveEvaluationCampaignResponse>>(
    '/api/mark/archive-volumes/supervision/campaign/page',
    request,
  )
}

export function getSupervisionCampaign(
  campaignId: string,
): Promise<ArchiveEvaluationCampaignResponse> {
  return http.post<ArchiveEvaluationCampaignResponse>(
    '/api/mark/archive-volumes/supervision/campaign/get',
    { campaignId },
  )
}

export function pageEvaluationCampaigns(
  request: ArchiveEvaluationCampaignPageRequest,
): Promise<PageResult<ArchiveEvaluationCampaignResponse>> {
  return http.post<PageResult<ArchiveEvaluationCampaignResponse>>(
    '/api/mark/archive-volumes/evaluation/campaign/page',
    request,
  )
}

export function getEvaluationCampaign(
  campaignId: string,
): Promise<ArchiveEvaluationCampaignResponse> {
  return http.post<ArchiveEvaluationCampaignResponse>(
    '/api/mark/archive-volumes/evaluation/campaign/get',
    { campaignId },
  )
}

export interface ArchiveEvaluationCampaignStatsVO {
  campaignCount: number
  activeCampaignCount: number
  totalVolumeCount: number
  readyVolumeCount: number
  readinessRatePercent: number
}

export function getEvaluationCampaignStats(): Promise<ArchiveEvaluationCampaignStatsVO> {
  return http.post<ArchiveEvaluationCampaignStatsVO>(
    '/api/mark/archive-volumes/evaluation/campaign/stats',
    {},
  )
}

export interface ArchiveRemediationTaskPageRequest extends QueryDto {}

export interface ArchiveEvaluationCampaignPageRequest extends QueryDto {}

export interface ArchiveRemediationByCampaignPageRequest extends QueryDto {
  campaignId: string
  taskStatus?: ArchiveRemediationStatusCode
  taskPriority?: ArchiveRemediationPriorityCode
}

export interface ArchiveReadinessMatrixPreviewPageRequest extends QueryDto {
  endAcademicYear: string
  endSemester: SemesterCode
  departmentId?: string
}

export interface ArchiveReadinessMatrixPreviewRowVO {
  departmentId?: string
  departmentName?: string
  courseId?: string
  courseName?: string
  storedRate: number
  storedCount: number
  totalVolumeCount: number
  integrityPassRate: number
  fourPropertyPassRate: number
}

export interface ArchiveReadinessMatrixPreviewStatsVO {
  rowCount: number
  averageStoredRate: number
}

export function getSupervisionReadinessMatrixPreviewStats(
  request: ArchiveReadinessMatrixPreviewPageRequest,
): Promise<ArchiveReadinessMatrixPreviewStatsVO> {
  return http.post<ArchiveReadinessMatrixPreviewStatsVO>(
    '/api/mark/archive-volumes/supervision/readiness-matrix/preview/stats',
    request,
  )
}

export function pageSupervisionReadinessMatrixPreview(
  request: ArchiveReadinessMatrixPreviewPageRequest,
): Promise<PageResult<ArchiveReadinessMatrixPreviewRowVO>> {
  return http.post<PageResult<ArchiveReadinessMatrixPreviewRowVO>>(
    '/api/mark/archive-volumes/supervision/readiness-matrix/preview/page',
    request,
  )
}

export interface ArchiveEvaluationCampaignReadinessPanelRequest extends QueryDto {
  campaignId: string
  onlyOpenRemediation?: boolean
  volumeId?: string
}

export interface ArchiveEvaluationCampaignScopeSummaryVO {
  totalVolumeCount: number
  readyVolumeCount: number
  readinessRatePercent: number
}

export interface ArchiveEvaluationCampaignReadinessPanelResponse {
  scopeSummary: ArchiveEvaluationCampaignScopeSummaryVO
  volumePage: PageResult<ArchiveEvaluationVolumeReadinessResponse>
}

export function getEvaluationCampaignReadinessPanel(
  request: ArchiveEvaluationCampaignReadinessPanelRequest,
): Promise<ArchiveEvaluationCampaignReadinessPanelResponse> {
  return http.post<ArchiveEvaluationCampaignReadinessPanelResponse>(
    '/api/mark/archive-volumes/evaluation/campaign/readiness-panel',
    request,
  )
}

export interface ArchiveEvaluationCampaignResolveByVolumeRequest {
  volumeId: string
}

export interface ArchiveEvaluationCampaignResolveItemVO {
  campaignId: string
  campaignName: string
  endTime?: string
}

export interface ArchiveEvaluationCampaignResolveByVolumeResponse {
  campaigns: ArchiveEvaluationCampaignResolveItemVO[]
  truncated: boolean
  suggestedCampaignId?: string
  matchedBy: ArchiveEvaluationCampaignResolveMatchKindCode
}

export function resolveEvaluationCampaignByVolume(
  request: ArchiveEvaluationCampaignResolveByVolumeRequest,
): Promise<ArchiveEvaluationCampaignResolveByVolumeResponse> {
  return http.post<ArchiveEvaluationCampaignResolveByVolumeResponse>(
    '/api/mark/archive-volumes/evaluation/campaign/resolve-by-volume',
    request,
  )
}

export function getRemediationTask(taskId: string): Promise<ArchiveRemediationTaskResponse> {
  return http.post<ArchiveRemediationTaskResponse>('/api/mark/archive-volumes/remediation/detail', {
    taskId,
  })
}

export function getSupervisionRemediationTask(
  taskId: string,
): Promise<ArchiveRemediationTaskResponse> {
  return http.post<ArchiveRemediationTaskResponse>(
    '/api/mark/archive-volumes/supervision/remediation/detail',
    { taskId },
  )
}

export function pageRemediationTasksByCampaign(
  request: ArchiveRemediationByCampaignPageRequest,
): Promise<PageResult<ArchiveRemediationTaskResponse>> {
  return http.post<PageResult<ArchiveRemediationTaskResponse>>(
    '/api/mark/archive-volumes/remediation/page-by-campaign',
    request,
  )
}

export function updateRemediationTask(
  request: ArchiveRemediationTaskUpdateRequest,
): Promise<ArchiveRemediationTaskResponse> {
  return http.post<ArchiveRemediationTaskResponse>(
    '/api/mark/archive-volumes/remediation/update',
    request,
  )
}

export interface ArchiveRemediationEvidenceRegisterRequest {
  taskId: string
  fileId: string
}

export function registerRemediationEvidence(
  request: ArchiveRemediationEvidenceRegisterRequest,
): Promise<ArchiveRemediationEvidenceResponse> {
  return http.post<ArchiveRemediationEvidenceResponse>(
    '/api/mark/archive-volumes/remediation/evidence/register',
    request,
  )
}

export interface ArchiveRemediationTaskCreateRequest {
  campaignId?: string
  volumeId: string
  taskTitle: string
  taskDescription?: string
  diagnosticCode?: string
  assigneeUserId: string
  dueTime?: string
}

export function createRemediationTask(
  request: ArchiveRemediationTaskCreateRequest,
): Promise<ArchiveRemediationTaskResponse> {
  return http.post<ArchiveRemediationTaskResponse>(
    '/api/mark/archive-volumes/remediation/create',
    request,
  )
}

export function pageOpenRemediationTasks(
  request: ArchiveRemediationTaskPageRequest,
): Promise<PageResult<ArchiveRemediationTaskResponse>> {
  return http.post<PageResult<ArchiveRemediationTaskResponse>>(
    '/api/mark/archive-volumes/remediation/page',
    request,
  )
}

export interface ArchiveRemediationOpenStatsVO {
  openTaskCount: number
  /** MVR-339：可创建整改任务（任一 COLLEGE_COORDINATOR） */
  canCreateRemediationTask?: boolean
  /** MVR-339：可查看迎评整改 Tab */
  canViewRemediationTab?: boolean
}

export function getOpenRemediationStats(): Promise<ArchiveRemediationOpenStatsVO> {
  return http.post<ArchiveRemediationOpenStatsVO>('/api/mark/archive-volumes/remediation/stats', {})
}

export interface ArchiveRemediationByCampaignStatsRequest {
  campaignId: string
}

export interface ArchiveRemediationByCampaignStatsVO {
  totalTaskCount: number
  openTaskCount: number
  inProgressTaskCount: number
  resubmittedTaskCount: number
  closedTaskCount: number
  highPriorityTaskCount: number
  mediumPriorityTaskCount: number
  lowPriorityTaskCount: number
  overdueTaskCount: number
  dueSoonTaskCount: number
}

export function getRemediationStatsByCampaign(
  request: ArchiveRemediationByCampaignStatsRequest,
): Promise<ArchiveRemediationByCampaignStatsVO> {
  return http.post<ArchiveRemediationByCampaignStatsVO>(
    '/api/mark/archive-volumes/remediation/stats-by-campaign',
    request,
  )
}

export function getSupervisionRemediationStats(): Promise<ArchiveRemediationOpenStatsVO> {
  return http.post<ArchiveRemediationOpenStatsVO>(
    '/api/mark/archive-volumes/supervision/remediation/stats',
    {},
  )
}

export function getSupervisionRemediationStatsByCampaign(
  request: ArchiveRemediationByCampaignStatsRequest,
): Promise<ArchiveRemediationByCampaignStatsVO> {
  return http.post<ArchiveRemediationByCampaignStatsVO>(
    '/api/mark/archive-volumes/supervision/remediation/stats-by-campaign',
    request,
  )
}

export interface ArchiveSupervisionVolumeStatsVO {
  supervisionVolumeCount: number
}

export function getSupervisionVolumeStats(): Promise<ArchiveSupervisionVolumeStatsVO> {
  return http.post<ArchiveSupervisionVolumeStatsVO>(
    '/api/mark/archive-volumes/supervision/volumes/stats',
    {},
  )
}

export function remindArchiveDue(volumeId: string): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/remind', { volumeId })
}

export interface ArchiveVolumeTaskSettingsUpdateRequest {
  volumeId: string
  archiveTitle: string
  /** 空表示保持原编号 */
  archiveNo?: string
  courseId: string
  teachingClassId: string
  departmentId: string
  academicYear: string
  semester: SemesterCode
  /** null 表示清除关联考试 */
  relatedExamId?: string | null
  templateSetCode: string
  scoreSource: ArchiveScoreSourceCode
  examForm?: ArchiveExamFormCode | null
  securityLevel: ArchiveSecurityLevelCode
  retentionYears?: number
  permanentRetention?: boolean
  responsibleUserId: string
  /** 改截止时用于乐观锁；原值为空时传 null */
  expectedArchiveDueTime?: string | null
  archiveDueTime: string
  /** 截止相对 expected 变化时必填 */
  reason?: string
}

export interface ArchiveVolumeStartCollectingCheckItem {
  itemKey: string
  label: string
  required: boolean
  ready: boolean
  message: string
  /** 可跳转页签：task-settings / collaborators / materials */
  actionTab?: string | null
}

export interface ArchiveVolumeStartCollectingPrecheckResponse {
  canStart: boolean
  passedRequired: boolean
  items: ArchiveVolumeStartCollectingCheckItem[]
  templateSetName?: string
  examForm?: ArchiveExamFormCode
  templateDescription?: string
  requiredCatalogCount?: number
  optionalCatalogCount?: number
  selfCheckItemCount?: number
  catalogPreviewItems?: ArchiveMaterialCatalogTemplateResponse[]
}

export function updateArchiveVolumeTaskSettings(
  request: ArchiveVolumeTaskSettingsUpdateRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>('/api/mark/archive-volumes/task-settings/update', request)
}

export interface ArchiveEvaluationCampaignSaveRequest {
  campaignId?: string
  campaignName: string
  academicYear?: string
  semester?: SemesterCode
  campaignStatus: ArchiveEvaluationCampaignStatusCode
  startTime?: string
  endTime?: string
  description?: string
}

export function saveEvaluationCampaign(
  request: ArchiveEvaluationCampaignSaveRequest,
): Promise<ArchiveEvaluationCampaignResponse> {
  return http.post<ArchiveEvaluationCampaignResponse>(
    '/api/mark/archive-volumes/evaluation/campaign/save',
    request,
  )
}

export interface ArchiveEvaluationExportResponse {
  exportFileId?: string
  exportFileName?: string
  exportFileSize?: number
  volumeCount?: number
  exportMode?: ArchiveEvaluationExportModeCode
  taskId?: string
  status?: ExportTaskStatusCode
  pollUrl?: string
}

export interface ArchiveEvaluationExportProgressResponse {
  taskId: string
  status: ExportTaskStatusCode
  exportFileId?: string
  exportFileName?: string
  exportFileSize?: number
  volumeCount?: number
  errorMessage?: string
}

export interface ArchiveEvaluationExportProgressRequest {
  taskId: string
}

export interface ArchiveEvaluationExportCancelRequest {
  taskId: string
}

/** 评估材料包导出范围说明（与后端 resolveCampaignExportVolumeIds 一致） */
export const ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT
  = '含本批次学年学期内已提交/已入库/收集中卷（整改任务关联的收集中卷已包含在内；不含线上阅卷自动建卷失败诊断卷）'

export function exportEvaluationPackage(
  campaignId: string,
): Promise<ArchiveEvaluationExportResponse> {
  return http.post<ArchiveEvaluationExportResponse>('/api/mark/archive-volumes/evaluation/export', {
    campaignId,
  })
}

export function exportEvaluationArchivePackage(
  campaignId: string,
): Promise<ArchiveEvaluationExportResponse> {
  return http.post<ArchiveEvaluationExportResponse>(
    '/api/mark/archive-volumes/evaluation/export-archive',
    { campaignId },
  )
}

export function getEvaluationExportProgress(
  request: ArchiveEvaluationExportProgressRequest,
): Promise<ArchiveEvaluationExportProgressResponse> {
  return http.post<ArchiveEvaluationExportProgressResponse>(
    '/api/mark/archive-volumes/evaluation/export-progress/get',
    request,
  )
}

export function cancelEvaluationExport(
  request: ArchiveEvaluationExportCancelRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/evaluation/export/cancel', request)
}

export interface ArchiveReadinessMatrixRequest {
  endAcademicYear: string
  endSemester: SemesterCode
  termCount?: number
  departmentId?: string
  campaignId?: string
}

export interface ArchiveReadinessTermColumnVO {
  academicYear: string
  semester: SemesterCode
}

export interface ArchiveReadinessCellVO {
  academicYear: string
  semester: SemesterCode
  totalVolumeCount: number
  collectingCount: number
  submittedCount: number
  storedCount: number
  storedRate: number
  integrityFailedRate: number
  fourPropertyPassedRate: number
}

export interface ArchiveReadinessMatrixRowVO {
  departmentId?: string
  departmentName?: string
  courseId?: string
  courseName?: string
  cells: ArchiveReadinessCellVO[]
}

export interface ArchiveReadinessMatrixPageRequest extends QueryDto {
  endAcademicYear: string
  endSemester: SemesterCode
  termCount?: number
  departmentId?: string
}

export interface ArchiveReadinessMatrixMetaResponse {
  endAcademicYear: string
  endSemester: SemesterCode
  termCount: number
  termColumns: ArchiveReadinessTermColumnVO[]
  rowCount: number
  termColumnCount: number
}

export function getSupervisionReadinessMatrixMeta(
  request: ArchiveReadinessMatrixPageRequest,
): Promise<ArchiveReadinessMatrixMetaResponse> {
  return http.post<ArchiveReadinessMatrixMetaResponse>(
    '/api/mark/archive-volumes/supervision/readiness-matrix/meta',
    request,
  )
}

export function pageSupervisionReadinessMatrix(
  request: ArchiveReadinessMatrixPageRequest,
): Promise<PageResult<ArchiveReadinessMatrixRowVO>> {
  return http.post<PageResult<ArchiveReadinessMatrixRowVO>>(
    '/api/mark/archive-volumes/supervision/readiness-matrix/page',
    request,
  )
}

export interface ArchiveVolumeMaterialBatchRegisterRequest {
  volumeId: string
  materials: Omit<ArchiveVolumeMaterialRegisterRequest, 'volumeId'>[]
}

export function batchRegisterArchiveVolumeMaterials(
  request: ArchiveVolumeMaterialBatchRegisterRequest,
): Promise<ArchiveVolumeMaterialResponse[]> {
  return http.post<ArchiveVolumeMaterialResponse[]>(
    '/api/mark/archive-volumes/materials/batch-register',
    request,
  )
}

export function generateArchiveVolumeExamAnalysisReport(request: {
  volumeId: string
  expectedMaterialId?: string
}): Promise<ArchiveVolumeMaterialResponse> {
  return http.post<ArchiveVolumeMaterialResponse>(
    '/api/mark/archive-volumes/materials/generate/exam-analysis',
    request,
  )
}

export function generateArchiveVolumeCourseObjectiveReport(request: {
  volumeId: string
  expectedMaterialId?: string
}): Promise<ArchiveVolumeMaterialResponse> {
  return http.post<ArchiveVolumeMaterialResponse>(
    '/api/mark/archive-volumes/materials/generate/course-objective-report',
    request,
  )
}

export interface ArchiveVolumeMaterialDelayAllowRequest {
  volumeId: string
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  delayAllowedTime: string
  delayResponsibleUserId: string
  missingReason: string
}

export function allowArchiveMaterialDelay(
  request: ArchiveVolumeMaterialDelayAllowRequest,
): Promise<ArchiveVolumeMaterialResponse> {
  return http.post<ArchiveVolumeMaterialResponse>(
    '/api/mark/archive-volumes/materials/allow-delay',
    request,
  )
}

export interface ArchiveVolumeIntegrityWaiveRequest {
  volumeId: string
  reason: string
}

export function waiveArchiveVolumeIntegrity(
  request: ArchiveVolumeIntegrityWaiveRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>('/api/mark/archive-volumes/integrity/waive', request)
}

export interface ArchiveVolumeSecurityMarkConfirmRequest {
  volumeId: string
  securityLevel: ArchiveSecurityLevelCode
  reason: string
}

export function confirmArchiveVolumeSecurityMark(
  request: ArchiveVolumeSecurityMarkConfirmRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>(
    '/api/mark/archive-volumes/security/confirm-mark',
    request,
  )
}

export interface ArchiveVolumeSecurityLevelUpdateRequest {
  volumeId: string
  expectedSecurityLevel: ArchiveSecurityLevelCode
  securityLevel: ArchiveSecurityLevelCode
  reason: string
}

export function updateArchiveVolumeSecurityLevel(
  request: ArchiveVolumeSecurityLevelUpdateRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>(
    '/api/mark/archive-volumes/security/update-level',
    request,
  )
}

export interface ArchiveVolumeMaterialWaiveRequest {
  volumeId: string
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  reason: string
}

export function waiveArchiveMaterialMissing(
  request: ArchiveVolumeMaterialWaiveRequest,
): Promise<ArchiveVolumeMaterialResponse> {
  return http.post<ArchiveVolumeMaterialResponse>(
    '/api/mark/archive-volumes/materials/waive-missing',
    request,
  )
}

export interface ArchiveExcelFileResponse {
  fileName: string
  fileContentBase64: string
}

export interface ArchiveCoursePlatformSyncRequest {
  idempotencyKey: string
  volumeId: string
  sourceSystem: string
  materials: Omit<ArchiveVolumeMaterialRegisterRequest, 'volumeId'>[]
}

export function syncArchiveCoursePlatform(
  request: ArchiveCoursePlatformSyncRequest,
): Promise<ArchiveVolumeMaterialResponse[]> {
  return http.post<ArchiveVolumeMaterialResponse[]>(
    '/api/mark/archive-volumes/sync/course-platform',
    request,
  )
}

export interface ArchiveVolumeExamGateResponse {
  examId: string
  examClosed?: boolean
  allScoresPublished?: boolean
  gateOpen?: boolean
  blockingItems?: WorkflowBlockingItem[]
  gradablePaperCount?: number
  publishedScoreCount?: number
  unpublishedBoundPaperCount?: number
  classPublishProgress?: ArchiveVolumeExamClassPublishProgressVO[]
  autoCreatePendingStatus?: ArchiveVolumeAutoCreatePendingStatusCode
  autoCreateNextRetryAt?: string
  autoCreateLastError?: string
  autoCreateFailureStubPresent?: boolean
  classScopeRecoveryAllowed?: boolean
  autoCreateFailureCategory?: ArchiveAutoCreateFailureCategoryCode
  archiveAutoCreateRetryAllowed?: boolean
  /** 按参考班级院系 scope 解析的预期正式卷数 */
  expectedAutoCreateVolumeCount?: number
  /** 已创建且含院系的 healthy 正式卷数 */
  healthyAutoCreateVolumeCount?: number
  /** 跨院系拆卷场景下是否已全部就绪 */
  autoCreateFullyHealthy?: boolean
  /** 考试归档进度汇总（多卷 rollup lifecycle） */
  examArchiveProgress?: ArchiveVolumeExamArchiveProgressSummaryVO
}

export interface ArchiveVolumeExamArchiveProgressSummaryVO {
  rollupLifecycleNodes: ArchiveVolumeLifecycleNodeVO[]
  completedLifecycleCount?: number
  totalLifecycleCount?: number
  volumeProgressItems?: ArchiveVolumeExamVolumeProgressItemVO[]
}

export interface ArchiveVolumeExamVolumeProgressItemVO {
  volumeId: string
  departmentName?: string
  archiveNo?: string
  volumeStatus: ArchiveVolumeStatusCode
  integrityStatus: ArchiveIntegrityStatusCode
  suggestedTabKey?: string
  fourPropertyStale?: boolean
  completedLifecycleCount?: number
  totalLifecycleCount?: number
  openScanReviewCount?: number
}

export interface ArchiveVolumeExamClassPublishProgressVO {
  classId: string
  className?: string
  boundPaperCount?: number
  publishedScoreCount?: number
  unpublishedBoundPaperCount?: number
}

/** 列表 S1：待自动建袋考试样例项 */
export interface ArchiveVolumeExamAutoCreateAttentionItemVO {
  examId: string
  examName?: string
  examNo?: string
  academicYear?: string
  semester?: SemesterCode
  pendingStatus?: ArchiveVolumeAutoCreatePendingStatusCode
  attemptCount?: number
  nextRetryAt?: string
  lastError?: string
  failureCategory?: ArchiveAutoCreateFailureCategoryCode
  triggerContext?: string
}

/** 列表 S1：待自动建袋考试摘要 */
export interface ArchiveVolumeExamAutoCreateAttentionSummaryVO {
  attentionExamCount: number
  pendingRetryExamCount: number
  manualRequiredExamCount: number
  sampleExams?: ArchiveVolumeExamAutoCreateAttentionItemVO[]
  /** 全部待自动建袋考试 ID（最多 200，用于考试列表高亮） */
  attentionExamIds?: string[]
}

/** 查询待自动建袋考试摘要（PENDING / MANUAL_REQUIRED） */
export function getArchiveVolumeExamAutoCreateAttentionSummary(): Promise<ArchiveVolumeExamAutoCreateAttentionSummaryVO> {
  return http.post<ArchiveVolumeExamAutoCreateAttentionSummaryVO>(
    '/api/mark/archive-volumes/exam/auto-create-attention-summary',
    {},
  )
}

export function getArchiveVolumeExamGate(examId: string): Promise<ArchiveVolumeExamGateResponse> {
  return http.post<ArchiveVolumeExamGateResponse>('/api/mark/archive-volumes/exam/archive-gate', {
    examId,
  })
}

/** 考后归档包事件流水（归档复盘时间线） */
export interface ArchiveVolumeExamArchivePackageEventVO {
  eventId: string
  eventType?: string
  eventTypeLabel?: string
  eventTime?: string
  reason?: string
}

/** 考后归档包摘要（归档复盘信号区） */
export interface ArchiveVolumeExamArchivePackageSummaryVO {
  archivePackageId: string
  archiveNo?: string
  archiveTitle?: string
  archiveStatus?: ArchivePackageStatusCode
  archiveStatusLabel?: string
  itemCount?: number
  archiveFileSize?: number
  retentionYears?: number
  permanentRetention?: boolean
  retentionUntil?: string
  packagingPhase?: string
  packagingProgressPercent?: number
  packagingProgressMessage?: string
  originalScanCount?: number
  markedSliceCount?: number
  answerBookletCount?: number
  packagingCompletedTime?: string
}

/** 考后归档包打包时间线步骤 */
export interface ArchiveVolumeExamArchivePackageTimelineStepVO {
  stepKey: string
  stepLabel: string
  description?: string
  stepStatus: 'done' | 'active' | 'pending' | 'failed'
  eventTime?: string
}

/** 考试归档复盘页聚合响应 */
export interface ArchiveVolumeExamArchiveReviewVO {
  gate: ArchiveVolumeExamGateResponse
  archivePackage?: ArchiveVolumeExamArchivePackageSummaryVO | null
  packageEvents?: ArchiveVolumeExamArchivePackageEventVO[]
  packageTimelineSteps?: ArchiveVolumeExamArchivePackageTimelineStepVO[]
  /** MVR-268：主考写能力位（创建归档包/重新打包） */
  canManageOwnerArchivePackageWrites?: boolean
}

export function getArchiveVolumeExamReview(
  examId: string,
): Promise<ArchiveVolumeExamArchiveReviewVO> {
  return http.post<ArchiveVolumeExamArchiveReviewVO>(
    '/api/mark/archive-volumes/exam/archive-review',
    {
      examId,
    },
  )
}

export function retryArchiveVolumeAutoCreate(examId: string): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/exam/retry-auto-create', { examId })
}

export interface ArchiveExternalFondsRetryAutoCreateRequest {
  provenance: ArchiveTaskProvenanceCode
  externalSourceSystem: string
  externalBusinessNo: string
}

/** 人工修复后重新触发外部全宗自动建卷 */
export function retryExternalFondsAutoCreate(
  request: ArchiveExternalFondsRetryAutoCreateRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/external-fonds/retry-auto-create', request)
}

export interface ArchiveExternalFondsPendingPageRequest extends QueryDto {
  provenance?: ArchiveTaskProvenanceCode
  pendingStatus?: ArchiveVolumeAutoCreatePendingStatusCode
  departmentId?: string
  externalBusinessNoKeyword?: string
}

export interface ArchiveExternalFondsPendingResponse {
  pendingId: string
  provenance: ArchiveTaskProvenanceCode
  externalSourceSystem: string
  externalBusinessNo: string
  departmentId?: string
  departmentName?: string
  pendingStatus: ArchiveVolumeAutoCreatePendingStatusCode
  attemptCount?: number
  nextRetryAt?: string
  lastError?: string
  failureCategory?: ArchiveAutoCreateFailureCategoryCode
  triggerContext?: string
  volumeId?: string
  updateTime?: string
  /** MVR-290：是否可重试；与 hasCollegeCoordinatorDuty 同源 */
  canManageExternalFondsRetry?: boolean
}

/** MVR-290：外部全宗待重试分页（页级写能力位） */
export interface ArchiveExternalFondsPendingPageResponse {
  canManageExternalFondsRetry?: boolean
  list: ArchiveExternalFondsPendingResponse[]
  total: number
  pageNum: number
  pageSize: number
  pages: number
}

/** 分页查询外部全宗自动建卷待重试队列 */
export function pageExternalFondsPending(
  request: ArchiveExternalFondsPendingPageRequest,
): Promise<ArchiveExternalFondsPendingPageResponse> {
  return http.post<ArchiveExternalFondsPendingPageResponse>(
    '/api/mark/archive-volumes/external-fonds/pending/page',
    request,
  )
}

export interface ArchiveVolumeAccessRecordResponse {
  accessRecordId: string
  volumeId: string
  campaignId?: string
  campaignName?: string
  materialId?: string
  applicantUserId?: string
  applicantNickName?: string
  applicantIdentifier?: string
  approverUserId?: string
  approverNickName?: string
  accessStatus: ArchiveAccessStatusCode
  accessReason?: string
  archiveNo?: string
  archiveTitle?: string
  departmentId?: string
  departmentName?: string
  securityLevel?: ArchiveSecurityLevelCode
  approvedTime?: string
  expireTime?: string
  createTime?: string
  decisionComment?: string
  watermarkApplied?: boolean
  downloadToken?: string
  /** 在线预览最近阅读页码，从 1 起计 */
  lastReadPage?: number
  /** 授权材料累计下载次数 */
  downloadCount?: number
  /** MVR-189：当前用户可批准该 PENDING 查阅（职责+密级+非申请人） */
  canApprove?: boolean
  /** MVR-189：当前用户可驳回该 PENDING 查阅（与 canApprove 同源） */
  canReject?: boolean
}

export interface ArchiveIntegrityCheckResponse {
  volumeId: string
  integrityStatus: ArchiveIntegrityStatusCode
  passed?: boolean
  missingItems?: ArchiveIntegrityMissingItemVO[]
}

export interface ArchiveIntegrityMissingItemVO {
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  catalogName?: string
  submissionStatus?: ArchiveMaterialSubmissionStatusCode
  missingReason?: string
}

export interface ArchiveFourPropertyCheckResponse {
  volumeId: string
  checkId?: string
  authenticityPassed?: boolean
  integrityPassed?: boolean
  usabilityPassed?: boolean
  securityPassed?: boolean
  overallPassed?: boolean
  diagnostic?: string
  checkedTime?: string
}

export interface ArchiveVolumeExportResponse {
  exportFileId: string
  manifestChecksum?: string
  materialCount?: number
  /** 导出包内实际文件数 */
  fileCount?: number
  /** 导出包 SHA256 */
  packageChecksumSha256?: string
}

export { ScanBatchQualityFlagCode } from '@/types/enums/scan-batch-quality-flag-enum'

/** 归档任务统一创建请求（v3.2）- 对应 ArchiveTaskCreateRequest */
export interface ArchiveTaskCreateRequest {
  provenance: ArchiveTaskProvenanceCode
  templateSetCode: string
  courseId: string
  teachingClassId?: string
  departmentId: string
  academicYear: string
  semester: SemesterCode
  relatedExamId?: string
  examForm?: ArchiveExamFormCode
  archiveNo?: string
  archiveTitle: string
  scoreSource: ArchiveScoreSourceCode
  scoreProofFileId?: string
  securityLevel: ArchiveSecurityLevelCode
  retentionYears?: number
  permanentRetention?: boolean
  responsibleUserId?: string
  archiveDueTimeOverride?: string
}

/** 废弃归档任务创建阶段未使用的临时成绩证明。 */
export function discardArchiveTaskScoreProof(fileId: string): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/task/score-proof/discard', { fileId })
}

export interface ArchiveVolumeMaterialRegisterRequest {
  volumeId: string
  sourceBatchId?: string
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  requiredFlag?: boolean
  fileId: string
  mediaType: ArchiveMaterialMediaTypeCode
  sortRule: ArchiveMaterialSortRuleCode
  sortKey?: string
  electronicOriginalStatus: ArchiveElectronicOriginalStatusCode
  studentNo?: string
  studentName?: string
  className?: string
  seatNo?: string
  sequenceNo?: number
  retakeFlag?: boolean
  makeupRound?: string
  triggerOcr?: boolean
  tags?: string[]
}

export interface ArchiveVolumeSubmitRequest {
  volumeId: string
  reason?: string
  overdueSubmitReason?: string
}

export interface ArchiveVolumeTransferApproveRequest {
  volumeId: string
  reviewComment?: string
}

export interface ArchiveVolumeTransferRejectRequest {
  volumeId: string
  rejectReason: string
}

export interface ArchiveVolumeBatchRejectRequest {
  volumeIds: string[]
  rejectReason: string
}

export interface ArchiveVolumeAccessRequest {
  volumeId: string
  materialId?: string
  accessReason: string
}

export interface ArchiveVolumeAccessDecisionRequest {
  accessRecordId: string
  decisionComment?: string
}

export interface ArchiveVolumeAppraisalRejectRequest {
  volumeId: string
  rejectReason: string
}

export interface ArchiveVolumeAppraisalRequest {
  volumeId: string
  decision: ArchiveAppraisalDecisionCode
  retentionExtensionYears?: number
  permanentRetention?: boolean
  remark?: string
}

export interface ArchiveVolumeDestructionRequest {
  volumeId: string
  reason: string
}

export interface ArchiveVolumeDestructionApprovalRequest {
  volumeId: string
  decision: ArchiveDestructionDecisionCode
  remark?: string
}

export interface ArchiveVolumeDestructionSuperviseRequest {
  volumeId: string
  witnessUserId: string
  registerFileId: string
}

export interface ArchiveScoreCompletionConfirmRequest {
  volumeId: string
}

export function createArchiveTask(request: ArchiveTaskCreateRequest): Promise<string> {
  return http.post<string>('/api/mark/archive-volumes/task/create', request)
}

export function registerArchiveVolumeMaterial(
  request: ArchiveVolumeMaterialRegisterRequest,
): Promise<ArchiveVolumeMaterialResponse> {
  return http.post<ArchiveVolumeMaterialResponse>(
    '/api/mark/archive-volumes/materials/register',
    request,
  )
}

export function triggerArchiveVolumeMaterialOcr(
  materialId: string,
): Promise<ArchiveVolumeMaterialResponse> {
  return http.post<ArchiveVolumeMaterialResponse>(
    '/api/mark/archive-volumes/materials/ocr/trigger',
    {
      materialId,
    },
  )
}

/** 文档采集业务场景 - 对应后端 DocumentBusinessScene */
/** 文档材料绑定状态 - 对应后端 DocumentMaterialBindingStatus */
export interface DocumentOcrPageDetailVO {
  pageResultId?: string
  pageId?: string
  pageNo?: number
  status?: DocumentOcrPageResultStatusCode
  recognizedText?: string
  blockJson?: string
  diagnostic?: string
  engineTraceId?: string
}

export interface DocumentMaterialOcrDetailResponse {
  materialId?: string
  ingestionSessionId?: string
  ocrTaskId?: string
  bindingId?: string
  businessScene?: DocumentBusinessSceneCode
  bindingStatus?: DocumentMaterialBindingStatusCode
  pageRange?: string
  taskStatus?: DocumentOcrTaskStatusCode
  taskDiagnostic?: string
  ocrProvider?: string
  fullText?: string
  pages?: DocumentOcrPageDetailVO[]
}

export function getArchiveMaterialDocumentOcrDetail(
  materialId: string,
): Promise<DocumentMaterialOcrDetailResponse | null> {
  return http.post<DocumentMaterialOcrDetailResponse | null>(
    '/api/mark/archive-volumes/materials/document-ocr/detail',
    {
      materialId,
    },
  )
}

export function checkArchiveVolumeIntegrity(
  volumeId: string,
): Promise<ArchiveIntegrityCheckResponse> {
  return http.post<ArchiveIntegrityCheckResponse>('/api/mark/archive-volumes/integrity/check', {
    volumeId,
  })
}

export function checkArchiveVolumeFourProperty(
  volumeId: string,
): Promise<ArchiveFourPropertyCheckResponse> {
  return http.post<ArchiveFourPropertyCheckResponse>(
    '/api/mark/archive-volumes/four-property/check',
    {
      volumeId,
    },
  )
}

export interface ArchiveVolumeSignOffItemVO {
  role: ArchiveVolumeSignOffRoleCode
  roleLabel: string
  confirmed?: boolean
  signatoryName?: string
}

export interface ArchiveVolumeSubmitChecklistItemVO {
  dimension: ArchiveVolumeSubmitChecklistDimensionCode
  message: string
  passed?: boolean
  actionType?: ArchiveVolumeSubmitChecklistActionTypeCode | string
  targetTab?: string
  actionLabel?: string
}

export interface ArchiveVolumeCatalogLineVO {
  id?: string
  lineNo: number
  archiveCode?: string
  title: string
  responsible?: string
  pageRange?: string
  fileDate?: string
  remark?: string
  materialId?: string
}

export interface ArchiveVolumeCatalogResponse {
  volumeId: string
  catalogStatus: ArchiveCatalogStatusCode
  catalogRevision: string
  lines: ArchiveVolumeCatalogLineVO[]
}

export interface ArchiveVolumeCatalogLineSaveRequest {
  lineNo: number
  archiveCode?: string
  title: string
  responsible?: string
  pageRange?: string
  fileDate?: string
  remark?: string
  materialId?: string
}

export interface ArchiveVolumeCatalogSaveRequest {
  volumeId: string
  expectedCatalogRevision: string
  lines: ArchiveVolumeCatalogLineSaveRequest[]
}

export interface ArchiveVolumeCatalogExportResponse {
  exportFileId?: string
  lineCount?: number
}

export interface ArchiveVolumeSelfCheckItemVO {
  recordId?: string
  templateItemId: string
  itemOrder: number
  itemText: string
  requiredFlag: boolean
  checked: boolean
  checkerUserId?: string
  checkedTime?: string
}

export interface ArchiveVolumeSelfCheckListResponse {
  volumeId: string
  items: ArchiveVolumeSelfCheckItemVO[]
  completed?: boolean
  requiredTotal?: number
  requiredChecked?: number
}

export interface ArchiveVolumeSelfCheckItemCheckRequest {
  volumeId: string
  templateItemId: string
  checked: boolean
}

export interface ArchiveVolumeSelfCheckExportResponse {
  exportFileId?: string
  itemCount?: number
}

export interface ArchiveVolumeSubmitChecklistResponse {
  volumeId: string
  checklistVersion: string
  selfCheckConfirmed?: boolean
  signOffReady?: boolean
  baseReady?: boolean
  submitReady?: boolean
  requireSelfCheckConfirm?: boolean
  blockingItems?: ArchiveVolumeSubmitChecklistItemVO[]
  signOffItems?: ArchiveVolumeSignOffItemVO[]
}

export interface ArchiveVolumeSignOffConfirmItemRequest {
  role: ArchiveVolumeSignOffRoleCode
  confirmed: boolean
  signatoryName: string
}

export interface ArchiveVolumeSelfCheckConfirmRequest {
  volumeId: string
  checklistVersion: string
  materialCompleteConfirmed: boolean
  gradingNormConfirmed: boolean
  signOffItems: ArchiveVolumeSignOffConfirmItemRequest[]
  reason?: string
}

export function previewArchiveVolumeSubmitChecklist(
  volumeId: string,
): Promise<ArchiveVolumeSubmitChecklistResponse> {
  return http.post<ArchiveVolumeSubmitChecklistResponse>(
    '/api/mark/archive-volumes/submit/checklist/preview',
    { volumeId },
  )
}

export function confirmArchiveVolumeSelfCheck(
  request: ArchiveVolumeSelfCheckConfirmRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/submit/self-check/confirm', request)
}

export function getArchiveVolumeCatalog(volumeId: string): Promise<ArchiveVolumeCatalogResponse> {
  return http.post<ArchiveVolumeCatalogResponse>('/api/mark/archive-volumes/catalog/get', {
    volumeId,
  })
}

export function generateArchiveVolumeCatalogDraft(
  volumeId: string,
  expectedCatalogRevision: string,
): Promise<ArchiveVolumeCatalogResponse> {
  return http.post<ArchiveVolumeCatalogResponse>(
    '/api/mark/archive-volumes/catalog/generate-draft',
    {
      volumeId,
      expectedCatalogRevision,
    },
  )
}

export function saveArchiveVolumeCatalog(request: ArchiveVolumeCatalogSaveRequest): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/catalog/save', request)
}

export function confirmArchiveVolumeCatalog(
  volumeId: string,
  expectedCatalogRevision: string,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/catalog/confirm', {
    volumeId,
    expectedCatalogRevision,
  })
}

export function exportArchiveVolumeCatalog(
  volumeId: string,
): Promise<ArchiveVolumeCatalogExportResponse> {
  return http.post<ArchiveVolumeCatalogExportResponse>('/api/mark/archive-volumes/catalog/export', {
    volumeId,
  })
}

export function listArchiveVolumeSelfCheckItems(
  volumeId: string,
): Promise<ArchiveVolumeSelfCheckListResponse> {
  return http.post<ArchiveVolumeSelfCheckListResponse>(
    '/api/mark/archive-volumes/self-check/items/list',
    { volumeId },
  )
}

export function checkArchiveVolumeSelfCheckItem(
  request: ArchiveVolumeSelfCheckItemCheckRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/self-check/items/check', request)
}

export function exportArchiveVolumeSelfCheck(
  volumeId: string,
): Promise<ArchiveVolumeSelfCheckExportResponse> {
  return http.post<ArchiveVolumeSelfCheckExportResponse>(
    '/api/mark/archive-volumes/self-check/export',
    {
      volumeId,
    },
  )
}

export interface ArchiveVolumeEventExportResponse {
  exportFileId: string
  eventCount: number
}

export function listArchiveVolumeTransferRecords(
  volumeId: string,
): Promise<ArchiveVolumeTransferRecordResponse[]> {
  return http.post<ArchiveVolumeTransferRecordResponse[]>(
    '/api/mark/archive-volumes/transfer-records/list',
    { volumeId },
  )
}

export function listArchiveVolumeAppraisalFlowRecords(
  volumeId: string,
): Promise<ArchiveVolumeAppraisalFlowRecordResponse[]> {
  return http.post<ArchiveVolumeAppraisalFlowRecordResponse[]>(
    '/api/mark/archive-volumes/appraisal-flow-records/list',
    { volumeId },
  )
}

export function listArchiveVolumeDestructionFlowRecords(
  volumeId: string,
): Promise<ArchiveVolumeDestructionFlowRecordResponse[]> {
  return http.post<ArchiveVolumeDestructionFlowRecordResponse[]>(
    '/api/mark/archive-volumes/destruction-flow-records/list',
    { volumeId },
  )
}

export function exportArchiveVolumeEvents(
  volumeId: string,
): Promise<ArchiveVolumeEventExportResponse> {
  return http.post<ArchiveVolumeEventExportResponse>('/api/mark/archive-volumes/events/export', {
    volumeId,
  })
}

export function submitArchiveVolume(
  request: ArchiveVolumeSubmitRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>('/api/mark/archive-volumes/submit', request)
}

export interface ArchiveVolumeDepartmentReviewRequest {
  volumeId: string
  reason?: string
}

export interface ArchiveVolumeDepartmentReviewRejectRequest {
  volumeId: string
  rejectReason: string
}

export function requestArchiveVolumeDepartmentReview(
  request: ArchiveVolumeDepartmentReviewRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>(
    '/api/mark/archive-volumes/department-review/request',
    request,
  )
}

export function approveArchiveVolumeDepartmentReview(
  request: ArchiveVolumeDepartmentReviewRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>(
    '/api/mark/archive-volumes/department-review/approve',
    request,
  )
}

export function rejectArchiveVolumeDepartmentReview(
  request: ArchiveVolumeDepartmentReviewRejectRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>(
    '/api/mark/archive-volumes/department-review/reject',
    request,
  )
}

export function withdrawArchiveVolumeDepartmentReview(
  request: ArchiveVolumeDepartmentReviewRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>(
    '/api/mark/archive-volumes/department-review/withdraw',
    request,
  )
}

export function precheckArchiveStartCollecting(
  volumeId: string,
): Promise<ArchiveVolumeStartCollectingPrecheckResponse> {
  return http.post<ArchiveVolumeStartCollectingPrecheckResponse>(
    '/api/mark/archive-volumes/task/start-collecting/precheck',
    { volumeId },
  )
}

export function startArchiveCollecting(volumeId: string): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>('/api/mark/archive-volumes/task/start-collecting', {
    volumeId,
  })
}

export interface ArchiveVolumeDigitalMaterialConfirmRequest {
  volumeId: string
  materialIds: string[]
}

export function confirmArchiveDigitalMaterials(
  request: ArchiveVolumeDigitalMaterialConfirmRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/materials/digital/confirm', request)
}

export function approveArchiveVolumeTransfer(
  request: ArchiveVolumeTransferApproveRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>('/api/mark/archive-volumes/transfer/approve', request)
}

export function rejectArchiveVolumeTransfer(
  request: ArchiveVolumeTransferRejectRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>('/api/mark/archive-volumes/transfer/reject', request)
}

export function requestArchiveVolumeAccess(
  request: ArchiveVolumeAccessRequest,
): Promise<ArchiveVolumeAccessRecordResponse> {
  return http.post<ArchiveVolumeAccessRecordResponse>(
    '/api/mark/archive-volumes/access/request',
    request,
  )
}

export function approveArchiveVolumeAccess(
  request: ArchiveVolumeAccessDecisionRequest,
): Promise<ArchiveVolumeAccessRecordResponse> {
  return http.post<ArchiveVolumeAccessRecordResponse>(
    '/api/mark/archive-volumes/access/approve',
    request,
  )
}

export function rejectArchiveVolumeAccess(
  request: ArchiveVolumeAccessDecisionRequest,
): Promise<ArchiveVolumeAccessRecordResponse> {
  return http.post<ArchiveVolumeAccessRecordResponse>(
    '/api/mark/archive-volumes/access/reject',
    request,
  )
}

export function listArchiveVolumeAccessRecords(
  volumeId: string,
): Promise<ArchiveVolumeAccessRecordResponse[]> {
  return http.post<ArchiveVolumeAccessRecordResponse[]>(
    '/api/mark/archive-volumes/access/records',
    {
      volumeId,
    },
  )
}

export function pageOverdueArchiveVolumes(
  request: ArchiveVolumePageRequest,
): Promise<PageResult<ArchiveVolumeResponse>> {
  return http.post<PageResult<ArchiveVolumeResponse>>(
    '/api/mark/archive-volumes/overdue/page',
    request,
  )
}

export function getArchiveVolumeStatistics(
  request: ArchiveVolumeStatisticsRequest,
): Promise<ArchiveVolumeStatisticsResponse> {
  return http.post<ArchiveVolumeStatisticsResponse>('/api/mark/archive-volumes/statistics', request)
}

export interface ArchiveVolumeStatisticsSummaryVO {
  totalVolumeCount: number
  storedVolumeCount: number
  avgCompletionRate: number
  overdueVolumeCount: number
  departmentRowCount: number
  missingMaterialKindCount: number
}

export interface ArchiveVolumeStatisticsPageRequest extends QueryDto {
  academicYear?: string
  semester?: SemesterCode
  departmentId?: string
}

export function getArchiveVolumeStatisticsSummary(
  request: ArchiveVolumeStatisticsRequest,
): Promise<ArchiveVolumeStatisticsSummaryVO> {
  return http.post<ArchiveVolumeStatisticsSummaryVO>(
    '/api/mark/archive-volumes/statistics/summary',
    request,
  )
}

export function pageStatisticsDepartmentCompletions(
  request: ArchiveVolumeStatisticsPageRequest,
): Promise<PageResult<ArchiveDepartmentCompletionVO>> {
  return http.post<PageResult<ArchiveDepartmentCompletionVO>>(
    '/api/mark/archive-volumes/statistics/department-completion/page',
    request,
  )
}

export function pageStatisticsMissingMaterials(
  request: ArchiveVolumeStatisticsPageRequest,
): Promise<PageResult<ArchiveMissingMaterialStatVO>> {
  return http.post<PageResult<ArchiveMissingMaterialStatVO>>(
    '/api/mark/archive-volumes/statistics/missing-material/page',
    request,
  )
}

export function exportArchiveVolumeStatisticsExcel(
  request: ArchiveVolumeStatisticsRequest,
): Promise<ArchiveExcelFileResponse> {
  return http.post<ArchiveExcelFileResponse>('/api/mark/archive-volumes/statistics/export', request)
}

export function exportArchiveVolume(volumeId: string): Promise<ArchiveVolumeExportResponse> {
  return http.post<ArchiveVolumeExportResponse>('/api/mark/archive-volumes/export', { volumeId })
}

export function requestArchiveVolumeAppraisal(volumeId: string): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>('/api/mark/archive-volumes/appraisal/request', {
    volumeId,
  })
}

export function approveArchiveVolumeAppraisal(volumeId: string): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>('/api/mark/archive-volumes/appraisal/approve', {
    volumeId,
  })
}

export function rejectArchiveVolumeAppraisal(
  request: ArchiveVolumeAppraisalRejectRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>('/api/mark/archive-volumes/appraisal/reject', request)
}

export function recordArchiveVolumeAppraisalOpinion(
  request: ArchiveVolumeAppraisalRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>(
    '/api/mark/archive-volumes/appraisal/record-opinion',
    request,
  )
}

export function requestArchiveVolumeDestruction(
  request: ArchiveVolumeDestructionRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>('/api/mark/archive-volumes/destruction/request', request)
}

export function approveArchiveVolumeDestruction(
  request: ArchiveVolumeDestructionApprovalRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>('/api/mark/archive-volumes/destruction/approve', request)
}

export function executeArchiveVolumeDestruction(volumeId: string): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>('/api/mark/archive-volumes/destruction/execute', {
    volumeId,
  })
}

export function confirmArchiveVolumeDestructionSupervision(
  request: ArchiveVolumeDestructionSuperviseRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>(
    '/api/mark/archive-volumes/destruction/supervise',
    request,
  )
}

export function confirmArchiveVolumeScoreCompletion(
  request: ArchiveScoreCompletionConfirmRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>(
    '/api/mark/archive-volumes/score-completion/confirm',
    request,
  )
}

export function batchRejectArchiveVolumeTransfer(
  request: ArchiveVolumeBatchRejectRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/transfer/batch-reject', request)
}

export function listPendingArchiveAccessRecords(): Promise<ArchiveVolumeAccessRecordResponse[]> {
  return http.post<ArchiveVolumeAccessRecordResponse[]>(
    '/api/mark/archive-volumes/access/pending/list',
    {},
  )
}

export interface ArchiveSharedMaterialRefRequest {
  volumeId: string
  refType: ArchiveSharedMaterialRefTypeCode
  targetVolumeId: string
  targetMaterialId: string
  catalogNote?: string
}

export function registerArchiveSharedMaterialRef(
  request: ArchiveSharedMaterialRefRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/shared-material/ref', request)
}

export interface ArchiveVolumeSharedMaterialRefResponse {
  refId: string
  volumeId: string
  refType: ArchiveSharedMaterialRefTypeCode
  targetVolumeId: string
  targetMaterialId: string
  catalogNote?: string
}

export function listArchiveSharedMaterialRefs(request: {
  volumeId: string
}): Promise<ArchiveVolumeSharedMaterialRefResponse[]> {
  return http.post<ArchiveVolumeSharedMaterialRefResponse[]>(
    '/api/mark/archive-volumes/shared-material/ref/list',
    request,
  )
}

export interface ArchiveSharedMaterialRefRemoveRequest {
  volumeId: string
  refId: string
}

export function removeArchiveSharedMaterialRef(
  request: ArchiveSharedMaterialRefRemoveRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/shared-material/ref/remove', request)
}

export interface ArchiveVolumeAccessDownloadRequest {
  accessRecordId: string
  materialId: string
  downloadToken: string
}

export function downloadArchiveAccessMaterial(
  request: ArchiveVolumeAccessDownloadRequest,
): Promise<import('@/config/axios/types').BlobDownloadResponse> {
  return http.downloadByPost('/api/mark/archive-volumes/access/download-material', request)
}

export interface ArchiveVolumeAccessPreviewRequest {
  accessRecordId: string
  materialId: string
  downloadToken: string
}

export function previewArchiveAccessMaterial(
  request: ArchiveVolumeAccessPreviewRequest,
): Promise<import('@/config/axios/types').BlobDownloadResponse> {
  return http.downloadByPost('/api/mark/archive-volumes/access/preview-material', request)
}

export interface ArchiveVolumeAccessReadPageRequest {
  accessRecordId: string
  lastReadPage: number
}

export function recordAccessReadPage(request: ArchiveVolumeAccessReadPageRequest): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/access/record-read-page', request)
}

export interface ArchiveVolumeAccessLedgerPageRequest extends QueryDto {
  departmentId?: string
  accessStatus?: ArchiveAccessStatusCode
  applicantUserId?: string
}

export interface ArchiveVolumeAccessLedgerRowResponse {
  accessRecordId: string
  volumeId: string
  materialId?: string
  applicantUserId?: string
  applicantNickName?: string
  applicantIdentifier?: string
  approverUserId?: string
  approverNickName?: string
  accessStatus: ArchiveAccessStatusCode
  accessReason?: string
  approvedTime?: string
  expireTime?: string
  createTime?: string
  decisionComment?: string
  archiveNo?: string
  archiveTitle?: string
  departmentName?: string
  lastReadPage?: number
  campaignId?: string
  campaignName?: string
}

export function pageAccessLedger(
  request: ArchiveVolumeAccessLedgerPageRequest,
): Promise<PageResult<ArchiveVolumeAccessLedgerRowResponse>> {
  return http.post<PageResult<ArchiveVolumeAccessLedgerRowResponse>>(
    '/api/mark/archive-volumes/access/ledger/page',
    request,
  )
}

export interface ArchiveVolumeDestructionLedgerPageRequest extends QueryDto {
  departmentId?: string
  keyword?: string
}

export interface ArchiveVolumeDestructionLedgerRowResponse {
  volumeId: string
  archiveNo?: string
  archiveTitle?: string
  departmentId?: string
  departmentName?: string
  academicYear?: string
  semester?: SemesterCode
  destructionStatus: ArchiveDestructionStatusCode
  destructionRecordId?: string
  requestReason?: string
  requestUserId?: string
  requestTime?: string
  approverUserId?: string
  approvalTime?: string
  executedTime?: string
  witnessUserId?: string
  registerFileId?: string
}

export function pageDestructionLedger(
  request: ArchiveVolumeDestructionLedgerPageRequest,
): Promise<PageResult<ArchiveVolumeDestructionLedgerRowResponse>> {
  return http.post<PageResult<ArchiveVolumeDestructionLedgerRowResponse>>(
    '/api/mark/archive-volumes/destruction/ledger/page',
    request,
  )
}

export function exportDestructionLedgerExcel(
  request: ArchiveVolumeDestructionLedgerPageRequest,
): Promise<ArchiveExcelFileResponse> {
  return http.post<ArchiveExcelFileResponse>(
    '/api/mark/archive-volumes/destruction/ledger/export',
    request,
  )
}

export interface ArchiveVolumeSupervisionMarkProblemRequest {
  volumeId: string
  problemDescription: string
  campaignId?: string
}

export function markSupervisionProblem(
  request: ArchiveVolumeSupervisionMarkProblemRequest,
): Promise<ArchiveRemediationTaskResponse> {
  return http.post<ArchiveRemediationTaskResponse>(
    '/api/mark/archive-volumes/supervision/mark-problem',
    request,
  )
}

export interface ArchiveVolumeGlobalAuditPageRequest extends QueryDto {
  departmentId?: string
  eventType?: ArchiveVolumeEventTypeCode
}

export interface ArchiveVolumeAuditEventResponse {
  eventId: string
  volumeId?: string
  eventType?: ArchiveVolumeEventTypeCode
  operatorUserId?: string
  operatorNickName?: string
  reason?: string
  beforeStatus?: string
  afterStatus?: string
  traceId?: string
  eventPayload?: string
  createUser?: string
  createTime?: string
}

export function pageArchiveGlobalAuditEvents(
  request: ArchiveVolumeGlobalAuditPageRequest,
): Promise<PageResult<ArchiveVolumeAuditEventResponse>> {
  return http.post<PageResult<ArchiveVolumeAuditEventResponse>>(
    '/api/mark/archive-volumes/audit/page',
    request,
  )
}

export interface ArchiveVolumeAuditStatsVO {
  eventCount: number
}

export function getArchiveGlobalAuditEventStats(
  request: Pick<ArchiveVolumeGlobalAuditPageRequest, 'departmentId' | 'eventType'>,
): Promise<ArchiveVolumeAuditStatsVO> {
  return http.post<ArchiveVolumeAuditStatsVO>('/api/mark/archive-volumes/audit/stats', request)
}

export { ScanBatchQualityFlagDescription } from '@/types/enums/scan-batch-quality-flag-enum'

export const SCAN_BATCH_QUALITY_FLAG_TONE: Record<
  ScanBatchQualityFlagCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ScanBatchQualityFlagCode.NORMAL]: 'green',
  [ScanBatchQualityFlagCode.SUSPECTED_MIXED]: 'orange',
}

export interface ArchiveVolumePhysicalLocationUpdateRequest {
  volumeId: string
  expectedPhysicalLocationId: string | null
  building: string
  room?: string
  cabinet: string
  slot?: string
  physicalLocationNote?: string
}

export interface ArchivePhysicalLocationResponse {
  locationId: string
  volumeId?: string
  building?: string
  room?: string
  cabinet?: string
  slot?: string
  note?: string
  physicalStorageLocation?: string
  effectiveTime?: string
}

export interface ArchivePhysicalLocationHistoryRequest {
  volumeId: string
  limit?: number
}

export function updateArchiveVolumePhysicalLocation(
  request: ArchiveVolumePhysicalLocationUpdateRequest,
): Promise<ArchiveVolumeResponse> {
  return http.post<ArchiveVolumeResponse>(
    '/api/mark/archive-volumes/physical-location/update',
    request,
  )
}

export function listArchivePhysicalLocationHistory(
  request: ArchivePhysicalLocationHistoryRequest,
): Promise<ArchivePhysicalLocationResponse[]> {
  return http.post<ArchivePhysicalLocationResponse[]>(
    '/api/mark/archive-volumes/physical-location/history/list',
    request,
  )
}

export interface ArchiveScanBatchSnapshotRequest extends QueryDto {
  volumeId: string
  batchQualityFlag?: ScanBatchQualityFlagCode
}

export interface ArchiveScanBatchSnapshotItemVO {
  sourceBatchId?: string
  batchExternalNo?: string
  batchQualityFlag: ScanBatchQualityFlagCode
  workOrderStatus: ScanWorkOrderStatusCode
  pageCount: number
  materialCount: number
  operatorUserId?: string
  operatorNickName?: string
  scannerDeviceId?: string
  studentIdRange?: string
  qualityScore?: number
  diagnostic?: string
  createTime?: string
  updateTime?: string
  scanEndTime?: string
  materials?: ArchiveVolumeMaterialResponse[]
}

export function pageArchiveScanBatchSnapshots(
  request: ArchiveScanBatchSnapshotRequest,
): Promise<PageResult<ArchiveScanBatchSnapshotItemVO>> {
  return http.post<PageResult<ArchiveScanBatchSnapshotItemVO>>(
    '/api/mark/archive-volumes/scan-batch-snapshots/page',
    request,
  )
}

export interface ArchiveScanBatchBatchActionRequest {
  volumeId: string
  workOrderIds: string[]
  actionReason: string
}

export function batchConfirmNormalArchiveScanBatches(
  request: ArchiveScanBatchBatchActionRequest,
): Promise<void> {
  return http.post<void>(
    '/api/mark/archive-volumes/scan-batch-snapshots/batch-confirm-normal',
    request,
  )
}

export function batchDiscardArchiveScanBatches(
  request: ArchiveScanBatchBatchActionRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/scan-batch-snapshots/batch-discard', request)
}

export interface ArchiveSuspectedMixedScanBatchItemVO {
  sourceBatchId: string
  batchExternalNo?: string
  volumeId: string
  archiveNo?: string
  departmentName?: string
  materialCount?: number
  pageCount?: number
  scanEndTime?: string
  updateTime?: string
}

export interface ArchiveSuspectedMixedScanBatchPageRequest extends QueryDto {
  departmentId?: string
  academicYear?: string
  semester?: SemesterCode
}

export function pageSuspectedMixedScanBatches(
  request: ArchiveSuspectedMixedScanBatchPageRequest,
  config?: ExtendedAxiosRequestConfig,
): Promise<PageResult<ArchiveSuspectedMixedScanBatchItemVO>> {
  return http.post<PageResult<ArchiveSuspectedMixedScanBatchItemVO>>(
    '/api/mark/archive-volumes/scan-batch-snapshots/suspected-mixed/page',
    request,
    config,
  )
}
