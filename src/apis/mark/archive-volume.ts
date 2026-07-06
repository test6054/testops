import type { ArchiveMaterialOcrStatusCode } from './archive-ocr-status'
import type { ScanWorkOrderStatusCode } from '@/apis/mark/scanner-work-order'
/**
 * 统一归档卷 API - 对接 edu-mark ArchiveVolumeController
 */
import type { ArchiveAutoCreateFailureCategoryCode } from '@/constants/archive-auto-create-failure-category'
import type { PageResult, QueryDto } from '@/types'
import type { ArchiveAppraisalDecisionCode } from '@/types/enums/archive-appraisal-decision-enum'
import type { ArchiveDestructionDecisionCode } from '@/types/enums/archive-destruction-decision-enum'
import type { ArchiveElectronicOriginalStatusCode } from '@/types/enums/archive-electronic-original-status-enum'
import type { ArchiveEvaluationCampaignStatusCode } from '@/types/enums/archive-evaluation-campaign-status-enum'
import type { ArchiveExamFormCode } from '@/types/enums/archive-exam-form-enum'
import type { ArchiveExternalImportTypeCode } from '@/types/enums/archive-external-import-type-enum'
import type { ArchiveImportBatchStatusCode } from '@/types/enums/archive-import-batch-status-enum'
import type { ArchiveMaterialMediaTypeCode } from '@/types/enums/archive-material-media-type-enum'
import type { ArchiveMaterialSortRuleCode } from '@/types/enums/archive-material-sort-rule-enum'
import type { ArchiveMaterialTypeCode } from '@/types/enums/archive-material-type-enum'
import type { ArchiveRemediationDiagnosticCode } from '@/types/enums/archive-remediation-diagnostic-enum'
import type { ArchiveRemediationPriorityCode } from '@/types/enums/archive-remediation-priority-enum'
import type { ArchiveScoreCompletionStatusCode } from '@/types/enums/archive-score-completion-status-enum'
import type { ArchiveScoreSourceCode } from '@/types/enums/archive-score-source-enum'
import type { ArchiveSecurityLevelCode } from '@/types/enums/archive-security-level-enum'
import type { ArchiveSharedMaterialRefTypeCode } from '@/types/enums/archive-shared-material-ref-type-enum'
import type { ArchiveVolumeAutoCreatePendingStatusCode } from '@/types/enums/archive-volume-auto-create-pending-status-enum'
import type { ArchiveVolumeEventTypeCode } from '@/types/enums/archive-volume-event-type-enum'
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
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'
import {
  ALL_ARCHIVE_ACCESS_STATUS_CODES,
  ArchiveAccessStatusCode,
  ArchiveAccessStatusDescription,
} from '@/types/enums/archive-access-status-enum'
import {
  ALL_ARCHIVE_APPRAISAL_STATUS_CODES,
  ArchiveAppraisalStatusCode,
  ArchiveAppraisalStatusDescription,
} from '@/types/enums/archive-appraisal-status-enum'
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
import {
  ALL_ARCHIVE_INTEGRITY_STATUS_CODES,
  ArchiveIntegrityStatusCode,
  ArchiveIntegrityStatusDescription,
} from '@/types/enums/archive-integrity-status-enum'
import { ArchiveMaterialSubmissionStatusCode } from '@/types/enums/archive-material-submission-status-enum'
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
import {
  ALL_ARCHIVE_TRANSFER_STATUS_CODES,
  ArchiveTransferStatusCode,
  ArchiveTransferStatusDescription,
} from '@/types/enums/archive-transfer-status-enum'
import {
  ALL_ARCHIVE_VOLUME_EVENT_TYPE_CODES,
  ArchiveVolumeEventTypeDescription,
} from '@/types/enums/archive-volume-event-type-enum'
import {
  ALL_ARCHIVE_VOLUME_SOURCE_TYPE_CODES,
  ArchiveVolumeSourceTypeCode,
  ArchiveVolumeSourceTypeDescription,
} from '@/types/enums/archive-volume-source-type-enum'
import {
  ALL_ARCHIVE_VOLUME_STATUS_CODES,
  ArchiveVolumeStatusCode,
  ArchiveVolumeStatusDescription,
} from '@/types/enums/archive-volume-status-enum'
import { ScanBatchQualityFlagCode } from '@/types/enums/scan-batch-quality-flag-enum'

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
  ALL_ARCHIVE_EXTERNAL_IMPORT_TYPE_CODES,
  ArchiveExternalImportTypeCode,
  ArchiveExternalImportTypeDescription,
} from '@/types/enums/archive-external-import-type-enum'
export {
  ALL_ARCHIVE_IMPORT_BATCH_STATUS_CODES,
  ArchiveImportBatchStatusCode,
  ArchiveImportBatchStatusDescription,
} from '@/types/enums/archive-import-batch-status-enum'
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
export { ScanBatchQualityFlagCode } from '@/types/enums/scan-batch-quality-flag-enum'

export const ARCHIVE_VOLUME_STATUS_TONE: Record<
  ArchiveVolumeStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ArchiveVolumeStatusCode.DRAFT]: 'gray',
  [ArchiveVolumeStatusCode.COLLECTING]: 'blue',
  [ArchiveVolumeStatusCode.SUBMITTED]: 'orange',
  [ArchiveVolumeStatusCode.STORED]: 'green',
  [ArchiveVolumeStatusCode.ARCHIVED_DESTROYED]: 'purple',
}

export const ARCHIVE_VOLUME_STATUS_OPTIONS: Array<{
  value: ArchiveVolumeStatusCode
  label: string
}> = ALL_ARCHIVE_VOLUME_STATUS_CODES.map((value) => ({
  value,
  label: ArchiveVolumeStatusDescription[value],
}))

