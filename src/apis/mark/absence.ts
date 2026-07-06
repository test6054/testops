/**
 * 缺考管理 API - 对接 edu-mark 模块 AbsenceController
 *
 * 业务链：
 *   1. reconcileAttendance 核对应考名单 vs 已绑定试卷，识别"应考但无试卷"待确认学生
 *   2. confirmAbsence 教师确认单个学生缺考（写入缺考原因、成绩处理策略）
 *   3. revokeAbsence 教师撤销已确认缺考
 *   4. listAbsenceRecords 查询考试范围内的缺考记录（可按状态过滤）
 *   5. countPendingMakeupAbsences 统计 CONFIRMED + PENDING_MAKEUP 待补考人数
 *
 * 后端规则：
 *   - 所有 endpoint 均为 POST，入参统一 body
 *   - 租户与操作人从 UserHold 注入，前端只传业务字段
 *   - 后端 Long ID 统一用 string 表达到前端
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

/** 缺考状态 BadgeTone 映射（用于 UiTag/UiBadge 等 ui-guide 组件） */
export const ABSENCE_STATUS_TONE: Record<AbsenceStatusCode, BadgeTone> = {
  [AbsenceStatusCode.PENDING]: 'orange',
  [AbsenceStatusCode.CONFIRMED]: 'red',
  [AbsenceStatusCode.REVOKED]: 'gray',
  [AbsenceStatusCode.MAKEUP_ARRANGED]: 'blue',
}

/** 缺考记录状态流转说明（核对 → 确认 → 撤销 / 补考安排） */
export const ABSENCE_STATUS_FLOW_HINT = '待确认 → 已确认 → 已安排补考；已确认可撤销回待确认'

/** 缺考原因 BadgeTone 映射（用于 UiTag） */
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
    label: AbsenceReasonDescription[value],
  }))

export const SCORE_POLICY_OPTIONS: Array<{ value: ScorePolicyCode, label: string }>
  = ALL_SCORE_POLICY_CODES.map((value) => ({
    value,
    label: ScorePolicyDescription[value],
  }))

// ─── 出勤核对 ─────────────────────────────────

/** 出勤缺考核对请求 - 对应 AttendanceReconcileRequest */
export interface AttendanceReconcileRequest {
  examId: string
  /** 是否自动创建 PENDING 缺考记录；默认 false 仅返回缺考学生列表 */
  createPendingAbsence?: boolean
}

/** 缺考学生快照 - 对应 AbsentStudentSnapshotResponse */
export interface AbsentStudentSnapshotResponse {
  studentUserId: string
  classId?: string
  className: string
  studentNo: string
  studentName: string
}

/** 出勤缺考核对响应 - 对应 AttendanceReconcileResponse */
export interface AttendanceReconcileResponse {
  examId: string
  expectedCount: number
  attendedCount: number
  absentCount: number
  createdPendingCount: number
  absentStudents: AbsentStudentSnapshotResponse[]
}

/**
 * 核对应考名单与已绑定试卷，识别待确认缺考学生
 * POST /api/mark/exams/absence/reconcile
 */
export function reconcileAttendance(
  request: AttendanceReconcileRequest,
): Promise<AttendanceReconcileResponse> {
  return http.post<AttendanceReconcileResponse>('/api/mark/exams/absence/reconcile', request)
}

// ─── 确认缺考 ─────────────────────────────────

/** 缺考确认请求 - 对应 AbsenceConfirmRequest */
export interface AbsenceConfirmRequest {
  examId: string
  studentUserId: string
  absenceReason: AbsenceReasonCode
  scorePolicy: ScorePolicyCode
}

/** 缺考记录响应 - 对应 AbsenceRecordResponse */
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
}

/**
 * 教师确认单个学生缺考
 * POST /api/mark/exams/absence/confirm
 */
export function confirmAbsence(request: AbsenceConfirmRequest): Promise<AbsenceRecordResponse> {
  return http.post<AbsenceRecordResponse>('/api/mark/exams/absence/confirm', request)
}

// ─── 撤销缺考 ─────────────────────────────────

/** 缺考撤销请求 - 对应 AbsenceRevokeRequest */
export interface AbsenceRevokeRequest {
  examId: string
  studentUserId: string
  revokeReason: string
}

/**
 * 教师撤销已确认缺考
 * POST /api/mark/exams/absence/revoke
 */
export function revokeAbsence(request: AbsenceRevokeRequest): Promise<AbsenceRecordResponse> {
  return http.post<AbsenceRecordResponse>('/api/mark/exams/absence/revoke', request)
}

// ─── 查询缺考记录 ─────────────────────────────────

/** 缺考记录查询请求 - 对应 AbsenceQueryRequest */
export interface AbsenceQueryRequest extends QueryDto {
  examId: string
  /** 缺考状态编码，为空时查询全部 */
  absenceStatus?: AbsenceStatusCode
}

/**
 * 查询考试范围内的缺考记录
 * POST /api/mark/exams/absence/list
 */
export function listAbsenceRecords(
  request: AbsenceQueryRequest,
): Promise<PageResult<AbsenceRecordResponse>> {
  return http.post<PageResult<AbsenceRecordResponse>>('/api/mark/exams/absence/list', request)
}

/** 待补考缺考计数请求 - 对应 AbsencePendingMakeupCountRequest */
export interface AbsencePendingMakeupCountRequest {
  examId: string
}

/** 待补考缺考计数响应 - 对应 AbsencePendingMakeupCountResponse */
export interface AbsencePendingMakeupCountResponse {
  examId: string
  pendingMakeupCount: number
}

/**
 * 统计待补考缺考人数（CONFIRMED + PENDING_MAKEUP）
 * POST /api/mark/exams/absence/pending-makeup-count
 */
export function countPendingMakeupAbsences(
  request: AbsencePendingMakeupCountRequest,
): Promise<AbsencePendingMakeupCountResponse> {
  return http.post<AbsencePendingMakeupCountResponse>(
    '/api/mark/exams/absence/pending-makeup-count',
    request,
  )
}
