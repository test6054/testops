/**
 * 成绩复核与更正 API - 对接 edu-mark 模块 GradeReviewController
 *
 * 后端规则：
 * - 路径前缀 /api/exam/grade-review
 * - 部分查询接口为 GET（@RequestParam），写操作为 POST + DTO body
 * - 租户与操作人从 UserHold 注入
 * - 后端 Long ID 统一用 string 表达到前端
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'

// ─── 复核窗口策略 ─────────────────────────────────

/** 复核窗口状态编码 */
export type ReviewWindowPolicyStatusCode = 'DRAFT' | 'ACTIVE' | 'CLOSED'

/** 学生可见材料范围 */
export type VisibleMaterialScopeCode = 'SCORE_ONLY' | 'SCORE_AND_ANNOTATION' | 'FULL'

/** 复核窗口状态文案映射 */
export const REVIEW_WINDOW_STATUS_LABEL: Record<ReviewWindowPolicyStatusCode, string> = {
  DRAFT: '草稿',
  ACTIVE: '已开放',
  CLOSED: '已关闭',
}

/** 复核窗口状态徽标颜色（统一 BadgeTone） */
export const REVIEW_WINDOW_STATUS_COLOR: Record<ReviewWindowPolicyStatusCode, BadgeTone> = {
  DRAFT: 'gray',
  ACTIVE: 'green',
  CLOSED: 'red',
}

/** 复核窗口策略保存请求 - 对应 ReviewWindowPolicySaveRequest */
export interface ReviewWindowPolicySavePayload {
  examId: string
  openTime: string
  closeTime: string
  maxRequestCount?: number
  visibleMaterialScope?: VisibleMaterialScopeCode
  /** 允许的申请原因类型 JSON 数组字符串，例如 '["SCORE_ERROR","RUBRIC"]' */
  allowedReasonTypes?: string
}

/** 复核窗口策略 - 对应 ExamReviewWindowPolicy */
export interface ExamReviewWindowPolicyVO {
  id: string
  tenantId?: string
  examId: string
  openTime?: string
  closeTime?: string
  maxRequestCount?: number
  visibleMaterialScope?: VisibleMaterialScopeCode
  allowedReasonTypes?: string
  policyStatus?: ReviewWindowPolicyStatusCode
  createTime?: string
  updateTime?: string
}

/**
 * 保存复核窗口策略
 * POST /api/exam/grade-review/window/save
 */
export function saveReviewWindowPolicy(
  payload: ReviewWindowPolicySavePayload,
): Promise<ExamReviewWindowPolicyVO> {
  return http.post<ExamReviewWindowPolicyVO>('/api/exam/grade-review/window/save', payload)
}

/**
 * 查询复核窗口策略
 * GET /api/exam/grade-review/window/get?examId=
 */
export function getReviewWindowPolicy(examId: string): Promise<ExamReviewWindowPolicyVO | null> {
  return http.get<ExamReviewWindowPolicyVO | null>('/api/exam/grade-review/window/get', {
    params: { examId },
  })
}

/**
 * 激活复核窗口
 * POST /api/exam/grade-review/window/activate?examId=
 */
export function activateReviewWindow(examId: string): Promise<void> {
  return http.post<void>(`/api/exam/grade-review/window/activate?examId=${encodeURIComponent(examId)}`)
}

/**
 * 关闭复核窗口
 * POST /api/exam/grade-review/window/close?examId=
 */
export function closeReviewWindow(examId: string): Promise<void> {
  return http.post<void>(`/api/exam/grade-review/window/close?examId=${encodeURIComponent(examId)}`)
}

// ─── 复核申请 ─────────────────────────────────

/** 复核申请状态编码 */
export type GradeReviewRequestStatusCode = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CORRECTED'

/** 复核申请状态文案映射 */
export const REVIEW_REQUEST_STATUS_LABEL: Record<GradeReviewRequestStatusCode, string> = {
  PENDING: '待处理',
  IN_REVIEW: '处理中',
  APPROVED: '通过',
  REJECTED: '驳回',
  CORRECTED: '已更正',
}

/** 复核申请状态徽标颜色（统一 BadgeTone） */
export const REVIEW_REQUEST_STATUS_COLOR: Record<GradeReviewRequestStatusCode, BadgeTone> = {
  PENDING: 'orange',
  IN_REVIEW: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
  CORRECTED: 'purple',
}

/** 复核申请状态 BadgeTone 映射（用于 UiTag/UiBadge） */
export const REVIEW_REQUEST_STATUS_TONE: Record<GradeReviewRequestStatusCode, BadgeTone> = {
  PENDING: 'orange',
  IN_REVIEW: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
  CORRECTED: 'purple',
}

/** 复核申请提交请求 - 对应 GradeReviewSubmitRequest */
export interface GradeReviewSubmitPayload {
  examId: string
  paperInstanceId?: string
  /** 申请复核的题目ID列表；空数组表示总分复核 */
  questionIds: string[]
  requestReason: string
  reasonType?: string
  /** 佐证材料文件ID列表 */
  evidenceFileIds?: string[]
}