export const ARCHIVE_VOLUME_SOURCE_TYPE_OPTIONS: Array<{
  value: ArchiveVolumeSourceTypeCode
  label: string
}> = ALL_ARCHIVE_VOLUME_SOURCE_TYPE_CODES.map((value) => ({
  value,
  label: ArchiveVolumeSourceTypeDescription[value],
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

export const ARCHIVE_INTEGRITY_STATUS_OPTIONS: Array<{
  value: ArchiveIntegrityStatusCode
  label: string
}> = ALL_ARCHIVE_INTEGRITY_STATUS_CODES.map((value) => ({
  value,
  label: ArchiveIntegrityStatusDescription[value],
}))

export const ARCHIVE_VOLUME_SOURCE_TYPE_TONE: Record<
  ArchiveVolumeSourceTypeCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ArchiveVolumeSourceTypeCode.ONLINE_MARKING]: 'blue',
  [ArchiveVolumeSourceTypeCode.OFFLINE_MARKED]: 'orange',
  [ArchiveVolumeSourceTypeCode.HISTORY_IMPORT]: 'gray',
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

export const ARCHIVE_TRANSFER_STATUS_OPTIONS: Array<{
  value: ArchiveTransferStatusCode
  label: string
}> = ALL_ARCHIVE_TRANSFER_STATUS_CODES.map((value) => ({
  value,
  label: ArchiveTransferStatusDescription[value],
}))

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

export const ARCHIVE_APPRAISAL_STATUS_OPTIONS: Array<{
  value: ArchiveAppraisalStatusCode
  label: string
}> = ALL_ARCHIVE_APPRAISAL_STATUS_CODES.map((value) => ({
  value,
  label: ArchiveAppraisalStatusDescription[value],
}))

export const ARCHIVE_DESTRUCTION_STATUS_TONE: Record<
  ArchiveDestructionStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ArchiveDestructionStatusCode.NONE]: 'gray',
  [ArchiveDestructionStatusCode.REQUESTED]: 'orange',
  [ArchiveDestructionStatusCode.APPROVED]: 'blue',
  [ArchiveDestructionStatusCode.EXECUTING]: 'blue',
  [ArchiveDestructionStatusCode.EXECUTED]: 'green',
  [ArchiveDestructionStatusCode.FAILED]: 'red',
  [ArchiveDestructionStatusCode.SUPERVISED]: 'purple',
  [ArchiveDestructionStatusCode.LEDGER_ARCHIVED]: 'gray',
}

export const ARCHIVE_MATERIAL_TYPE_OPTIONS: Array<{
  value: ArchiveMaterialTypeCode
  label: string
}> = ALL_ARCHIVE_MATERIAL_TYPE_CODES.map((value) => ({
  value,
  label: ArchiveMaterialTypeDescription[value],
}))

export const ARCHIVE_REMEDIATION_STATUS_TONE: Record<
  ArchiveRemediationStatusCode,
  'gray' | 'blue' | 'orange' | 'green'
> = {
  [ArchiveRemediationStatusCode.OPEN]: 'orange',
  [ArchiveRemediationStatusCode.IN_PROGRESS]: 'blue',
  [ArchiveRemediationStatusCode.RESUBMITTED]: 'green',
  [ArchiveRemediationStatusCode.CLOSED]: 'gray',
}

export const ARCHIVE_EVALUATION_CAMPAIGN_STATUS_OPTIONS: Array<{
  value: ArchiveEvaluationCampaignStatusCode
  label: string
}> = ALL_ARCHIVE_EVALUATION_CAMPAIGN_STATUS_CODES.map((value) => ({
  value,
  label: ArchiveEvaluationCampaignStatusDescription[value],
}))

export interface ArchiveVolumeVO {
  volumeId: string
  examId?: string
  relatedExamId?: string
  relatedExamName?: string
  relatedExamNo?: string
  archiveNo: string
  archiveTitle: string
  courseId?: string
  departmentId?: string
  departmentName?: string
  teachingClassName?: string
  academicYear?: string
  semester?: SemesterCode
  /** 考试性质（考次），ExamKind 枚举码 */
  examKind?: ExamKindCode
  templateSetCode?: string
  sourceType: ArchiveVolumeSourceTypeCode
  volumeStatus: ArchiveVolumeStatusCode
  integrityStatus: ArchiveIntegrityStatusCode
  transferStatus: ArchiveTransferStatusCode
  appraisalStatus?: ArchiveAppraisalStatusCode
  destructionStatus?: ArchiveDestructionStatusCode
  scoreSource?: ArchiveScoreSourceCode
  securityLevel?: ArchiveSecurityLevelCode
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
}

