import type { PaperArchiveOcrStatusCode } from './paper-archive'
/**
 * 统一归档卷 API - 对接 edu-mark ArchiveVolumeController
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

export type ArchiveVolumeStatusCode
  = | 'DRAFT'
    | 'COLLECTING'
    | 'SUBMITTED'
    | 'STORED'
    | 'ARCHIVED_DESTROYED'

export const ARCHIVE_VOLUME_STATUS_LABEL: Record<ArchiveVolumeStatusCode, string> = {
  DRAFT: '草稿',
  COLLECTING: '收集中',
  SUBMITTED: '已提交待移交',
  STORED: '已入库',
  ARCHIVED_DESTROYED: '销毁清册归档',
}

export const ARCHIVE_VOLUME_STATUS_TONE: Record<
  ArchiveVolumeStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  DRAFT: 'gray',
  COLLECTING: 'blue',
  SUBMITTED: 'orange',
  STORED: 'green',
  ARCHIVED_DESTROYED: 'purple',
}

export type ArchiveVolumeSourceTypeCode
  = | 'ONLINE_MARKING'
    | 'OFFLINE_MARKED'
    | 'HISTORY_IMPORT'

export const ARCHIVE_VOLUME_SOURCE_TYPE_LABEL: Record<ArchiveVolumeSourceTypeCode, string> = {
  ONLINE_MARKING: '线上阅卷',
  OFFLINE_MARKED: '线下纯归档',
  HISTORY_IMPORT: '历史补录',
}

export type ArchiveIntegrityStatusCode
  = | 'UNKNOWN'
    | 'CHECKING'
    | 'PASSED'
    | 'FAILED'
    | 'WAIVED'

export const ARCHIVE_INTEGRITY_STATUS_LABEL: Record<ArchiveIntegrityStatusCode, string> = {
  UNKNOWN: '未检查',
  CHECKING: '检查中',
  PASSED: '已通过',
  FAILED: '未通过',
  WAIVED: '已授权豁免',
}

export const ARCHIVE_INTEGRITY_STATUS_TONE: Record<
  ArchiveIntegrityStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  UNKNOWN: 'gray',
  CHECKING: 'blue',
  PASSED: 'green',
  FAILED: 'red',
  WAIVED: 'orange',
}

export const ARCHIVE_VOLUME_SOURCE_TYPE_TONE: Record<
  ArchiveVolumeSourceTypeCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  ONLINE_MARKING: 'blue',
  OFFLINE_MARKED: 'orange',
  HISTORY_IMPORT: 'gray',
}

export type ArchiveTransferStatusCode
  = | 'NOT_SUBMITTED'
    | 'PENDING_REVIEW'
    | 'APPROVED'
    | 'REJECTED'

export const ARCHIVE_TRANSFER_STATUS_LABEL: Record<ArchiveTransferStatusCode, string> = {
  NOT_SUBMITTED: '未提交',
  PENDING_REVIEW: '待验收',
  APPROVED: '验收通过',
  REJECTED: '退回补正',
}

export const ARCHIVE_TRANSFER_STATUS_TONE: Record<
  ArchiveTransferStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  NOT_SUBMITTED: 'gray',
  PENDING_REVIEW: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
}

export type ArchiveAppraisalStatusCode
  = | 'NOT_DUE'
    | 'REMINDER_SENT'
    | 'REQUESTED'
    | 'APPROVED'
    | 'REJECTED'
    | 'OPINION_RECORDED'

export const ARCHIVE_APPRAISAL_STATUS_LABEL: Record<ArchiveAppraisalStatusCode, string> = {
  NOT_DUE: '未到期',
  REMINDER_SENT: '到期提醒',
  REQUESTED: '鉴定申请中',
  APPROVED: '鉴定审批通过',
  REJECTED: '鉴定驳回',
  OPINION_RECORDED: '鉴定意见已记录',
}

export const ARCHIVE_APPRAISAL_STATUS_TONE: Record<
  ArchiveAppraisalStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  NOT_DUE: 'gray',
  REMINDER_SENT: 'orange',
  REQUESTED: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
  OPINION_RECORDED: 'purple',
}

export type ArchiveDestructionStatusCode
  = | 'NONE'
    | 'REQUESTED'
    | 'APPROVED'
    | 'EXECUTING'
    | 'EXECUTED'
    | 'FAILED'
    | 'SUPERVISED'
    | 'LEDGER_ARCHIVED'

export const ARCHIVE_DESTRUCTION_STATUS_LABEL: Record<ArchiveDestructionStatusCode, string> = {
  NONE: '无',
  REQUESTED: '销毁申请中',
  APPROVED: '销毁已批准',
  EXECUTING: '销毁执行中',
  EXECUTED: '已销毁',
  FAILED: '销毁失败',
  SUPERVISED: '已监销',
  LEDGER_ARCHIVED: '清册已归档',
}

export const ARCHIVE_DESTRUCTION_STATUS_TONE: Record<
  ArchiveDestructionStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  NONE: 'gray',
  REQUESTED: 'orange',
  APPROVED: 'blue',
  EXECUTING: 'blue',
  EXECUTED: 'green',
  FAILED: 'red',
  SUPERVISED: 'purple',
  LEDGER_ARCHIVED: 'gray',
}

export type ArchiveScoreCompletionStatusCode
  = | 'PENDING'
    | 'COMPLETED'
    | 'VERIFIED'
    | 'NOT_REQUIRED'

export const ARCHIVE_SCORE_COMPLETION_STATUS_LABEL: Record<ArchiveScoreCompletionStatusCode, string> = {
  PENDING: '待确认',
  COMPLETED: '已完成',
  VERIFIED: '已核验',
  NOT_REQUIRED: '无需确认',
}

export type ArchiveMaterialTypeCode
  = | 'VOLUME_COVER'
    | 'VOLUME_CATALOG'
    | 'TEACHING_SYLLABUS'
    | 'ASSESSMENT_SYLLABUS'
    | 'TEACHING_SCHEDULE'
    | 'EXAM_PROPOSAL_REVIEW'
    | 'EXAM_PAPER_APPROVAL'
    | 'EXAM_SPECIFICATION'
    | 'QUESTION_BANK_PLAN'
    | 'BLANK_EXAM_PAPER_A'
    | 'BLANK_EXAM_PAPER_B'
    | 'RESERVE_EXAM_PAPER'
    | 'MAKEUP_EXAM_PAPER'
    | 'ANSWER_RUBRIC_A'
    | 'ANSWER_RUBRIC_B'
    | 'ANSWER_RUBRIC_RESERVE'
    | 'ANSWER_RUBRIC_MAKEUP'
    | 'COURSE_GRADING_BASIS'
    | 'GRADING_INSTRUCTION'
    | 'EXAM_FORM_CHANGE'
    | 'STUDENT_LEARNING_RECORD'
    | 'EXAM_VENUE_RECORD'
    | 'INVIGILATION_RECORD'
    | 'ATTENDANCE_SHEET'
    | 'PATROL_RECORD'
    | 'TRANSCRIPT'
    | 'ITEMIZED_SCORE'
    | 'EXAM_ANALYSIS'
    | 'COURSE_OBJECTIVE_REPORT'
    | 'TRAINING_OBJECTIVE_REPORT'
    | 'PROCESS_ASSESSMENT'
    | 'STUDENT_EXAM_PAPER'
    | 'ANSWER_SHEET'
    | 'OPTICAL_DISC'
    | 'PAPERLESS_EXAM_RESULT'
    | 'AUDIO_VIDEO'
    | 'THESIS'
    | 'WORK'
    | 'LAB_PRACTICE'

export const ARCHIVE_MATERIAL_TYPE_LABEL: Record<ArchiveMaterialTypeCode, string> = {
  VOLUME_COVER: '卷封面',
  VOLUME_CATALOG: '卷内目录',
  TEACHING_SYLLABUS: '教学大纲',
  ASSESSMENT_SYLLABUS: '考核大纲',
  TEACHING_SCHEDULE: '教学进度表',
  EXAM_PROPOSAL_REVIEW: '命题审核表',
  EXAM_PAPER_APPROVAL: '试卷审批表',
  EXAM_SPECIFICATION: '命题双向细目表',
  QUESTION_BANK_PLAN: '试题库建设及审核方案',
  BLANK_EXAM_PAPER_A: '空白试卷A卷',
  BLANK_EXAM_PAPER_B: '空白试卷B卷',
  RESERVE_EXAM_PAPER: '备用试题',
  MAKEUP_EXAM_PAPER: '补考试题',
  ANSWER_RUBRIC_A: 'A卷答案评分标准',
  ANSWER_RUBRIC_B: 'B卷答案评分标准',
  ANSWER_RUBRIC_RESERVE: '备用试题答案评分标准',
  ANSWER_RUBRIC_MAKEUP: '补考试题答案评分标准',
  COURSE_GRADING_BASIS: '课程考核评分依据',
  GRADING_INSTRUCTION: '阅卷说明',
  EXAM_FORM_CHANGE: '考试形式变更申请表',
  STUDENT_LEARNING_RECORD: '学生学习情况登记表',
  EXAM_VENUE_RECORD: '考场记录',
  INVIGILATION_RECORD: '监考记录',
  ATTENDANCE_SHEET: '签到表',
  PATROL_RECORD: '巡考记录',
  TRANSCRIPT: '成绩单',
  ITEMIZED_SCORE: '分项成绩',
  EXAM_ANALYSIS: '试卷分析',
  COURSE_OBJECTIVE_REPORT: '课程目标达成报告',
  TRAINING_OBJECTIVE_REPORT: '培养目标达成评价报告',
  PROCESS_ASSESSMENT: '过程性考核材料',
  STUDENT_EXAM_PAPER: '学生试卷',
  ANSWER_SHEET: '答题卡',
  OPTICAL_DISC: '光盘',
  PAPERLESS_EXAM_RESULT: '无纸化考试结果',
  AUDIO_VIDEO: '音视频',
  THESIS: '论文',
  WORK: '作品',
  LAB_PRACTICE: '实验实习材料',
}

export type ArchiveRemediationStatusCode
  = | 'OPEN'
    | 'IN_PROGRESS'
    | 'RESUBMITTED'
    | 'CLOSED'

export const ARCHIVE_REMEDIATION_STATUS_LABEL: Record<ArchiveRemediationStatusCode, string> = {
  OPEN: '待处理',
  IN_PROGRESS: '处理中',
  RESUBMITTED: '已重提',
  CLOSED: '已关闭',
}

export type ArchiveEvaluationCampaignStatusCode = 'ACTIVE' | 'CLOSED'

export const ARCHIVE_EVALUATION_CAMPAIGN_STATUS_LABEL: Record<ArchiveEvaluationCampaignStatusCode, string> = {
  ACTIVE: '进行中',
  CLOSED: '已关闭',
}

export interface ArchiveVolumeVO {
  volumeId: string
  examId?: string
  archiveNo: string
  archiveTitle: string
  courseId?: string
  departmentId?: string
  departmentName?: string
  teachingClassName?: string
  academicYear?: string
  semester?: string
  sourceType: ArchiveVolumeSourceTypeCode
  volumeStatus: ArchiveVolumeStatusCode
  integrityStatus: ArchiveIntegrityStatusCode
  transferStatus: ArchiveTransferStatusCode
  appraisalStatus?: ArchiveAppraisalStatusCode
  destructionStatus?: ArchiveDestructionStatusCode
  scoreSource?: ArchiveScoreSourceCode
  securityLevel?: ArchiveSecurityLevelCode
  retentionYears?: number
  retentionUntil?: string
  permanentRetention?: boolean
  responsibleUserId?: string
  scoreCompletionStatus: ArchiveScoreCompletionStatusCode
  archiveDueTime?: string
  createTime?: string
  fourPropertyStale?: boolean
  submitReady?: boolean
  /** 是否存在 OPEN/IN_PROGRESS/RESUBMITTED 整改任务，阻断提交 */
  hasBlockingRemediationForSubmit?: boolean
  /** 成绩证明是否满足提交前置条件 */
  scoreSubmitReady?: boolean
  /** 线上阅卷归档双门禁是否开放 */
  examGateOpen?: boolean
  /** 成绩证明文件 ID */
  scoreProofFileId?: string
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
  appraisalDecision?: 'RETAIN' | 'DESTROY'
  /** 最近一次销毁申请人 */
  destructionRequestUserId?: string
  latestIntegrityCheck?: ArchiveIntegrityCheckVO
  /** 当前用户是否具备卷材料登记/补交写权限 */
  canManageMaterials?: boolean
  /** 当前用户是否具备 STORED 卷鉴定/销毁管理权限 */
  canManageAppraisal?: boolean
  /** 当前用户是否具备该院系 ARCHIVE_ADMIN 职责 */
  canManageArchiveAdmin?: boolean
  /** 最近一次移交验收记录 */
  latestTransferRecord?: ArchiveVolumeTransferRecordVO
}

