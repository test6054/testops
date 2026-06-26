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
  scoreCompletionStatus: ArchiveScoreCompletionStatusCode
  archiveDueTime?: string
  createTime?: string
}

export interface ArchiveVolumeSearchHitVO {
  volumeId: string
  materialId: string
  archiveNo: string
  archiveTitle: string
  materialType: ArchiveMaterialTypeCode
  fileName?: string
  snippet?: string
}

export interface ArchiveVolumeDetailVO {
  volume: ArchiveVolumeVO
  materials: ArchiveVolumeMaterialVO[]
  events: ArchiveVolumeEventVO[]
}

export interface ArchiveVolumeMaterialVO {
  materialId: string
  materialType: ArchiveMaterialTypeCode
  fileName?: string
  submissionStatus?: string
  ocrStatus?: string
}

export interface ArchiveVolumeEventVO {
  eventId: string
  eventType?: string
  reason?: string
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
  academicYearSemester?: string
  sourceType?: ArchiveVolumeSourceTypeCode
  volumeStatus?: ArchiveVolumeStatusCode
  integrityStatus?: ArchiveIntegrityStatusCode
  transferStatus?: ArchiveTransferStatusCode
  scoreCompletionStatus?: ArchiveScoreCompletionStatusCode
  studentNo?: string
  studentName?: string
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