export interface ArchiveVolumeSearchHitVO {
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
  = 'materials' | 'integrity' | 'catalog' | 'selfCheck' | 'submit'

export const ArchiveVolumeSubmitChecklistPhaseDescription: Record<
  ArchiveVolumeSubmitChecklistPhaseKey,
  string
> = {
  materials: '材料收齐',
  integrity: '自检与四性',
  catalog: '编制目录',
  selfCheck: '自查清单',
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

export interface ArchiveVolumeDetailVO {
  volume: ArchiveVolumeVO
  materials: ArchiveVolumeMaterialVO[]
  events: ArchiveVolumeEventVO[]
  latestFourPropertyCheck?: ArchiveFourPropertyCheckVO
  fourPropertyStale?: boolean
  hasOpenRemediationTask?: boolean
  /** 是否存在 OPEN/IN_PROGRESS/RESUBMITTED 整改任务，阻断提交 */
  hasBlockingRemediationForSubmit?: boolean
  /** 最近一次鉴定决议 */
  appraisalDecision?: ArchiveAppraisalDecisionCode
  /** 最近一次销毁申请人 */
  destructionRequestUserId?: string
  latestIntegrityCheck?: ArchiveIntegrityCheckVO
  /** 当前用户是否具备卷材料登记/补交写权限 */
  canManageMaterials?: boolean
  /** 当前用户是否具备 STORED 卷鉴定/销毁管理权限 */
  canManageAppraisal?: boolean
  /** 当前用户是否具备该院系 ARCHIVE_ADMIN 职责 */
  canManageArchiveAdmin?: boolean
  /** 当前用户是否可确认卷密级定密标记 */
  canConfirmSecurityMark?: boolean
  /** 当前用户是否可变更卷密级 */
  canUpdateSecurityLevel?: boolean
  /** 最近一次移交验收记录 */
  latestTransferRecord?: ArchiveVolumeTransferRecordVO
  /** 当前用户待处理整改任务 */
  viewerRemediationTask?: ArchiveRemediationTaskVO
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
}

export interface ArchiveVolumeTransferRecordVO {
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

export interface ArchiveVolumeAppraisalFlowRecordVO {
  eventId?: string
  eventType?: ArchiveVolumeEventTypeCode
  actionLabel?: string
  appraisalStatus?: ArchiveAppraisalStatusCode
  operatorUserId?: string
  operatorNickName?: string
  reason?: string
  occurredAt?: string
}

export interface ArchiveVolumeDestructionFlowRecordVO {
  eventId?: string
  eventType?: ArchiveVolumeEventTypeCode
  actionLabel?: string
  destructionStatus?: ArchiveDestructionStatusCode
  operatorUserId?: string
  operatorNickName?: string
  reason?: string
  occurredAt?: string
}

export interface ArchiveVolumeMaterialVO {
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
}

export const ARCHIVE_MATERIAL_SUBMISSION_STATUS_TONE: Record<
  ArchiveMaterialSubmissionStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  [ArchiveMaterialSubmissionStatusCode.MISSING]: 'red',
  [ArchiveMaterialSubmissionStatusCode.SUBMITTED]: 'green',
  [ArchiveMaterialSubmissionStatusCode.DELAY_ALLOWED]: 'orange',
  [ArchiveMaterialSubmissionStatusCode.OVERDUE]: 'red',
  [ArchiveMaterialSubmissionStatusCode.WAIVED_WITH_REASON]: 'purple',
}

export const ARCHIVE_VOLUME_EVENT_TYPE_OPTIONS: Array<{
  value: ArchiveVolumeEventTypeCode
  label: string
}> = ALL_ARCHIVE_VOLUME_EVENT_TYPE_CODES.map((value) => ({
  value,
  label: ArchiveVolumeEventTypeDescription[value],
}))

export const ARCHIVE_REMEDIATION_DIAGNOSTIC_CODE_OPTIONS: Array<{
  value: ArchiveRemediationDiagnosticCode
  label: string
}> = ALL_ARCHIVE_REMEDIATION_DIAGNOSTIC_CODES.map((value) => ({
  value,
  label: ArchiveRemediationDiagnosticDescription[value],
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
  label: ArchiveAccessStatusDescription[value],
}))

export const ARCHIVE_SECURITY_LEVEL_OPTIONS: Array<{
  value: ArchiveSecurityLevelCode
  label: string
}> = ALL_ARCHIVE_SECURITY_LEVEL_CODES.map((value) => ({
  value,
  label: ArchiveSecurityLevelDescription[value],
}))

export const ARCHIVE_EXAM_FORM_OPTIONS: Array<{ value: ArchiveExamFormCode, label: string }>
  = ALL_ARCHIVE_EXAM_FORM_CODES.map((value) => ({
    value,
    label: ArchiveExamFormDescription[value],
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

export interface ArchiveVolumeStatisticsVO {
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

export interface ArchiveRemediationEvidenceVO {
  evidenceId: string
  taskId?: string
  fileId: string
  fileName: string
  fileSize?: number
  evidenceStatus: ArchiveRemediationEvidenceStatusCode
  createTime?: string
}

export interface ArchiveRemediationTaskVO {
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
  dueTime?: string
  closedTime?: string
  createTime?: string
  verificationComment?: string
  verifiedByUserId?: string
  verifierNickName?: string
  verifiedTime?: string
  statusHistory?: ArchiveRemediationTaskStatusHistoryVO[]
  evidenceItems?: ArchiveRemediationEvidenceVO[]
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

export interface ArchiveEvaluationCampaignVO {
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
}

export interface ArchiveEvaluationVolumeReadinessVO {
  volumeId: string
  archiveNo?: string
  archiveTitle?: string
  teachingClassName?: string
  catalogReady?: boolean
  integrityReady?: boolean
  fourPropertyReady?: boolean
  transferReady?: boolean
  overallReady?: boolean
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
  studentNo?: string
  studentName?: string
  mineOnly?: boolean
  integrityFailedOnly?: boolean
  archiveOverdueOnly?: boolean
  delaySubmissionOverdueOnly?: boolean
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

export interface ArchiveVolumeMaterialSearchProfileVO {
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
): Promise<PageResult<ArchiveVolumeVO>> {
  return http.post<PageResult<ArchiveVolumeVO>>('/api/mark/archive-volumes/page', request)
}

export function searchArchiveVolumes(
  request: ArchiveVolumeSearchRequest,
): Promise<PageResult<ArchiveVolumeSearchHitVO>> {
  return http.post<PageResult<ArchiveVolumeSearchHitVO>>(
    '/api/mark/archive-volumes/search',
    request,
  )
}

export function listArchiveVolumeSearchProfiles(): Promise<ArchiveVolumeMaterialSearchProfileVO[]> {
  return http.post<ArchiveVolumeMaterialSearchProfileVO[]>(
    '/api/mark/archive-volumes/search/profiles/list',
    {},
  )
}

export function saveArchiveVolumeSearchProfile(
  request: ArchiveVolumeMaterialSearchProfileSaveRequest,
): Promise<ArchiveVolumeMaterialSearchProfileVO> {
  return http.post<ArchiveVolumeMaterialSearchProfileVO>(
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
}

export function suggestArchiveVolumeMaterialTags(
  request: ArchiveVolumeMaterialTagSuggestRequest = {},
): Promise<string[]> {
  return http.post<string[]>('/api/mark/archive-volumes/materials/tags/suggest', request)
}

export function getArchiveVolumeDetail(volumeId: string): Promise<ArchiveVolumeDetailVO> {
  return http.post<ArchiveVolumeDetailVO>('/api/mark/archive-volumes/detail', { volumeId })
}

export function pageSupervisionArchiveVolumes(
  request: ArchiveVolumePageRequest,
): Promise<PageResult<ArchiveVolumeVO>> {
  return http.post<PageResult<ArchiveVolumeVO>>(
    '/api/mark/archive-volumes/supervision/volumes/page',
    request,
  )
}

export function getSupervisionArchiveVolumeDetail(
  volumeId: string,
): Promise<ArchiveVolumeDetailVO> {
  return http.post<ArchiveVolumeDetailVO>('/api/mark/archive-volumes/supervision/volumes/detail', {
    volumeId,
  })
}

export function getSupervisionArchiveStatistics(
  request: ArchiveVolumeStatisticsRequest,
): Promise<ArchiveVolumeStatisticsVO> {
  return http.post<ArchiveVolumeStatisticsVO>(
    '/api/mark/archive-volumes/supervision/statistics',
    request,
  )
}

export function listSupervisionRemediationTasks(): Promise<ArchiveRemediationTaskVO[]> {
  return http.post<ArchiveRemediationTaskVO[]>(
    '/api/mark/archive-volumes/supervision/remediation/list',
    {},
  )
}

export function listSupervisionCampaigns(): Promise<ArchiveEvaluationCampaignVO[]> {
  return http.post<ArchiveEvaluationCampaignVO[]>(
    '/api/mark/archive-volumes/supervision/campaign/list',
    {},
  )
}

export function listEvaluationCampaigns(): Promise<ArchiveEvaluationCampaignVO[]> {
  return http.post<ArchiveEvaluationCampaignVO[]>(
    '/api/mark/archive-volumes/evaluation/campaign/list',
    {},
  )
}

export interface ArchiveEvaluationCampaignReadinessPanelRequest extends QueryDto {
  campaignId: string
}

export function getEvaluationCampaignReadinessPanel(
  request: ArchiveEvaluationCampaignReadinessPanelRequest,
): Promise<PageResult<ArchiveEvaluationVolumeReadinessVO>> {
  return http.post<PageResult<ArchiveEvaluationVolumeReadinessVO>>(
    '/api/mark/archive-volumes/evaluation/campaign/readiness-panel',
    request,
  )
}

export function getRemediationTask(taskId: string): Promise<ArchiveRemediationTaskVO> {
  return http.post<ArchiveRemediationTaskVO>('/api/mark/archive-volumes/remediation/detail', {
    taskId,
  })
}

export function listRemediationTasksByCampaign(
  campaignId: string,
): Promise<ArchiveRemediationTaskVO[]> {
  return http.post<ArchiveRemediationTaskVO[]>(
    '/api/mark/archive-volumes/remediation/list-by-campaign',
    { campaignId },
  )
}

export function updateRemediationTask(
  request: ArchiveRemediationTaskUpdateRequest,
): Promise<ArchiveRemediationTaskVO> {
  return http.post<ArchiveRemediationTaskVO>(
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
): Promise<ArchiveRemediationEvidenceVO> {
  return http.post<ArchiveRemediationEvidenceVO>(
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
): Promise<ArchiveRemediationTaskVO> {
  return http.post<ArchiveRemediationTaskVO>(
    '/api/mark/archive-volumes/remediation/create',
    request,
  )
}

export function listOpenRemediationTasks(): Promise<ArchiveRemediationTaskVO[]> {
  return http.post<ArchiveRemediationTaskVO[]>('/api/mark/archive-volumes/remediation/list', {})
}

export function remindArchiveDue(volumeId: string): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/remind', { volumeId })
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
): Promise<ArchiveEvaluationCampaignVO> {
  return http.post<ArchiveEvaluationCampaignVO>(
    '/api/mark/archive-volumes/evaluation/campaign/save',
    request,
  )
}

export interface ArchiveEvaluationExportVO {
  exportFileId: string
  volumeCount?: number
}

/** 评估材料包导出范围说明（与后端 resolveCampaignExportVolumeIds 一致） */
export const ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT
  = '含本批次学年学期内已提交/已入库/收集中卷（整改任务关联的收集中卷已包含在内；不含线上阅卷自动建卷失败诊断卷）'

export function exportEvaluationPackage(campaignId: string): Promise<ArchiveEvaluationExportVO> {
  return http.post<ArchiveEvaluationExportVO>('/api/mark/archive-volumes/evaluation/export', {
    campaignId,
  })
}

export function exportEvaluationArchivePackage(
  campaignId: string,
): Promise<ArchiveEvaluationExportVO> {
  return http.post<ArchiveEvaluationExportVO>(
    '/api/mark/archive-volumes/evaluation/export-archive',
    { campaignId },
  )
}

export interface ArchiveReadinessMatrixRequest {
  endAcademicYear: string
  endSemester: SemesterCode
  termCount?: number
  departmentId?: string
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

export interface ArchiveReadinessMatrixVO {
  endAcademicYear: string
  endSemester: SemesterCode
  termCount: number
  termColumns: ArchiveReadinessTermColumnVO[]
  rows: ArchiveReadinessMatrixRowVO[]
}

export function getSupervisionReadinessMatrix(
  request: ArchiveReadinessMatrixRequest,
): Promise<ArchiveReadinessMatrixVO> {
  return http.post<ArchiveReadinessMatrixVO>(
    '/api/mark/archive-volumes/supervision/readiness-matrix',
    request,
  )
}

export interface ArchiveVolumeMaterialBatchRegisterRequest {
  volumeId: string
  materials: ArchiveVolumeMaterialRegisterRequest[]
}

export function batchRegisterArchiveVolumeMaterials(
  request: ArchiveVolumeMaterialBatchRegisterRequest,
): Promise<ArchiveVolumeMaterialVO[]> {
  return http.post<ArchiveVolumeMaterialVO[]>(
    '/api/mark/archive-volumes/materials/batch-register',
    request,
  )
}

export function generateArchiveVolumeExamAnalysisReport(
  volumeId: string,
): Promise<ArchiveVolumeMaterialVO> {
  return http.post<ArchiveVolumeMaterialVO>(
    '/api/mark/archive-volumes/materials/generate/exam-analysis',
    { volumeId },
  )
}

export function generateArchiveVolumeCourseObjectiveReport(
  volumeId: string,
): Promise<ArchiveVolumeMaterialVO> {
  return http.post<ArchiveVolumeMaterialVO>(
    '/api/mark/archive-volumes/materials/generate/course-objective-report',
    { volumeId },
  )
}

export interface ArchiveVolumeMaterialDelayAllowRequest {
  volumeId: string
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  delayAllowedTime: string
  delayResponsibleUserId: string
  missingReason?: string
}

export function allowArchiveMaterialDelay(
  request: ArchiveVolumeMaterialDelayAllowRequest,
): Promise<ArchiveVolumeMaterialVO> {
  return http.post<ArchiveVolumeMaterialVO>(
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
): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/integrity/waive', request)
}

export interface ArchiveVolumeSecurityMarkConfirmRequest {
  volumeId: string
  reason?: string
}

export function confirmArchiveVolumeSecurityMark(
  request: ArchiveVolumeSecurityMarkConfirmRequest,
): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/security/confirm-mark', request)
}

export interface ArchiveVolumeSecurityLevelUpdateRequest {
  volumeId: string
  securityLevel: ArchiveSecurityLevelCode
  reason: string
}

export function updateArchiveVolumeSecurityLevel(
  request: ArchiveVolumeSecurityLevelUpdateRequest,
): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/security/update-level', request)
}

export interface ArchiveVolumeMaterialWaiveRequest {
  volumeId: string
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  reason: string
}

export function waiveArchiveMaterialMissing(
  request: ArchiveVolumeMaterialWaiveRequest,
): Promise<ArchiveVolumeMaterialVO> {
  return http.post<ArchiveVolumeMaterialVO>(
    '/api/mark/archive-volumes/materials/waive-missing',
    request,
  )
}

export interface ArchiveExternalImportRequest {
  sourceSystem: string
  sourceFileId: string
  importType: ArchiveExternalImportTypeCode
}

export interface ArchiveExternalImportResultVO {
  batchId: string
  batchNo: string
  batchStatus: ArchiveImportBatchStatusCode
  totalCount: number
  successCount: number
  failureCount: number
  failureRows?: ArchiveExternalImportFailureRowVO[]
}

export interface ArchiveExternalImportFailureRowVO {
  rowNo?: number
  failureReason?: string
}

export interface ArchiveExcelFileVO {
  fileName: string
  fileContentBase64: string
}

export interface ArchiveCoursePlatformSyncRequest {
  idempotencyKey: string
  volumeId: string
  sourceSystem: string
  materials: ArchiveVolumeMaterialRegisterRequest[]
}

export function syncArchiveCoursePlatform(
  request: ArchiveCoursePlatformSyncRequest,
): Promise<ArchiveVolumeMaterialVO[]> {
  return http.post<ArchiveVolumeMaterialVO[]>(
    '/api/mark/archive-volumes/sync/course-platform',
    request,
  )
}

export interface ArchiveVolumeExamGateVO {
  examId: string
  examClosed?: boolean
  allScoresPublished?: boolean
  gateOpen?: boolean
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

export function getArchiveVolumeExamGate(examId: string): Promise<ArchiveVolumeExamGateVO> {
  return http.post<ArchiveVolumeExamGateVO>('/api/mark/archive-volumes/exam/archive-gate', {
    examId,
  })
}

export function retryArchiveVolumeAutoCreate(examId: string): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/exam/retry-auto-create', { examId })
}

export interface ArchiveVolumeAccessRecordVO {
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
}

export interface ArchiveIntegrityCheckVO {
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

export interface ArchiveFourPropertyCheckVO {
  volumeId: string
  checkId?: string
  authenticityPassed?: boolean
  reliabilityPassed?: boolean
  integrityPassed?: boolean
  usabilityPassed?: boolean
  securityPassed?: boolean
  overallPassed?: boolean
  diagnostic?: string
  checkedTime?: string
}

export interface ArchiveVolumeExportVO {
  exportFileId: string
  manifestChecksum?: string
  materialCount?: number
  /** 导出包内实际文件数 */
  fileCount?: number
  /** 导出包 SHA256 */
  packageChecksumSha256?: string
}

export interface ArchiveMaterialCatalogTemplateVO {
  templateItemId: string
  examForm?: ArchiveExamFormCode
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  catalogName?: string
  requiredFlag?: boolean
  delayAllowedFlag?: boolean
  sortOrder?: number
}

export interface OfflineMarkedArchiveCreateRequest {
  courseId: string
  teachingClassId?: string
  departmentId?: string
  departmentName?: string
  teachingClassName?: string
  academicYear: string
  semester: SemesterCode
  relatedExamId?: string
  examForm?: ArchiveExamFormCode
  templateSetCode: string
  archiveNo?: string
  archiveTitle: string
  scoreSource: ArchiveScoreSourceCode
  scoreCompletionStatus?: ArchiveScoreCompletionStatusCode
  scoreProofFileId?: string
  securityLevel: ArchiveSecurityLevelCode
  retentionYears?: number
  permanentRetention?: boolean
  responsibleUserId?: string
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

export interface ArchiveMaterialCatalogTemplateSaveRequest {
  items: ArchiveCatalogTemplateSaveItemRequest[]
}

export interface ArchiveCatalogTemplateSaveItemRequest {
  examForm?: ArchiveExamFormCode
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  catalogName: string
  requiredFlag: boolean
  delayAllowedFlag?: boolean
  sortOrder: number
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
  registerFileId?: string
}

export interface ArchiveScoreCompletionConfirmRequest {
  volumeId: string
  scoreCompletionStatus: ArchiveScoreCompletionStatusCode
  scoreProofFileId?: string
}

export function createOfflineArchiveVolume(
  request: OfflineMarkedArchiveCreateRequest,
): Promise<string> {
  return http.post<string>('/api/mark/archive-volumes/offline/create', request)
}

export function registerArchiveVolumeMaterial(
  request: ArchiveVolumeMaterialRegisterRequest,
): Promise<ArchiveVolumeMaterialVO> {
  return http.post<ArchiveVolumeMaterialVO>('/api/mark/archive-volumes/materials/register', request)
}

export interface ArchiveVolumeMaterialOcrTriggerRequest {
  materialId: string
}

export function triggerArchiveVolumeMaterialOcr(
  materialId: string,
): Promise<ArchiveVolumeMaterialVO> {
  return http.post<ArchiveVolumeMaterialVO>('/api/mark/archive-volumes/materials/ocr/trigger', {
    materialId,
  })
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

export interface DocumentMaterialOcrDetailVO {
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
): Promise<DocumentMaterialOcrDetailVO | null> {
  return http.post<DocumentMaterialOcrDetailVO | null>(
    '/api/mark/archive-volumes/materials/document-ocr/detail',
    {
      materialId,
    },
  )
}

export function checkArchiveVolumeIntegrity(volumeId: string): Promise<ArchiveIntegrityCheckVO> {
  return http.post<ArchiveIntegrityCheckVO>('/api/mark/archive-volumes/integrity/check', {
    volumeId,
  })
}

export function checkArchiveVolumeFourProperty(
  volumeId: string,
): Promise<ArchiveFourPropertyCheckVO> {
  return http.post<ArchiveFourPropertyCheckVO>('/api/mark/archive-volumes/four-property/check', {
    volumeId,
  })
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

export interface ArchiveVolumeCatalogVO {
  volumeId: string
  catalogStatus: ArchiveCatalogStatusCode
  lines: ArchiveVolumeCatalogLineVO[]
  confirmedTime?: string
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
  lines: ArchiveVolumeCatalogLineSaveRequest[]
}

export interface ArchiveVolumeCatalogExportVO {
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

export interface ArchiveVolumeSelfCheckListVO {
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

export interface ArchiveVolumeSelfCheckExportVO {
  exportFileId?: string
  itemCount?: number
}

export interface ArchiveVolumeSubmitChecklistVO {
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
  signatoryName?: string
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
): Promise<ArchiveVolumeSubmitChecklistVO> {
  return http.post<ArchiveVolumeSubmitChecklistVO>(
    '/api/mark/archive-volumes/submit/checklist/preview',
    { volumeId },
  )
}

export function confirmArchiveVolumeSelfCheck(
  request: ArchiveVolumeSelfCheckConfirmRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/submit/self-check/confirm', request)
}

export function getArchiveVolumeCatalog(volumeId: string): Promise<ArchiveVolumeCatalogVO> {
  return http.post<ArchiveVolumeCatalogVO>('/api/mark/archive-volumes/catalog/get', { volumeId })
}

export function generateArchiveVolumeCatalogDraft(
  volumeId: string,
): Promise<ArchiveVolumeCatalogVO> {
  return http.post<ArchiveVolumeCatalogVO>('/api/mark/archive-volumes/catalog/generate-draft', {
    volumeId,
  })
}

export function saveArchiveVolumeCatalog(request: ArchiveVolumeCatalogSaveRequest): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/catalog/save', request)
}

export function confirmArchiveVolumeCatalog(volumeId: string): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/catalog/confirm', {
    volumeId,
  })
}

export function exportArchiveVolumeCatalog(
  volumeId: string,
): Promise<ArchiveVolumeCatalogExportVO> {
  return http.post<ArchiveVolumeCatalogExportVO>('/api/mark/archive-volumes/catalog/export', {
    volumeId,
  })
}

export function listArchiveVolumeSelfCheckItems(
  volumeId: string,
): Promise<ArchiveVolumeSelfCheckListVO> {
  return http.post<ArchiveVolumeSelfCheckListVO>(
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
): Promise<ArchiveVolumeSelfCheckExportVO> {
  return http.post<ArchiveVolumeSelfCheckExportVO>('/api/mark/archive-volumes/self-check/export', {
    volumeId,
  })
}

export interface ArchiveVolumeEventExportVO {
  exportFileId: string
  eventCount: number
}

export function listArchiveVolumeTransferRecords(
  volumeId: string,
): Promise<ArchiveVolumeTransferRecordVO[]> {
  return http.post<ArchiveVolumeTransferRecordVO[]>(
    '/api/mark/archive-volumes/transfer-records/list',
    { volumeId },
  )
}

export function listArchiveVolumeAppraisalFlowRecords(
  volumeId: string,
): Promise<ArchiveVolumeAppraisalFlowRecordVO[]> {
  return http.post<ArchiveVolumeAppraisalFlowRecordVO[]>(
    '/api/mark/archive-volumes/appraisal-flow-records/list',
    { volumeId },
  )
}

export function listArchiveVolumeDestructionFlowRecords(
  volumeId: string,
): Promise<ArchiveVolumeDestructionFlowRecordVO[]> {
  return http.post<ArchiveVolumeDestructionFlowRecordVO[]>(
    '/api/mark/archive-volumes/destruction-flow-records/list',
    { volumeId },
  )
}

export function exportArchiveVolumeEvents(volumeId: string): Promise<ArchiveVolumeEventExportVO> {
  return http.post<ArchiveVolumeEventExportVO>('/api/mark/archive-volumes/events/export', {
    volumeId,
  })
}

export function submitArchiveVolume(request: ArchiveVolumeSubmitRequest): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/submit', request)
}

export function approveArchiveVolumeTransfer(
  request: ArchiveVolumeTransferApproveRequest,
): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/transfer/approve', request)
}

export function rejectArchiveVolumeTransfer(
  request: ArchiveVolumeTransferRejectRequest,
): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/transfer/reject', request)
}

export function requestArchiveVolumeAccess(
  request: ArchiveVolumeAccessRequest,
): Promise<ArchiveVolumeAccessRecordVO> {
  return http.post<ArchiveVolumeAccessRecordVO>('/api/mark/archive-volumes/access/request', request)
}

export function approveArchiveVolumeAccess(
  request: ArchiveVolumeAccessDecisionRequest,
): Promise<ArchiveVolumeAccessRecordVO> {
  return http.post<ArchiveVolumeAccessRecordVO>('/api/mark/archive-volumes/access/approve', request)
}

export function rejectArchiveVolumeAccess(
  request: ArchiveVolumeAccessDecisionRequest,
): Promise<ArchiveVolumeAccessRecordVO> {
  return http.post<ArchiveVolumeAccessRecordVO>('/api/mark/archive-volumes/access/reject', request)
}

export function listArchiveVolumeAccessRecords(
  volumeId: string,
): Promise<ArchiveVolumeAccessRecordVO[]> {
  return http.post<ArchiveVolumeAccessRecordVO[]>('/api/mark/archive-volumes/access/records', {
    volumeId,
  })
}

export function pageOverdueArchiveVolumes(
  request: ArchiveVolumePageRequest,
): Promise<PageResult<ArchiveVolumeVO>> {
  return http.post<PageResult<ArchiveVolumeVO>>('/api/mark/archive-volumes/overdue/page', request)
}

export function getArchiveVolumeStatistics(
  request: ArchiveVolumeStatisticsRequest,
): Promise<ArchiveVolumeStatisticsVO> {
  return http.post<ArchiveVolumeStatisticsVO>('/api/mark/archive-volumes/statistics', request)
}

export function exportArchiveVolumeStatisticsExcel(
  request: ArchiveVolumeStatisticsRequest,
): Promise<ArchiveExcelFileVO> {
  return http.post<ArchiveExcelFileVO>('/api/mark/archive-volumes/statistics/export', request)
}

export function exportArchiveVolume(volumeId: string): Promise<ArchiveVolumeExportVO> {
  return http.post<ArchiveVolumeExportVO>('/api/mark/archive-volumes/export', { volumeId })
}

export function listArchiveCatalogTemplate(): Promise<ArchiveMaterialCatalogTemplateVO[]> {
  return http.post<ArchiveMaterialCatalogTemplateVO[]>(
    '/api/mark/archive-volumes/catalog-template/list',
    {},
  )
}

export function requestArchiveVolumeAppraisal(volumeId: string): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/appraisal/request', { volumeId })
}

export function approveArchiveVolumeAppraisal(volumeId: string): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/appraisal/approve', { volumeId })
}

export function rejectArchiveVolumeAppraisal(
  request: ArchiveVolumeAppraisalRejectRequest,
): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/appraisal/reject', request)
}

export function recordArchiveVolumeAppraisalOpinion(
  request: ArchiveVolumeAppraisalRequest,
): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/appraisal/record-opinion', request)
}

export function requestArchiveVolumeDestruction(
  request: ArchiveVolumeDestructionRequest,
): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/destruction/request', request)
}

export function approveArchiveVolumeDestruction(
  request: ArchiveVolumeDestructionApprovalRequest,
): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/destruction/approve', request)
}

export function executeArchiveVolumeDestruction(volumeId: string): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/destruction/execute', { volumeId })
}

export function confirmArchiveVolumeDestructionSupervision(
  request: ArchiveVolumeDestructionSuperviseRequest,
): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/destruction/supervise', request)
}

export function confirmArchiveVolumeScoreCompletion(
  request: ArchiveScoreCompletionConfirmRequest,
): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/score-completion/confirm', request)
}