export interface ArchiveVolumeTransferRecordVO {
  transferStatus?: ArchiveTransferStatusCode
  submitUserId?: string
  submitTime?: string
  reviewerUserId?: string
  reviewedTime?: string
  rejectReason?: string
  /** DA/T93 移交信息包文件 ID */
  transferPackageFileId?: string
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
  ocrStatus?: PaperArchiveOcrStatusCode
  ocrFailureReason?: string
}

export type ArchiveMaterialSubmissionStatusCode
  = | 'MISSING'
    | 'SUBMITTED'
    | 'DELAY_ALLOWED'
    | 'OVERDUE'
    | 'WAIVED_WITH_REASON'

export const ARCHIVE_MATERIAL_SUBMISSION_STATUS_LABEL: Record<ArchiveMaterialSubmissionStatusCode, string> = {
  MISSING: '缺件',
  SUBMITTED: '已提交',
  DELAY_ALLOWED: '允许延迟补交',
  OVERDUE: '延迟已逾期',
  WAIVED_WITH_REASON: '缺失已授权',
}

export const ARCHIVE_MATERIAL_SUBMISSION_STATUS_TONE: Record<
  ArchiveMaterialSubmissionStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  MISSING: 'red',
  SUBMITTED: 'green',
  DELAY_ALLOWED: 'orange',
  OVERDUE: 'red',
  WAIVED_WITH_REASON: 'purple',
}

