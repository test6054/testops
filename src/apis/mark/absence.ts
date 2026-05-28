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

export const ABSENCE_STATUS_COLOR: Record<AbsenceStatusCode, BadgeTone> = {
  PENDING: 'orange',
  CONFIRMED: 'red',
  REVOKED: 'gray',
  MAKEUP_ARRANGED: 'blue',
}

/** 缺考状态 BadgeTone 映射（用于 UiTag/UiBadge 等 ui-guide 组件） */
export const ABSENCE_STATUS_TONE: Record<AbsenceStatusCode, 'orange' | 'red' | 'gray' | 'blue'> = {
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
  WITHDRAW: '退考',
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
export interface AttendanceReconcilePayload {
  examId: string
  /** 是否自动创建 PENDING 缺考记录；默认 false 仅返回缺考学生列表 */
  createPendingAbsence?: boolean
}

/** 缺考学生快照 - 对应 AbsentStudentSnapshotResponse */
export interface AbsentStudentSnapshotVO {
  studentUserId: string
  classId?: string
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
  payload: AttendanceReconcilePayload,
): Promise<AttendanceReconcileVO> {
  return http.post<unknown>('/api/mark/exams/absence/reconcile', payload)
    .then(validateAttendanceReconcile)
}

// ─── 确认缺考 ─────────────────────────────────

/** 缺考确认请求 - 对应 AbsenceConfirmRequest */
export interface AbsenceConfirmPayload {
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
  studentNo: string
  studentName: string
  attemptId?: string
  absenceStatus: AbsenceStatusCode
  absenceReason: AbsenceReasonCode
  scorePolicy: AbsenceScorePolicyCode
  confirmedBy?: string
  confirmedTime?: string
  revokedBy?: string
  revokedTime?: string
  revokeReason?: string
}

/**
 * 教师确认单个学生缺考
 * POST /api/mark/exams/absence/confirm
 */
export function confirmAbsence(payload: AbsenceConfirmPayload): Promise<AbsenceRecordVO> {
  return http.post<unknown>('/api/mark/exams/absence/confirm', payload)
    .then(validateAbsenceRecord)
}

// ─── 撤销缺考 ─────────────────────────────────

/** 缺考撤销请求 - 对应 AbsenceRevokeRequest */
export interface AbsenceRevokePayload {
  examId: string
  studentUserId: string
  revokeReason: string
}

/**
 * 教师撤销已确认缺考
 * POST /api/mark/exams/absence/revoke
 */
export function revokeAbsence(payload: AbsenceRevokePayload): Promise<AbsenceRecordVO> {
  return http.post<unknown>('/api/mark/exams/absence/revoke', payload)
    .then(validateAbsenceRecord)
}

// ─── 查询缺考记录 ─────────────────────────────────

/** 缺考记录查询请求 - 对应 AbsenceQueryRequest */
export interface AbsenceQueryPayload extends QueryDto {
  examId: string
  /** 缺考状态编码，为空时查询全部 */
  absenceStatus?: AbsenceStatusCode
}

/**
 * 查询考试范围内的缺考记录
 * POST /api/mark/exams/absence/list
 */
export function listAbsenceRecords(
  payload: AbsenceQueryPayload,
): Promise<PageResult<AbsenceRecordVO>> {
  return http.post<unknown>('/api/mark/exams/absence/list', payload)
    .then(validateAbsenceRecordPage)
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireAbsenceStatus(value: unknown, fieldName: string): AbsenceStatusCode {
  if (value === 'PENDING' || value === 'CONFIRMED' || value === 'REVOKED' || value === 'MAKEUP_ARRANGED') {
    return value
  }
  throw new TypeError(`${fieldName} 接口返回格式错误`)
}

function requireAbsenceReason(value: unknown, fieldName: string): AbsenceReasonCode {
  if (value === 'ABSENT' || value === 'LEAVE' || value === 'WITHDRAW' || value === 'PAPER_LOST' || value === 'OTHER') {
    return value
  }
  throw new TypeError(`${fieldName} 接口返回格式错误`)
}

function requireScorePolicy(value: unknown, fieldName: string): AbsenceScorePolicyCode {
  if (
    value === 'SCORE_ZERO'
    || value === 'EXCLUDE_STAT'
    || value === 'PENDING_MAKEUP'
    || value === 'PENDING_EXTERNAL'
  ) {
    return value
  }
  throw new TypeError(`${fieldName} 接口返回格式错误`)
}

function validateAbsentStudentSnapshot(value: unknown): AbsentStudentSnapshotVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('缺考学生快照接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    studentUserId: requireString(result.studentUserId, '学生用户 ID'),
    classId: optionalString(result.classId, '班级 ID'),
    studentNo: requireString(result.studentNo, '学号快照'),
    studentName: requireString(result.studentName, '学生姓名快照'),
  }
}

function validateAttendanceReconcile(value: unknown): AttendanceReconcileVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('出勤缺考核对接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  if (!Array.isArray(result.absentStudents)) {
    throw new TypeError('缺考学生列表接口返回格式错误')
  }
  return {
    examId: requireString(result.examId, '考试 ID'),
    expectedCount: requireFiniteNumber(result.expectedCount, '应考人数'),
    attendedCount: requireFiniteNumber(result.attendedCount, '已绑定试卷人数'),
    absentCount: requireFiniteNumber(result.absentCount, '缺考人数'),
    createdPendingCount: requireFiniteNumber(result.createdPendingCount, '新建待确认缺考记录数'),
    absentStudents: result.absentStudents.map(validateAbsentStudentSnapshot),
  }
}

function validateAbsenceRecord(value: unknown): AbsenceRecordVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('缺考记录接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    absenceRecordId: requireString(result.absenceRecordId, '缺考记录 ID'),
    examId: requireString(result.examId, '考试 ID'),
    studentUserId: requireString(result.studentUserId, '学生用户 ID'),
    classId: optionalString(result.classId, '班级 ID'),
    studentNo: requireString(result.studentNo, '学号快照'),
    studentName: requireString(result.studentName, '学生姓名快照'),
    attemptId: optionalString(result.attemptId, '关联尝试 ID'),
    absenceStatus: requireAbsenceStatus(result.absenceStatus, '缺考状态'),
    absenceReason: requireAbsenceReason(result.absenceReason, '缺考原因'),
    scorePolicy: requireScorePolicy(result.scorePolicy, '成绩处理策略'),
    confirmedBy: optionalString(result.confirmedBy, '确认人'),
    confirmedTime: optionalString(result.confirmedTime, '确认时间'),
    revokedBy: optionalString(result.revokedBy, '撤销人'),
    revokedTime: optionalString(result.revokedTime, '撤销时间'),
    revokeReason: optionalString(result.revokeReason, '撤销原因'),
  }
}

function validateAbsenceRecordPage(value: unknown): PageResult<AbsenceRecordVO> {
  if (!value || typeof value !== 'object') {
    throw new TypeError('缺考记录分页接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  if (!Array.isArray(result.list)) {
    throw new TypeError('缺考记录分页列表接口返回格式错误')
  }
  return {
    list: result.list.map(validateAbsenceRecord),
    total: requireFiniteNumber(result.total, '缺考记录总数'),
    pageNum: requireFiniteNumber(result.pageNum, '缺考记录页码'),
    pageSize: requireFiniteNumber(result.pageSize, '缺考记录页大小'),
    pages: requireFiniteNumber(result.pages, '缺考记录总页数'),
  }
}
