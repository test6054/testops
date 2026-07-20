/**
 * 缺考管理 API - 对接 edu-mark 模块 AbsenceController
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type { ScorePolicyCode } from '@/types/enums/score-policy-enum'
import http from '@/config/axios'
import {
  AbsenceReasonCode,
  AbsenceReasonDescription,
  ALL_ABSENCE_REASON_CODES,
} from '@/types/enums/absence-reason-enum'
import { AbsenceStatusCode } from '@/types/enums/absence-status-enum'
import { ALL_SCORE_POLICY_CODES, ScorePolicyDescription } from '@/types/enums/score-policy-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  AbsenceReasonCode,
  AbsenceReasonDescription,
  ALL_ABSENCE_REASON_CODES,
} from '@/types/enums/absence-reason-enum'

export {
  AbsenceStatusCode,
  AbsenceStatusDescription,
  ALL_ABSENCE_STATUS_CODES,
} from '@/types/enums/absence-status-enum'

export {
  ALL_SCORE_POLICY_CODES,
  ScorePolicyCode,
  ScorePolicyDescription,
} from '@/types/enums/score-policy-enum'

export const ABSENCE_STATUS_TONE: Record<AbsenceStatusCode, BadgeTone> = {
  [AbsenceStatusCode.PENDING]: 'orange',
  [AbsenceStatusCode.CONFIRMED]: 'red',
  [AbsenceStatusCode.REVOKED]: 'gray',
  [AbsenceStatusCode.MAKEUP_ARRANGED]: 'blue',
  [AbsenceStatusCode.MAKEUP_COMPLETED]: 'green',
}

export const ABSENCE_STATUS_FLOW_HINT = '待确认 → 已确认 → 已安排补考 → 已完成补考；已确认可撤销（计零已发布须先撤回成绩）'

export const ABSENCE_REASON_TONE: Record<AbsenceReasonCode, BadgeTone> = {
  [AbsenceReasonCode.ABSENT]: 'red',
  [AbsenceReasonCode.LEAVE]: 'orange',
  [AbsenceReasonCode.WITHDRAW]: 'blue',
  [AbsenceReasonCode.PAPER_LOST]: 'red',
  [AbsenceReasonCode.OTHER]: 'gray',
}

export const ABSENCE_REASON_OPTIONS: Array<{ value: AbsenceReasonCode, label: string }>
  = ALL_ABSENCE_REASON_CODES.map((value) => ({
    value,
    label: strictEnumLabel(AbsenceReasonDescription, value, '缺考原因'),
  }))

export const SCORE_POLICY_OPTIONS: Array<{ value: ScorePolicyCode, label: string }>
  = ALL_SCORE_POLICY_CODES.map((value) => ({
    value,
    label: strictEnumLabel(ScorePolicyDescription, value, '成绩策略'),
  }))

export interface AttendanceReconcileRequest {
  examId: string
  createPendingAbsence?: boolean
}

export interface AbsentStudentSnapshotResponse {
  studentUserId: string
  classId?: string
  className: string
  studentNo: string
  studentName: string
}

export interface AttendanceReconcileResponse {
  examId: string
  expectedCount: number
  attendedCount: number
  absentCount: number
  createdPendingCount: number
}

export function reconcileAttendance(
  request: AttendanceReconcileRequest,
): Promise<AttendanceReconcileResponse> {
  return http.post<AttendanceReconcileResponse>('/api/mark/exams/absence/reconcile', request)
}

export interface AbsenceConfirmRequest {
  examId: string
  studentUserId: string
  absenceReason: AbsenceReasonCode
  scorePolicy: ScorePolicyCode
}

export interface AbsenceRecordResponse {
  absenceRecordId: string
  examId: string
  studentUserId: string
  classId?: string
  className: string
  studentNo: string
  studentName: string
  attemptId?: string
  absenceStatus: AbsenceStatusCode
  absenceReason: AbsenceReasonCode
  scorePolicy: ScorePolicyCode
  confirmedUserId?: string
  confirmedTime?: string
  revokedUserId?: string
  revokedTime?: string
  revokeReason?: string
  /** 计零缺考关联终分状态；已发布时须先撤回成绩再撤销缺考 */
  linkedFinalScoreStatus?: string
  /** 与 BE revokeAbsence 写门禁同源；已确认且可撤销时为 true */
  canRevokeAbsence?: boolean
  /** 不可撤销时的阻断说明 */
  revokeBlockedReason?: string
}

export function confirmAbsence(request: AbsenceConfirmRequest): Promise<AbsenceRecordResponse> {
  return http.post<AbsenceRecordResponse>('/api/mark/exams/absence/confirm', request)
}

export interface AbsenceRevokeRequest {
  examId: string
  studentUserId: string
  revokeReason: string
}

export function revokeAbsence(request: AbsenceRevokeRequest): Promise<AbsenceRecordResponse> {
  return http.post<AbsenceRecordResponse>('/api/mark/exams/absence/revoke', request)
}

export interface AbsenceRecordPageRequest extends QueryDto {
  examId: string
  absenceStatus?: AbsenceStatusCode
}

export function pageAbsenceRecords(
  request: AbsenceRecordPageRequest,
): Promise<PageResult<AbsenceRecordResponse>> {
  return http.post<PageResult<AbsenceRecordResponse>>('/api/mark/exams/absence/page', request)
}

export interface AbsenceReconcileAbsentStudentPageRequest extends QueryDto {
  examId: string
}

export function pageReconcileAbsentStudents(
  request: AbsenceReconcileAbsentStudentPageRequest,
): Promise<PageResult<AbsentStudentSnapshotResponse>> {
  return http.post<PageResult<AbsentStudentSnapshotResponse>>(
    '/api/mark/exams/absence/reconcile-absent-students/page',
    request,
  )
}

export interface AbsenceExamStatsRequest {
  examId: string
}

export interface AbsenceExamStatsResponse {
  pendingAbsenceCount: number
  confirmedAbsenceCount: number
  /** 是否可管理本场阅卷写操作；与 hasExamReviewerWritePermission 同源 */
  canManageReviewerWrites?: boolean
  /** MVR-326：是否可派生补考；与 BE isExamOwner 同源 */
  canManageOwnerAbsenceMakeup?: boolean
}

export function getAbsenceExamStats(
  request: AbsenceExamStatsRequest,
): Promise<AbsenceExamStatsResponse> {
  return http.post<AbsenceExamStatsResponse>('/api/mark/exams/absence/stats', request)
}

export interface AbsencePendingMakeupCountRequest {
  examId: string
}

export interface AbsencePendingMakeupCountResponse {
  examId: string
  pendingMakeupCount: number
}

export function countPendingMakeupAbsences(
  request: AbsencePendingMakeupCountRequest,
): Promise<AbsencePendingMakeupCountResponse> {
  return http.post<AbsencePendingMakeupCountResponse>(
    '/api/mark/exams/absence/pending-makeup-count',
    request,
  )
}

export interface AbsenceScoreZeroRepairRequest {
  examId: string
}

export interface AbsenceScoreZeroRepairResponse {
  examId: string
  repairedCount: number
  scannedMissingCount: number
}

/** 补齐本场已确认计零但尚未写入零分终分的历史缺考 */
export function repairScoreZeroFinalScores(
  request: AbsenceScoreZeroRepairRequest,
): Promise<AbsenceScoreZeroRepairResponse> {
  return http.post<AbsenceScoreZeroRepairResponse>(
    '/api/mark/exams/absence/score-zero/repair',
    request,
  )
}