export type ArchiveMaterialMediaTypeCode
  = | 'PAPER'
    | 'ELECTRONIC'
    | 'AUDIO_VIDEO'
    | 'OPTICAL_DISC'
    | 'MIXED'

export type ArchiveVolumeEventTypeCode
  = | 'VOLUME_CREATED'
    | 'VOLUME_AUTO_CREATED'
    | 'AUTO_CREATE_FAILED'
    | 'MATERIAL_REGISTERED'
    | 'IMPORT_BATCH'
    | 'INTERNAL_AGGREGATE'
    | 'INTEGRITY_CHECKED'
    | 'SCORE_CONFIRMED'
    | 'SUBMITTED'
    | 'TRANSFER_APPROVED'
    | 'TRANSFER_REJECTED'
    | 'FOUR_PROPERTY_CHECKED'
    | 'ACCESS_REQUESTED'
    | 'ACCESS_APPROVED'
    | 'ACCESS_REJECTED'
    | 'ACCESS_EXPIRED'
    | 'APPRAISAL_REQUESTED'
    | 'APPRAISAL_APPROVED'
    | 'APPRAISAL_REJECTED'
    | 'APPRAISAL_OPINION_RECORDED'
    | 'DESTRUCTION_REQUESTED'
    | 'DESTRUCTION_APPROVED'
    | 'RETENTION_REMINDER'
    | 'ARCHIVE_DUE_UPCOMING'
    | 'ARCHIVE_DUE_REMINDER'
    | 'DELAY_SUBMISSION_OVERDUE'
    | 'DESTRUCTION_EXECUTION_STARTED'
    | 'DESTRUCTION_EXECUTED'
    | 'DESTRUCTION_SUPERVISED'
    | 'DESTRUCTION_FAILED'
    | 'REMEDIATION_ASSIGNED'
    | 'REMEDIATION_CLOSED'
    | 'APPRAISAL_RESET_ON_RECOLLECT'
    | 'DESTRUCTION_RESET_ON_RECOLLECT'
    | 'VOLUME_RECOLLECTING'