/** 复核申请 - 对应 ExamGradeReviewRequest */
export interface ExamGradeReviewRequestVO {
  id: string
  tenantId?: string
  examId: string
  studentUserId?: string
  paperInstanceId?: string
  questionIds: string[]
  requestReason?: string
  reasonType?: string
  evidenceFileIds?: string[]
  requestStatus?: GradeReviewRequestStatusCode
  reviewerUserId?: string
  reviewNote?: string
  reviewTime?: string
  createTime?: string
  updateTime?: string
}

/** 复核处理结论 */
export type ReviewConclusion = 'APPROVED' | 'REJECTED'

/** 复核处理请求 - 对应 GradeReviewHandleRequest */
export interface GradeReviewHandlePayload {
  reviewRequestId: string
  conclusion: ReviewConclusion
  reviewNote?: string
}

/**
 * 提交复核申请
 * POST /api/exam/grade-review/request/submit
 */
export function submitReviewRequest(
  payload: GradeReviewSubmitPayload,
): Promise<ExamGradeReviewRequestVO> {
  return http.post<ExamGradeReviewRequestVO>('/api/exam/grade-review/request/submit', payload)
}

/**
 * 复核申请列表查询请求 - 对应 GradeReviewRequestListQuery
 */
export interface GradeReviewRequestListQueryPayload {
  examId: string
  studentUserId?: string
  requestStatus?: GradeReviewRequestStatusCode
}

/**
 * 查询复核申请列表
 * POST /api/exam/grade-review/request/list
 *
 * 2026-05-14：按 AGENTS.md "API 超过 2 个参数必须转 DTO" 约束，
 * 后端由 GET + @RequestParam(examId, studentUserId, requestStatus) 重构为 POST + GradeReviewRequestListQuery。
 */
export function listReviewRequests(
  payload: GradeReviewRequestListQueryPayload,
): Promise<ExamGradeReviewRequestVO[]> {
  return http.post<ExamGradeReviewRequestVO[]>('/api/exam/grade-review/request/list', payload)
}

/** 学生“我的复核申请”列表项 - 对应 StudentGradeReviewRequestItemResponse */
export interface StudentGradeReviewRequestItemVO {
  id: string
  tenantId?: string
  examId: string
  examName: string
  examNo: string
  paperInstanceId?: string
  questionIds: string[]
  requestReason: string
  reasonType: string
  evidenceFileIds?: string[]
  requestStatus: GradeReviewRequestStatusCode
  reviewerUserId?: string
  reviewNote?: string
  reviewTime?: string
  createTime: string
  updateTime?: string
}

/**
 * 跨考试聚合查询当前学生的复核申请。
 * 用于学生端 /student/appeal，避免按考试逐个调用 listReviewRequests 的 N+1。
 * GET /api/exam/grade-review/request/student-list?requestStatus=
 */
export function listMyReviewRequests(params: {
  requestStatus?: GradeReviewRequestStatusCode
} = {}): Promise<StudentGradeReviewRequestItemVO[]> {
  return http.get<StudentGradeReviewRequestItemVO[]>(
    '/api/exam/grade-review/request/student-list',
    { params },
  )
}

/**
 * 处理复核申请
 * POST /api/exam/grade-review/request/handle
 */
export function handleReviewRequest(payload: GradeReviewHandlePayload): Promise<void> {
  return http.post<void>('/api/exam/grade-review/request/handle', payload)
}

// ─── 成绩更正 ─────────────────────────────────

/** 更正类型编码 */
export type GradeCorrectionTypeCode = 'SINGLE_QUESTION' | 'TOTAL_SCORE' | 'SYSTEM_REJUDGE'

/** 更正状态编码 */
export type GradeCorrectionStatusCode = 'PENDING' | 'APPROVED' | 'EXECUTED' | 'REJECTED'

/** 更正类型文案映射 */
export const GRADE_CORRECTION_TYPE_LABEL: Record<GradeCorrectionTypeCode, string> = {
  SINGLE_QUESTION: '单题更正',
  TOTAL_SCORE: '总分更正',
  SYSTEM_REJUDGE: '系统重判',
}

/** 更正状态文案映射 */
export const GRADE_CORRECTION_STATUS_LABEL: Record<GradeCorrectionStatusCode, string> = {
  PENDING: '待审批',
  APPROVED: '已审批',
  EXECUTED: '已执行',
  REJECTED: '已驳回',
}

/** 更正状态徽标颜色（统一 BadgeTone，cyan→blue） */
export const GRADE_CORRECTION_STATUS_COLOR: Record<GradeCorrectionStatusCode, BadgeTone> = {
  PENDING: 'orange',
  APPROVED: 'blue',
  EXECUTED: 'green',
  REJECTED: 'red',
}

/** 成绩更正请求 - 对应 GradeCorrectionRequest */
export interface GradeCorrectionPayload {
  examId: string
  studentUserId: string
  paperInstanceId: string
  questionTemplateId?: string
  /** 更正后分数 - 后端 BigDecimal，前端用 number 传输 */
  afterScore: number
  reason: string
  reviewRequestId?: string
}

