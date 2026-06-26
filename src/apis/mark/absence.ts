/**
 * 缺考管理 API - 对接 edu-mark 模块 AbsenceController
 *
 * 业务链：
 *   1. reconcileAttendance 核对应考名单 vs 已绑定试卷，识别"应考但无试卷"待确认学生
 *   2. confirmAbsence 教师确认单个学生缺考（写入缺考原因、成绩处理策略）
 *   3. revokeAbsence 教师撤销已确认缺考
 *   4. listAbsenceRecords 查询考试范围内的缺考记录（可按状态过滤）
 *
 * 后端规则：
 *   - 所有 endpoint 均为 POST，入参统一 body
 *   - 租户与操作人从 UserHold 注入，前端只传业务字段
 *   - 后端 Long ID 统一用 string 表达到前端
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

// ─── 状态与原因枚举 ─────────────────────────────────

/** 缺考状态编码 - 对应后端 AbsenceStatus */
export type AbsenceStatusCode = 'PENDING' | 'CONFIRMED' | 'REVOKED' | 'MAKEUP_ARRANGED'

export const ABSENCE_STATUS_LABEL: Record<AbsenceStatusCode, string> = {
  PENDING: '待确认',
  CONFIRMED: '已确认',
  REVOKED: '已撤销',
  MAKEUP_ARRANGED: '已安排补考',
}

/** 缺考状态 BadgeTone 映射（用于 UiTag/UiBadge 等 ui-guide 组件） */
export const ABSENCE_STATUS_TONE: Record<AbsenceStatusCode, BadgeTone> = {
  PENDING: 'orange',
  CONFIRMED: 'red',
  REVOKED: 'gray',
  MAKEUP_ARRANGED: 'blue',
}

/** 缺考原因编码 */
export type AbsenceReasonCode = 'ABSENT' | 'LEAVE' | 'WITHDRAW' | 'PAPER_LOST' | 'OTHER'

export const ABSENCE_REASON_LABEL: Record<AbsenceReasonCode, string> = {
  ABSENT: '缺考',
  LEAVE: '请假',
  WITHDRAW: '退课',
  PAPER_LOST: '试卷遗失',
  OTHER: '其他',
}

/** 成绩处理策略编码 */
export type AbsenceScorePolicyCode
  = | 'SCORE_ZERO'
    | 'EXCLUDE_STAT'
    | 'PENDING_MAKEUP'
    | 'PENDING_EXTERNAL'

export const ABSENCE_SCORE_POLICY_LABEL: Record<AbsenceScorePolicyCode, string> = {
  SCORE_ZERO: '记 0 分',
  EXCLUDE_STAT: '不计入统计',
  PENDING_MAKEUP: '待补考',
  PENDING_EXTERNAL: '移交外部处理',
}

// ─── 出勤核对 ─────────────────────────────────

/** 出勤缺考核对请求 - 对应 AttendanceReconcileRequest */
export interface AttendanceReconcileRequest {
  examId: string
  /** 是否自动创建 PENDING 缺考记录；默认 false 仅返回缺考学生列表 */
  createPendingAbsence?: boolean
}

/** 缺考学生快照 - 对应 AbsentStudentSnapshotResponse */
export interface AbsentStudentSnapshotVO {
  studentUserId: string
  classId?: string
  className: string
  studentNo: string
  studentName: string
}

/** 出勤缺考核对响应 - 对应 AttendanceReconcileResponse */
export interface AttendanceReconcileVO {
  examId: string
  expectedCount: number
  attendedCount: number
  absentCount: number
  createdPendingCount: number
  absentStudents: AbsentStudentSnapshotVO[]
}

/**
 * 核对应考名单与已绑定试卷，识别待确认缺考学生
 * POST /api/mark/exams/absence/reconcile
 */
export function reconcileAttendance(
  request: AttendanceReconcileRequest,
): Promise<AttendanceReconcileVO> {
  return http.post<AttendanceReconcileVO>('/api/mark/exams/absence/reconcile', request)
}

// ─── 确认缺考 ─────────────────────────────────

/** 缺考确认请求 - 对应 AbsenceConfirmRequest */
export interface AbsenceConfirmRequest {
  examId: string
  studentUserId: string
  absenceReason: AbsenceReasonCode
  scorePolicy: AbsenceScorePolicyCode
}

/** 缺考记录响应 - 对应 AbsenceRecordResponse */
export interface AbsenceRecordVO {
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
  scorePolicy: AbsenceScorePolicyCode
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
export function confirmAbsence(request: AbsenceConfirmRequest): Promise<AbsenceRecordVO> {
  return http.post<AbsenceRecordVO>('/api/mark/exams/absence/confirm', request)
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
export function revokeAbsence(request: AbsenceRevokeRequest): Promise<AbsenceRecordVO> {
  return http.post<AbsenceRecordVO>('/api/mark/exams/absence/revoke', request)
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
): Promise<PageResult<AbsenceRecordVO>> {
  return http.post<PageResult<AbsenceRecordVO>>('/api/mark/exams/absence/list', request)
}