export const ARCHIVE_VOLUME_EVENT_TYPE_LABEL: Record<ArchiveVolumeEventTypeCode, string> = {
  VOLUME_CREATED: '建卷',
  VOLUME_AUTO_CREATED: '自动建卷',
  AUTO_CREATE_FAILED: '自动建卷失败',
  MATERIAL_REGISTERED: '材料登记',
  IMPORT_BATCH: '导入批次',
  INTERNAL_AGGREGATE: '内部聚合',
  INTEGRITY_CHECKED: '完整性检查',
  SCORE_CONFIRMED: '成绩确认',
  SUBMITTED: '提交归档',
  TRANSFER_APPROVED: '移交通过',
  TRANSFER_REJECTED: '移交退回',
  FOUR_PROPERTY_CHECKED: '四性检测',
  ACCESS_REQUESTED: '查阅申请',
  ACCESS_APPROVED: '查阅批准',
  ACCESS_REJECTED: '查阅驳回',
  ACCESS_EXPIRED: '查阅到期',
  APPRAISAL_REQUESTED: '鉴定申请',
  APPRAISAL_APPROVED: '鉴定审批通过',
  APPRAISAL_REJECTED: '鉴定审批驳回',
  APPRAISAL_OPINION_RECORDED: '鉴定意见已记录',
  DESTRUCTION_REQUESTED: '销毁申请',
  DESTRUCTION_APPROVED: '销毁审批',
  RETENTION_REMINDER: '保管到期提醒',
  ARCHIVE_DUE_UPCOMING: '归档时限临近',
  ARCHIVE_DUE_REMINDER: '归档时限逾期',
  DELAY_SUBMISSION_OVERDUE: '延迟补交逾期',
  DESTRUCTION_EXECUTION_STARTED: '销毁执行启动',
  DESTRUCTION_EXECUTED: '销毁执行完成',
  DESTRUCTION_SUPERVISED: '销毁监销确认',
  DESTRUCTION_FAILED: '销毁失败',
  REMEDIATION_ASSIGNED: '整改指派',
  REMEDIATION_CLOSED: '整改关闭',
  APPRAISAL_RESET_ON_RECOLLECT: '补材回退重置鉴定',
  DESTRUCTION_RESET_ON_RECOLLECT: '补材回退重置销毁',
  VOLUME_RECOLLECTING: '补材后需重新验收',
}