/** 成绩更正记录 - 对应 ExamGradeCorrectionRecord */
export interface ExamGradeCorrectionRecordVO {
  id: string
  tenantId?: string
  examId: string
  studentUserId?: string
  paperInstanceId?: string
  questionTemplateId?: string
  correctionType?: GradeCorrectionTypeCode
  beforeScore?: number
  afterScore?: number
  reason?: string
  reviewRequestId?: string
  batchPlanId?: string
  approvedBy?: string
  effectiveTime?: string
  correctionStatus?: GradeCorrectionStatusCode
  createTime?: string
  updateTime?: string
}

/**
 * 创建成绩更正
 * POST /api/exam/grade-review/correction/create
 */
export function createCorrection(
  payload: GradeCorrectionPayload,
): Promise<ExamGradeCorrectionRecordVO> {
  return http.post<ExamGradeCorrectionRecordVO>('/api/exam/grade-review/correction/create', payload)
}

/**
 * 查询成绩更正记录
 * GET /api/exam/grade-review/correction/list?examId=&studentUserId=
 */
export function listCorrections(params: {
  examId: string
  studentUserId?: string
}): Promise<ExamGradeCorrectionRecordVO[]> {
  return http.get<ExamGradeCorrectionRecordVO[]>('/api/exam/grade-review/correction/list', { params })
}

// ─── 批量更正计划 ─────────────────────────────────

/** 批量更正审批状态编码 */
export type BatchCorrectionApprovalStatusCode
  = | 'DRAFT'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'EXECUTING'
    | 'COMPLETED'
    | 'REJECTED'

/** 批量更正审批状态文案映射 */
export const BATCH_CORRECTION_STATUS_LABEL: Record<BatchCorrectionApprovalStatusCode, string> = {
  DRAFT: '草稿',
  PENDING_APPROVAL: '待审批',
  APPROVED: '已审批',
  EXECUTING: '执行中',
  COMPLETED: '已完成',
  REJECTED: '已驳回',
}

/** 批量更正审批状态徽标颜色（统一 BadgeTone） */
export const BATCH_CORRECTION_STATUS_COLOR: Record<BatchCorrectionApprovalStatusCode, BadgeTone> = {
  DRAFT: 'gray',
  PENDING_APPROVAL: 'orange',
  APPROVED: 'blue',
  EXECUTING: 'blue',
  COMPLETED: 'green',
  REJECTED: 'red',
}

/** 批量成绩更正计划 - 对应 ExamBatchGradeCorrectionPlan */
export interface ExamBatchGradeCorrectionPlanVO {
  id: string
  tenantId?: string
  examId: string
  planName?: string
  correctionType?: GradeCorrectionTypeCode
  affectedQuestionIds?: string[]
  affectedStudentCount?: number
  beforeAfterDiff?: string
  approvalStatus?: BatchCorrectionApprovalStatusCode
  approvedBy?: string
  approvedTime?: string
  executedTime?: string
  executedCount?: number
  createTime?: string
  updateTime?: string
}

export interface BatchCorrectionPlanItemPayload {
  studentUserId: string
  paperInstanceId: string
  afterScore: number
}

export interface BatchCorrectionPlanCreatePayload {
  examId: string
  planName: string
  correctionType: Exclude<GradeCorrectionTypeCode, 'SYSTEM_REJUDGE'>
  questionTemplateId?: string
  items: BatchCorrectionPlanItemPayload[]
  reason: string
}

export interface BatchCorrectionPlanSubmitPayload {
  planId: string
}

export interface BatchCorrectionPlanDecisionPayload {
  planId: string
  approved: boolean
  reason?: string
}

export interface BatchCorrectionPlanExecutePayload {
  planId: string
  executeReason?: string
}

/**
 * 查询批量更正计划
 * GET /api/exam/grade-review/batch-correction/list?examId=&approvalStatus=
 */
export function listBatchCorrectionPlans(params: {
  examId: string
  approvalStatus?: BatchCorrectionApprovalStatusCode
}): Promise<ExamBatchGradeCorrectionPlanVO[]> {
  return http.get<ExamBatchGradeCorrectionPlanVO[]>('/api/exam/grade-review/batch-correction/list', { params })
}

export function createBatchCorrectionPlan(
  payload: BatchCorrectionPlanCreatePayload,
): Promise<ExamBatchGradeCorrectionPlanVO> {
  return http.post<ExamBatchGradeCorrectionPlanVO>(
    '/api/exam/grade-review/batch-correction/create',
    payload,
  )
}

export function submitBatchCorrectionPlan(
  payload: BatchCorrectionPlanSubmitPayload,
): Promise<void> {
  return http.post<void>('/api/exam/grade-review/batch-correction/submit', payload)
}

export function approveBatchCorrectionPlan(
  payload: BatchCorrectionPlanDecisionPayload,
): Promise<void> {
  return http.post<void>('/api/exam/grade-review/batch-correction/approve', payload)
}

export function executeBatchCorrectionPlan(
  payload: BatchCorrectionPlanExecutePayload,
): Promise<void> {
  return http.post<void>('/api/exam/grade-review/batch-correction/execute', payload)
}