export function batchRejectArchiveVolumeTransfer(
  request: ArchiveVolumeBatchRejectRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/transfer/batch-reject', request)
}

export function saveArchiveCatalogTemplate(
  request: ArchiveMaterialCatalogTemplateSaveRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/catalog-template/save', request)
}

export function listPendingArchiveAccessRecords(): Promise<ArchiveVolumeAccessRecordVO[]> {
  return http.post<ArchiveVolumeAccessRecordVO[]>(
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

export interface ArchiveTeachingAffairsScoreSyncRequest {
  volumeId: string
  externalSyncNo: string
  externalSourceSystem: string
  scoreCompletionStatus: ArchiveScoreCompletionStatusCode
  scoreProofFileId?: string
}

export interface ArchiveTeachingAffairsScoreSyncResponse {
  volumeId: string
  scoreCompletionStatus: ArchiveScoreCompletionStatusCode
  externalSyncNo: string
}

export function syncTeachingAffairsScoreCompletion(
  request: ArchiveTeachingAffairsScoreSyncRequest,
): Promise<ArchiveTeachingAffairsScoreSyncResponse> {
  return http.post<ArchiveTeachingAffairsScoreSyncResponse>(
    '/api/mark/archive-volumes/sync/teaching-affairs/score-completion',
    request,
  )
}

export interface ArchiveVolumeAccessLedgerPageRequest extends QueryDto {
  departmentId?: string
  accessStatus?: ArchiveAccessStatusCode
  applicantUserId?: string
}

export interface ArchiveVolumeAccessLedgerRowVO {
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
}

export function pageAccessLedger(
  request: ArchiveVolumeAccessLedgerPageRequest,
): Promise<PageResult<ArchiveVolumeAccessLedgerRowVO>> {
  return http.post<PageResult<ArchiveVolumeAccessLedgerRowVO>>(
    '/api/mark/archive-volumes/access/ledger/page',
    request,
  )
}

export interface ArchiveVolumeDestructionLedgerPageRequest extends QueryDto {
  departmentId?: string
  keyword?: string
}

export interface ArchiveVolumeDestructionLedgerRowVO {
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
): Promise<PageResult<ArchiveVolumeDestructionLedgerRowVO>> {
  return http.post<PageResult<ArchiveVolumeDestructionLedgerRowVO>>(
    '/api/mark/archive-volumes/destruction/ledger/page',
    request,
  )
}

export function exportDestructionLedgerExcel(
  request: ArchiveVolumeDestructionLedgerPageRequest,
): Promise<ArchiveExcelFileVO> {
  return http.post<ArchiveExcelFileVO>(
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
): Promise<ArchiveRemediationTaskVO> {
  return http.post<ArchiveRemediationTaskVO>(
    '/api/mark/archive-volumes/supervision/mark-problem',
    request,
  )
}

export interface ArchiveVolumeAuditPageRequest extends QueryDto {
  volumeId?: string
  eventType?: ArchiveVolumeEventTypeCode
}

export interface ArchiveVolumeAuditEventVO {
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

export function pageArchiveAuditEvents(
  request: ArchiveVolumeAuditPageRequest,
): Promise<PageResult<ArchiveVolumeAuditEventVO>> {
  return http.post<PageResult<ArchiveVolumeAuditEventVO>>(
    '/api/mark/archive-volumes/audit/page',
    request,
  )
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
  building: string
  room?: string
  cabinet: string
  slot?: string
  physicalLocationNote?: string
}

export interface ArchivePhysicalLocationVO {
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
): Promise<ArchiveVolumeVO> {
  return http.post<ArchiveVolumeVO>('/api/mark/archive-volumes/physical-location/update', request)
}

export function listArchivePhysicalLocationHistory(
  request: ArchivePhysicalLocationHistoryRequest,
): Promise<ArchivePhysicalLocationVO[]> {
  return http.post<ArchivePhysicalLocationVO[]>(
    '/api/mark/archive-volumes/physical-location/history/list',
    request,
  )
}

export interface ArchiveScanBatchSnapshotPageRequest extends QueryDto {
  volumeId: string
  batchQualityFlag?: ScanBatchQualityFlagCode
}

interface ArchiveScanBatchSnapshotPageResponse {
  volumeId?: string
  batches?: ArchiveScanBatchSnapshotItemVO[]
  total?: string
  pageNum?: number
  pageSize?: number
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
  materials?: ArchiveVolumeMaterialVO[]
}

export async function pageArchiveScanBatchSnapshots(
  request: ArchiveScanBatchSnapshotPageRequest,
): Promise<PageResult<ArchiveScanBatchSnapshotItemVO>> {
  const raw = await http.post<ArchiveScanBatchSnapshotPageResponse>(
    '/api/mark/archive-volumes/scan-batch-snapshots/page',
    request,
  )
  const pageNum = raw.pageNum ?? request.pageNum ?? 1
  const pageSize = raw.pageSize ?? request.pageSize ?? 10
  const totalText = raw.total ?? '0'
  const totalCount = Number(totalText)
  const pages
    = Number.isFinite(totalCount) && totalCount > 0 && pageSize > 0
      ? Math.ceil(totalCount / pageSize)
      : 0
  return {
    list: raw.batches ?? [],
    total: totalText,
    pageNum,
    pageSize,
    pages,
  }
}

export interface ArchiveScanBatchBatchActionRequest {
  volumeId: string
  workOrderIds: string[]
  actionReason?: string
}

export function batchRetryArchiveScanBatches(
  request: ArchiveScanBatchBatchActionRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/scan-batch-snapshots/batch-retry', request)
}

export function batchDiscardArchiveScanBatches(
  request: ArchiveScanBatchBatchActionRequest,
): Promise<void> {
  return http.post<void>('/api/mark/archive-volumes/scan-batch-snapshots/batch-discard', request)
}