export type ArchiveAccessStatusCode
  = | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'ACTIVE'
    | 'EXPIRED'
    | 'CLOSED'

export const ARCHIVE_ACCESS_STATUS_LABEL: Record<ArchiveAccessStatusCode, string> = {
  PENDING: '待审批',
  APPROVED: '已批准',
  REJECTED: '已驳回',
  ACTIVE: '生效中',
  EXPIRED: '已过期',
  CLOSED: '已关闭',
}

export const ARCHIVE_ACCESS_STATUS_TONE: Record<
  ArchiveAccessStatusCode,
  'gray' | 'blue' | 'green' | 'red' | 'orange' | 'purple'
> = {
  PENDING: 'orange',
  APPROVED: 'blue',
  REJECTED: 'red',
  ACTIVE: 'green',
  EXPIRED: 'gray',
  CLOSED: 'gray',
}

export type ArchiveScoreSourceCode
  = | 'MARK_INTERNAL'
    | 'TEACHING_AFFAIRS'
    | 'OFFLINE_CONFIRMED'
    | 'NOT_REQUIRED'

export const ARCHIVE_SCORE_SOURCE_LABEL: Record<ArchiveScoreSourceCode, string> = {
  MARK_INTERNAL: 'mark 内部成绩',
  TEACHING_AFFAIRS: '教务系统',
  OFFLINE_CONFIRMED: '线下确认',
  NOT_REQUIRED: '无需成绩',
}

export type ArchiveSecurityLevelCode
  = | 'PUBLIC'
    | 'INTERNAL'
    | 'RESTRICTED'
    | 'CONFIDENTIAL'

