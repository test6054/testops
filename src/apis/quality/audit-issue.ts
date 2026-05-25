import type { AuditIssueStatus, AuditRectificationStatus, AuditSupervisionType } from './types'
/**
 * 审核评估问题 + 整改任务 + 督导复查 API
 *
 * 后端路径：
 * - /api/quality/audit-evaluation/issues            审核评估问题清单 + 状态流转
 * - /api/quality/audit-evaluation/rectifications    整改任务台账 + 推进 + 复核 + 闭环
 * - /api/quality/audit-evaluation/supervisions      督导复查 / 现场检查记录
 *
 * 设计文档 §7.10：认证 / 审核 / 督导链路，问题从 OPEN → IN_RECTIFICATION → RECTIFIED → VERIFIED → CLOSED。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const ISSUE = '/api/quality/audit-evaluation/issues'
const RECT = '/api/quality/audit-evaluation/rectifications'
const SUPER = '/api/quality/audit-evaluation/supervisions'

/* ========== 审核评估问题 ========== */

export interface AuditIssueVO {
  id: string
  tenantId?: string
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  requirementIndicatorId?: string
  courseGoalId?: string
  achievementResultId?: string
  issueCode: string
  issueTitle: string
  issueDescription?: string
  /** SELF_AUDIT / EXPERT_AUDIT / ACCREDITATION_AUDIT / EXTERNAL_INSPECTION */
  issueSource: string
  /** MINOR / MAJOR / CRITICAL */
  severity: string
  auditRound?: string
  auditYear?: string
  status: AuditIssueStatus
  raisedBy?: string
  raisedAt?: string
  closedAt?: string
  createUser?: string
  updateUser?: string
  createTime?: string
  updateTime?: string
}

export interface AuditIssueSavePayload {
  id?: string
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  requirementIndicatorId?: string
  courseGoalId?: string
  achievementResultId?: string
  issueCode: string
  issueTitle: string
  issueDescription?: string
  issueSource: string
  severity: string
  auditRound?: string
  auditYear?: string
  raisedBy?: string
  raisedAt?: string
}

export interface AuditIssueQueryPayload extends QueryDto {
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  issueSource?: string
  severity?: string
  status?: AuditIssueStatus
  auditYear?: string
  keyword?: string
}

export const auditIssueApi = {
  page: (data: AuditIssueQueryPayload) =>
    http.post<PageResult<AuditIssueVO>>(`${ISSUE}/page`, data),
  detail: (id: string) => http.post<AuditIssueVO>(`${ISSUE}/detail`, { id }),
  create: (data: AuditIssueSavePayload) => http.post<string>(`${ISSUE}/create`, data),
  update: (data: AuditIssueSavePayload) => http.post<void>(`${ISSUE}/update`, data),
  delete: (id: string) => http.post<void>(`${ISSUE}/delete`, { id }),
  transitStatus: (id: string, targetStatus: AuditIssueStatus) =>
    http.post<void>(`${ISSUE}/transit-status`, { id, targetStatus }),
}

/* ========== 审核评估整改任务 ========== */

export interface AuditRectificationVO {
  id: string
  tenantId?: string
  auditIssueId: string
  rectificationCode: string
  rectificationTitle: string
  rectificationAction: string
  ownerUserId: string
  ownerRole?: string
  /** yyyy-MM-dd */
  dueDate: string
  status: AuditRectificationStatus
  progressRemark?: string
  evidenceAnchors?: string
  submittedAt?: string
  verifiedAt?: string
  verifiedBy?: string
  verifyDecision?: string
  verifyRemark?: string
  closedAt?: string
  createUser?: string
  updateUser?: string
  createTime?: string
  updateTime?: string
}

export interface AuditRectificationSavePayload {
  id?: string
  auditIssueId: string
  rectificationCode: string
  rectificationTitle: string
  rectificationAction: string
  ownerUserId: string
  ownerRole?: string
  dueDate: string
}

export interface AuditRectificationQueryPayload extends QueryDto {
  auditIssueId?: string
  ownerUserId?: string
  status?: AuditRectificationStatus
  keyword?: string
}

export interface AuditRectificationProgressPayload {
  id: string
  targetStatus: 'IN_PROGRESS' | 'SUBMITTED'
  progressRemark?: string
  evidenceAnchors?: string
}

export interface AuditRectificationVerifyPayload {
  id: string
  decision: 'APPROVED' | 'REJECTED'
  remark?: string
}

export const auditRectificationApi = {
  page: (data: AuditRectificationQueryPayload) =>
    http.post<PageResult<AuditRectificationVO>>(`${RECT}/page`, data),
  detail: (id: string) => http.post<AuditRectificationVO>(`${RECT}/detail`, { id }),
  create: (data: AuditRectificationSavePayload) => http.post<string>(`${RECT}/create`, data),
  update: (data: AuditRectificationSavePayload) => http.post<void>(`${RECT}/update`, data),
  delete: (id: string) => http.post<void>(`${RECT}/delete`, { id }),
  /** PLANNED→IN_PROGRESS / IN_PROGRESS→SUBMITTED / RETURNED→IN_PROGRESS */
  updateProgress: (data: AuditRectificationProgressPayload) =>
    http.post<void>(`${RECT}/update-progress`, data),
  /** 复核：APPROVED → VERIFIED / REJECTED → RETURNED */
  verify: (data: AuditRectificationVerifyPayload) => http.post<void>(`${RECT}/verify`, data),
  /** 闭环：VERIFIED → CLOSED */
  close: (id: string) => http.post<void>(`${RECT}/close`, { id }),
}

/* ========== 督导复查 / 现场检查记录 ========== */

export interface AuditSupervisionVO {
  id: string
  tenantId?: string
  auditIssueId?: string
  rectificationId?: string
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  supervisionCode: string
  supervisionTitle: string
  supervisionType: AuditSupervisionType
  /** COURSE / PROGRAM / TRAINING_PLAN / COMPREHENSIVE */
  supervisionScope?: string
  supervisorUserId?: string
  supervisedAt?: string
  summary?: string
  findings?: string
  /** PASS / NEEDS_IMPROVEMENT / FAIL */
  conclusion?: string
  archiveId?: string
  evidenceAnchors?: string
  createUser?: string
  updateUser?: string
  createTime?: string
  updateTime?: string
}

export interface AuditSupervisionSavePayload {
  id?: string
  auditIssueId?: string
  rectificationId?: string
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  supervisionCode: string
  supervisionTitle: string
  supervisionType: AuditSupervisionType
  supervisionScope?: string
  supervisorUserId?: string
  supervisedAt?: string
  summary?: string
  findings?: string
  conclusion?: string
  archiveId?: string
  evidenceAnchors?: string
}

export interface AuditSupervisionQueryPayload extends QueryDto {
  auditIssueId?: string
  programId?: string
  trainingPlanId?: string
  supervisionType?: AuditSupervisionType
  conclusion?: string
  supervisorUserId?: string
  keyword?: string
}

export const auditSupervisionApi = {
  page: (data: AuditSupervisionQueryPayload) =>
    http.post<PageResult<AuditSupervisionVO>>(`${SUPER}/page`, data),
  detail: (id: string) => http.post<AuditSupervisionVO>(`${SUPER}/detail`, { id }),
  create: (data: AuditSupervisionSavePayload) => http.post<string>(`${SUPER}/create`, data),
  update: (data: AuditSupervisionSavePayload) => http.post<void>(`${SUPER}/update`, data),
  delete: (id: string) => http.post<void>(`${SUPER}/delete`, { id }),
}