export const ARCHIVE_SECURITY_LEVEL_LABEL: Record<ArchiveSecurityLevelCode, string> = {
  PUBLIC: '公开',
  INTERNAL: '内部',
  RESTRICTED: '限制',
  CONFIDENTIAL: '机密',
}

export type ArchiveExamFormCode
  = | 'WRITTEN_EXAM'
    | 'INSPECTION'
    | 'EXPERIMENT'
    | 'THESIS'
    | 'WORK'
    | 'DEFENSE'
    | 'PAPERLESS'

export const ARCHIVE_EXAM_FORM_LABEL: Record<ArchiveExamFormCode, string> = {
  WRITTEN_EXAM: '笔试',
  INSPECTION: '考查',
  EXPERIMENT: '实验',
  THESIS: '论文',
  WORK: '作品',
  DEFENSE: '答辩',
  PAPERLESS: '无纸化',
}

export type ArchiveMaterialSortRuleCode
  = | 'STUDENT_NO'
    | 'STUDENT_NAME'
    | 'CLASS_NAME'
    | 'SEAT_NO'
    | 'MANUAL_SEQUENCE'
    | 'CATALOG_ORDER'

export type ArchiveElectronicOriginalStatusCode
  = | 'ORIGINAL'
    | 'COPY'
    | 'SCANNED'
    | 'UNKNOWN'

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

export interface ArchiveRemediationTaskVO {
  taskId: string
  campaignId?: string
  volumeId: string
  taskTitle: string
  taskDescription?: string
  diagnosticCode?: string
  taskStatus: ArchiveRemediationStatusCode
  assigneeUserId?: string
  dueTime?: string
  closedTime?: string
}

export interface ArchiveRemediationTaskUpdateRequest {
  taskId: string
  taskTitle?: string
  taskDescription?: string
  diagnosticCode?: string
  taskStatus?: ArchiveRemediationStatusCode
  assigneeUserId?: string
  dueTime?: string
}

export interface ArchiveEvaluationCampaignVO {
  campaignId: string
  campaignName: string
  academicYear?: string
  semester?: string
  campaignStatus: ArchiveEvaluationCampaignStatusCode
  startTime?: string
  endTime?: string
  description?: string
}

export interface ArchiveVolumePageRequest extends QueryDto {
  keyword?: string
  departmentId?: string
  courseId?: string
  examId?: string
  academicYearSemester?: string
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
  keyword: string
  departmentId?: string
  courseId?: string
}

export interface ArchiveVolumeStatisticsRequest {
  academicYear?: string
  semester?: string
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
  return http.post<PageResult<ArchiveVolumeSearchHitVO>>('/api/mark/archive-volumes/search', request)
}

export function getArchiveVolumeDetail(volumeId: string): Promise<ArchiveVolumeDetailVO> {
  return http.post<ArchiveVolumeDetailVO>('/api/mark/archive-volumes/detail', { volumeId })
}

export function pageSupervisionArchiveVolumes(
  request: ArchiveVolumePageRequest,
): Promise<PageResult<ArchiveVolumeVO>> {
  return http.post<PageResult<ArchiveVolumeVO>>('/api/mark/archive-volumes/supervision/volumes/page', request)
}

export function getSupervisionArchiveVolumeDetail(volumeId: string): Promise<ArchiveVolumeDetailVO> {
  return http.post<ArchiveVolumeDetailVO>('/api/mark/archive-volumes/supervision/volumes/detail', { volumeId })
}

export function getSupervisionArchiveStatistics(
  request: ArchiveVolumeStatisticsRequest,
): Promise<ArchiveVolumeStatisticsVO> {
  return http.post<ArchiveVolumeStatisticsVO>('/api/mark/archive-volumes/supervision/statistics', request)
}

export function listSupervisionRemediationTasks(): Promise<ArchiveRemediationTaskVO[]> {
  return http.post<ArchiveRemediationTaskVO[]>('/api/mark/archive-volumes/supervision/remediation/list', {})
}

export function listSupervisionCampaigns(): Promise<ArchiveEvaluationCampaignVO[]> {
  return http.post<ArchiveEvaluationCampaignVO[]>('/api/mark/archive-volumes/supervision/campaign/list', {})
}

export function listEvaluationCampaigns(): Promise<ArchiveEvaluationCampaignVO[]> {
  return http.post<ArchiveEvaluationCampaignVO[]>('/api/mark/archive-volumes/evaluation/campaign/list', {})
}

export function getRemediationTask(taskId: string): Promise<ArchiveRemediationTaskVO> {
  return http.post<ArchiveRemediationTaskVO>('/api/mark/archive-volumes/remediation/detail', { taskId })
}

export function listRemediationTasksByCampaign(campaignId: string): Promise<ArchiveRemediationTaskVO[]> {
  return http.post<ArchiveRemediationTaskVO[]>('/api/mark/archive-volumes/remediation/list-by-campaign', { campaignId })
}

export function updateRemediationTask(
  request: ArchiveRemediationTaskUpdateRequest,
): Promise<ArchiveRemediationTaskVO> {
  return http.post<ArchiveRemediationTaskVO>('/api/mark/archive-volumes/remediation/update', request)
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
  return http.post<ArchiveRemediationTaskVO>('/api/mark/archive-volumes/remediation/create', request)
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
  semester?: string
  campaignStatus: ArchiveEvaluationCampaignStatusCode
  startTime?: string
  endTime?: string
  description?: string
}

export function saveEvaluationCampaign(
  request: ArchiveEvaluationCampaignSaveRequest,
): Promise<ArchiveEvaluationCampaignVO> {
  return http.post<ArchiveEvaluationCampaignVO>('/api/mark/archive-volumes/evaluation/campaign/save', request)
}

export interface ArchiveEvaluationExportVO {
  exportFileId: string
  volumeCount?: number
}

export function exportEvaluationPackage(campaignId: string): Promise<ArchiveEvaluationExportVO> {
  return http.post<ArchiveEvaluationExportVO>('/api/mark/archive-volumes/evaluation/export', { campaignId })
}

export interface ArchiveVolumeMaterialBatchRegisterRequest {
  volumeId: string
  materials: ArchiveVolumeMaterialRegisterRequest[]
}

export function batchRegisterArchiveVolumeMaterials(
  request: ArchiveVolumeMaterialBatchRegisterRequest,
): Promise<ArchiveVolumeMaterialVO[]> {
  return http.post<ArchiveVolumeMaterialVO[]>('/api/mark/archive-volumes/materials/batch-register', request)
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
  return http.post<ArchiveVolumeMaterialVO>('/api/mark/archive-volumes/materials/allow-delay', request)
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

export interface ArchiveVolumeMaterialWaiveRequest {
  volumeId: string
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  reason: string
}

export function waiveArchiveMaterialMissing(
  request: ArchiveVolumeMaterialWaiveRequest,
): Promise<ArchiveVolumeMaterialVO> {
  return http.post<ArchiveVolumeMaterialVO>('/api/mark/archive-volumes/materials/waive-missing', request)
}

export type ArchiveExternalImportTypeCode = 'VOLUME_MATERIAL'

export const ARCHIVE_EXTERNAL_IMPORT_TYPE_LABEL: Record<ArchiveExternalImportTypeCode, string> = {
  VOLUME_MATERIAL: '归档卷材料批量导入',
}

export type ArchiveImportBatchStatusCode
  = | 'PROCESSING'
    | 'SUCCESS'
    | 'PARTIAL_FAILED'
    | 'FAILED'

export const ARCHIVE_IMPORT_BATCH_STATUS_LABEL: Record<ArchiveImportBatchStatusCode, string> = {
  PROCESSING: '处理中',
  SUCCESS: '成功',
  PARTIAL_FAILED: '部分失败',
  FAILED: '失败',
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
}

export interface ArchiveExternalImportTemplateVO {
  fileName: string
  fileContentBase64: string
}

export interface ArchiveExcelFileVO {
  fileName: string
  fileContentBase64: string
}

export function importArchiveExternalData(
  request: ArchiveExternalImportRequest,
): Promise<ArchiveExternalImportResultVO> {
  return http.post<ArchiveExternalImportResultVO>('/api/mark/archive-volumes/external/import', request)
}

export function downloadArchiveExternalImportTemplate(): Promise<ArchiveExternalImportTemplateVO> {
  return http.post<ArchiveExternalImportTemplateVO>('/api/mark/archive-volumes/external/import-template', {})
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
  return http.post<ArchiveVolumeMaterialVO[]>('/api/mark/archive-volumes/sync/course-platform', request)
}

export interface ArchiveVolumeExamGateVO {
  examId: string
  examClosed?: boolean
  allScoresPublished?: boolean
  gateOpen?: boolean
  gradablePaperCount?: number
  publishedScoreCount?: number
}

export function getArchiveVolumeExamGate(examId: string): Promise<ArchiveVolumeExamGateVO> {
  return http.post<ArchiveVolumeExamGateVO>('/api/mark/archive-volumes/exam/archive-gate', { examId })
}

export interface ArchiveVolumeAccessRecordVO {
  accessRecordId: string
  volumeId: string
  materialId?: string
  applicantUserId?: string
  applicantNickName?: string
  applicantIdentifier?: string
  approverUserId?: string
  accessStatus: ArchiveAccessStatusCode
  accessReason?: string
  archiveNo?: string
  archiveTitle?: string
  departmentId?: string
  securityLevel?: ArchiveSecurityLevelCode
  approvedTime?: string
  expireTime?: string
  downloadToken?: string
  /** 在线预览最近阅读页码，从 1 起计 */
  lastReadPage?: number
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
  requiredFlag?: boolean
}

export interface ArchiveFourPropertyCheckVO {
  volumeId: string
  checkId?: string
  authenticityPassed?: boolean
  reliabilityPassed?: boolean
  integrityPassed?: boolean
  usabilityPassed?: boolean
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
  semester: string
  examRound?: string
  examForm?: ArchiveExamFormCode
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
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  requiredFlag?: boolean
  fileId: string
  mediaType: ArchiveMaterialMediaTypeCode
  fileFormat: string
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
  decision: 'RETAIN' | 'DESTROY'
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
  decision: 'APPROVED' | 'REJECTED'
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

export function createOfflineArchiveVolume(request: OfflineMarkedArchiveCreateRequest): Promise<string> {
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

export function triggerArchiveVolumeMaterialOcr(materialId: string): Promise<ArchiveVolumeMaterialVO> {
  return http.post<ArchiveVolumeMaterialVO>('/api/mark/archive-volumes/materials/ocr/trigger', {
    materialId,
  })
}

export function checkArchiveVolumeIntegrity(volumeId: string): Promise<ArchiveIntegrityCheckVO> {
  return http.post<ArchiveIntegrityCheckVO>('/api/mark/archive-volumes/integrity/check', { volumeId })
}

export function checkArchiveVolumeFourProperty(volumeId: string): Promise<ArchiveFourPropertyCheckVO> {
  return http.post<ArchiveFourPropertyCheckVO>('/api/mark/archive-volumes/four-property/check', { volumeId })
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

export function listArchiveVolumeAccessRecords(volumeId: string): Promise<ArchiveVolumeAccessRecordVO[]> {
  return http.post<ArchiveVolumeAccessRecordVO[]>('/api/mark/archive-volumes/access/records', { volumeId })
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
  return http.post<ArchiveMaterialCatalogTemplateVO[]>('/api/mark/archive-volumes/catalog-template/list', {})
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
  return http.post<ArchiveVolumeAccessRecordVO[]>('/api/mark/archive-volumes/access/pending/list', {})
}

export type ArchiveSharedMaterialRefTypeCode = 'UNIFIED_EXAM_PUBLIC' | 'MERGED_CLASS_SHARED'

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

export function recordAccessReadPage(
  request: ArchiveVolumeAccessReadPageRequest,
): Promise<void> {
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
  approverUserId?: string
  accessStatus: ArchiveAccessStatusCode
  accessReason?: string
  approvedTime?: string
  expireTime?: string
  createTime?: string
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
  semester?: string
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
  return http.post<ArchiveExcelFileVO>('/api/mark/archive-volumes/destruction/ledger/export', request)
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
