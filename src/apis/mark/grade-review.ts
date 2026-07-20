import type { QuestionTypeCode } from './question-type'
/**
 * 成绩复核与更正 API - 对接 edu-mark 模块 GradeReviewController
 *
 * 后端规则：
 * - 路径前缀 /api/exam/grade-review
 * - 所有 endpoint 均为 POST，查询与写操作统一使用 DTO body
 * - 租户与操作人从 UserHold 注入
 * - 后端 Long ID 统一用 string 表达到前端
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type { FinalScoreStatusCode } from '@/types/enums/final-score-status-enum'
import type { GradeCorrectionStatusCode } from '@/types/enums/grade-correction-status-enum'
import type { GradeCorrectionTypeCode } from '@/types/enums/grade-correction-type-enum'
import type { GradeReviewReasonTypeCode } from '@/types/enums/grade-review-reason-type-enum'
import type { VisibleMaterialScopeCode } from '@/types/enums/visible-material-scope-enum'
import http from '@/config/axios'
import {
  ALL_BATCH_CORRECTION_APPROVAL_STATUS_CODES,
  BatchCorrectionApprovalStatusCode,
  BatchCorrectionApprovalStatusDescription,
} from '@/types/enums/batch-correction-approval-status-enum'
import {
  ALL_GRADE_REVIEW_REASON_TYPE_CODES,
  GradeReviewReasonTypeDescription,
} from '@/types/enums/grade-review-reason-type-enum'
import {
  ALL_GRADE_REVIEW_REQUEST_STATUS_CODES,
  GradeReviewRequestStatusCode,
  GradeReviewRequestStatusDescription,
} from '@/types/enums/grade-review-request-status-enum'
import {
  ReviewWindowPolicyStatusCode,
  ReviewWindowPolicyStatusDescription,
} from '@/types/enums/review-window-policy-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_BATCH_CORRECTION_APPROVAL_STATUS_CODES,
  BatchCorrectionApprovalStatusCode,
  BatchCorrectionApprovalStatusDescription,
} from '@/types/enums/batch-correction-approval-status-enum'

export {
  ALL_GRADE_CORRECTION_STATUS_CODES,
  GradeCorrectionStatusCode,
  GradeCorrectionStatusDescription,
} from '@/types/enums/grade-correction-status-enum'

export {
  ALL_GRADE_CORRECTION_TYPE_CODES,
  GradeCorrectionTypeCode,
  GradeCorrectionTypeDescription,
} from '@/types/enums/grade-correction-type-enum'

export {
  ALL_GRADE_REVIEW_REASON_TYPE_CODES,
  GradeReviewReasonTypeCode,
  GradeReviewReasonTypeDescription,
} from '@/types/enums/grade-review-reason-type-enum'

export {
  ALL_GRADE_REVIEW_REQUEST_STATUS_CODES,
  GradeReviewRequestStatusCode,
  GradeReviewRequestStatusDescription,
} from '@/types/enums/grade-review-request-status-enum'

export {
  ALL_REVIEW_WINDOW_POLICY_STATUS_CODES,
  ReviewWindowPolicyStatusCode,
  ReviewWindowPolicyStatusDescription,
} from '@/types/enums/review-window-policy-status-enum'

export {
  ALL_VISIBLE_MATERIAL_SCOPE_CODES,
  VisibleMaterialScopeCode,
  VisibleMaterialScopeDescription,
} from '@/types/enums/visible-material-scope-enum'

// ─── 复核窗口策略 ─────────────────────────────────

/** 复核窗口状态徽标颜色（统一 BadgeTone） */
export const REVIEW_WINDOW_STATUS_TONE: Record<ReviewWindowPolicyStatusCode, BadgeTone> = {
  [ReviewWindowPolicyStatusCode.DRAFT]: 'gray',
  [ReviewWindowPolicyStatusCode.ACTIVE]: 'green',
  [ReviewWindowPolicyStatusCode.CLOSED]: 'red',
}

/** 复核窗口主流程状态链，供列表页流程 hint 展示 */
export const REVIEW_WINDOW_MAIN_FLOW_STATUSES: ReviewWindowPolicyStatusCode[] = [
  ReviewWindowPolicyStatusCode.DRAFT,
  ReviewWindowPolicyStatusCode.ACTIVE,
  ReviewWindowPolicyStatusCode.CLOSED,
]

/** 复核窗口主流程 hint */
export const REVIEW_WINDOW_FLOW_HINT = REVIEW_WINDOW_MAIN_FLOW_STATUSES.map((status) =>
  strictEnumLabel(ReviewWindowPolicyStatusDescription, status, '复核窗口状态'),
).join(' → ')

/** 复核窗口策略保存请求 - 对应 ReviewWindowPolicySaveRequest */
export interface ReviewWindowPolicySaveRequest {
  examId: string
  openTime: string
  closeTime: string
  maxRequestCount?: number
  visibleMaterialScope?: VisibleMaterialScopeCode
  /** 允许的申请原因类型 */
  allowedReasonTypes?: GradeReviewReasonTypeCode[]
  /** 保存后立即激活复核窗口 */
  activateImmediately?: boolean
}

/** 复核窗口策略 - 对应 ExamReviewWindowPolicy */
export interface ExamReviewWindowPolicy {
  id?: string
  tenantId?: string
  examId: string
  openTime?: string
  closeTime?: string
  maxRequestCount?: number
  visibleMaterialScope?: VisibleMaterialScopeCode
  allowedReasonTypes?: GradeReviewReasonTypeCode[]
  policyStatus?: ReviewWindowPolicyStatusCode
  createTime?: string
  updateTime?: string
  /** MVR-279：是否可保存/激活/关闭复核窗口；与 BE requireExamReviewerPermission 对齐 */
  canManageReviewerWrites?: boolean
}

/**
 * 保存复核窗口策略
 * POST /api/exam/grade-review/window/save
 */
export function saveReviewWindowPolicy(
  request: ReviewWindowPolicySaveRequest,
): Promise<ExamReviewWindowPolicy> {
  return http.post<ExamReviewWindowPolicy>('/api/exam/grade-review/window/save', request)
}

/**
 * 查询复核窗口策略
 * POST /api/exam/grade-review/window/get
 */
export function getReviewWindowPolicy(examId: string): Promise<ExamReviewWindowPolicy | null> {
  return http.post<ExamReviewWindowPolicy | null>('/api/exam/grade-review/window/get', { examId })
}

export function activateReviewWindow(examId: string): Promise<void> {
  return http.post<void>('/api/exam/grade-review/window/activate', { examId })
}

export function closeReviewWindow(examId: string): Promise<void> {
  return http.post<void>('/api/exam/grade-review/window/close', { examId })
}

// ─── 复核申请 ─────────────────────────────────

/** 复核申请状态 BadgeTone 映射（用于 UiTag/UiBadge） */
export const REVIEW_REQUEST_STATUS_TONE: Record<GradeReviewRequestStatusCode, BadgeTone> = {
  [GradeReviewRequestStatusCode.PENDING]: 'orange',
  [GradeReviewRequestStatusCode.IN_REVIEW]: 'blue',
  [GradeReviewRequestStatusCode.APPROVED]: 'green',
  [GradeReviewRequestStatusCode.REJECTED]: 'red',
  [GradeReviewRequestStatusCode.CORRECTED]: 'purple',
}

/** 复核申请状态下拉选项 */
export const REVIEW_REQUEST_STATUS_OPTIONS: Array<{
  label: string
  value: GradeReviewRequestStatusCode
}> = ALL_GRADE_REVIEW_REQUEST_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(GradeReviewRequestStatusDescription, value, '复核申请状态'),
}))

/** 复核申请主流程状态链（不含驳回终止分支），供列表页流程 hint 展示 */
export const REVIEW_REQUEST_MAIN_FLOW_STATUSES: GradeReviewRequestStatusCode[] = [
  GradeReviewRequestStatusCode.PENDING,
  GradeReviewRequestStatusCode.IN_REVIEW,
  GradeReviewRequestStatusCode.APPROVED,
  GradeReviewRequestStatusCode.CORRECTED,
]

/** 复核申请主流程 hint */
export const REVIEW_REQUEST_FLOW_HINT = `${REVIEW_REQUEST_MAIN_FLOW_STATUSES.map((status) =>
  strictEnumLabel(GradeReviewRequestStatusDescription, status, '复核申请状态'),
).join(
  ' → ',
)}（${strictEnumLabel(GradeReviewRequestStatusDescription, GradeReviewRequestStatusCode.REJECTED, '复核申请状态')}终止）`

/** 复核原因类型下拉选项 */
export const GRADE_REVIEW_REASON_TYPE_OPTIONS: Array<{
  label: string
  value: GradeReviewReasonTypeCode
}> = ALL_GRADE_REVIEW_REASON_TYPE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(GradeReviewReasonTypeDescription, value, '复核原因类型'),
}))

/** 复核申请提交请求 - 对应 GradeReviewSubmitRequest */
export interface GradeReviewSubmitRequest {
  examId: string
  paperInstanceId: string
  /** 申请复核的题目提交值；空数组表示总分复核 */
  questionIds: string[]
  requestReason: string
  reasonType: GradeReviewReasonTypeCode
  /** 佐证材料文件ID列表 */
  evidenceFileIds?: string[]
}

/** 复核申请题目业务引用 */
export interface GradeReviewQuestionRefVO {
  /** 制卷题目提交值，仅用于请求参数派生，普通 UI 不直接展示 */
  layoutQuestionId: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
  /** 题目当前教师复核分，供单题更正合成总分预检 */
  currentTeacherReviewScore?: number
}

/** 复核申请佐证文件业务引用 */
export interface GradeReviewEvidenceFileRefVO {
  /** edu-storage 文件系统节点 ID */
  fileId: string
  /** 佐证文件展示名 */
  fileName: string
}

/** 教师端复核申请列表项 - 对应 GradeReviewRequestItemResponse */
export interface GradeReviewRequestItemResponse {
  id: string
  tenantId: string
  examId: string
  examName: string
  examNo: string
  studentUserId: string
  studentNo: string
  studentName: string
  paperInstanceId: string
  questionRefs: GradeReviewQuestionRefVO[]
  evidenceFileRefs: GradeReviewEvidenceFileRefVO[]
  requestReason: string
  reasonType: GradeReviewReasonTypeCode
  requestStatus: GradeReviewRequestStatusCode
  reviewerUserId?: string
  reviewNote?: string
  reviewTime?: string
  createTime: string
  updateTime?: string
  /** 当前考试分，供单题更正合成总分预检 */
  currentExamScore?: number
  /** 当前合成总成绩，供 cap60 预检 */
  currentTotalScore?: number
  /** 当前平时分，单题更正合成总分时参与计算 */
  currentDailyScore?: number
  /** 当前卷级最终成绩状态；WITHDRAWN 撤回待重发仍可执行成绩更正 */
  finalScoreStatus?: FinalScoreStatusCode
}

/** 复核处理汇总 - 对应 GradeReviewSummaryResponse */
export interface GradeReviewSummaryResponse {
  pendingRequestCount: number
  inReviewRequestCount: number
  approvedRequestCount: number
  rejectedRequestCount: number
  correctedRequestCount: number
  correctionRecordCount: number
  /** MVR-279：是否可领取/处理复核与成绩更正；与 BE requireExamReviewerPermission 对齐 */
  canManageReviewerWrites?: boolean
}

/** 复核处理请求 - 对应 GradeReviewHandleRequest */
export interface GradeReviewHandleRequest {
  reviewRequestId: string
  conclusion: GradeReviewRequestStatusCode
  reviewNote?: string
}

/**
 * 提交复核申请
 * POST /api/exam/grade-review/request/submit
 */
export function submitReviewRequest(
  request: GradeReviewSubmitRequest,
): Promise<GradeReviewRequestItemResponse> {
  return http.post<GradeReviewRequestItemResponse>('/api/exam/grade-review/request/submit', request)
}

/**
 * 复核申请列表查询请求 - 对应 GradeReviewRequestListQuery
 */
export interface GradeReviewRequestListQuery extends QueryDto {
  examId: string
  studentUserId?: string
  requestStatus?: GradeReviewRequestStatusCode
  keyword?: string
  layoutQuestionId?: string
}

/**
 * 查询复核申请列表
 * POST /api/exam/grade-review/request/list
 *
 * 2026-05-14：按 AGENTS.md "API 超过 2 个参数必须转 DTO" 约束，
 * 后端由 GET + @RequestParam(examId, studentUserId, requestStatus) 重构为 POST + GradeReviewRequestListQuery。
 */
export function listReviewRequests(
  request: GradeReviewRequestListQuery,
): Promise<PageResult<GradeReviewRequestItemResponse>> {
  return http.post<PageResult<GradeReviewRequestItemResponse>>(
    '/api/exam/grade-review/request/list',
    request,
  )
}

/**
 * 查询考试下已通过复核申请涉及的去重题目选项。
 * POST /api/exam/grade-review/request/approved-question-options
 */
export function listApprovedReviewQuestionOptions(
  examId: string,
): Promise<GradeReviewQuestionRefVO[]> {
  return http.post<GradeReviewQuestionRefVO[]>(
    '/api/exam/grade-review/request/approved-question-options',
    { examId },
  )
}

/** 学生“我的复核申请”列表项 - 对应 StudentGradeReviewRequestItemResponse */
export interface StudentGradeReviewRequestItemResponse {
  id: string
  tenantId?: string
  examId: string
  examName: string
  examNo: string
  paperInstanceId?: string
  studentNo: string
  studentName: string
  questionRefs: GradeReviewQuestionRefVO[]
  evidenceFileRefs: GradeReviewEvidenceFileRefVO[]
  requestReason: string
  reasonType: GradeReviewReasonTypeCode
  requestStatus: GradeReviewRequestStatusCode
  reviewerUserId?: string
  reviewNote?: string
  reviewTime?: string
  createTime: string
  updateTime?: string
}

/**
 * 跨考试聚合分页查询当前学生的复核申请。
 * 用于学生端 /student/appeal，避免按考试逐个调用 listReviewRequests 的 N+1。
 * POST /api/exam/grade-review/request/student-list
 */
export interface StudentGradeReviewRequestListQuery extends QueryDto {
  requestStatus?: GradeReviewRequestStatusCode
  examId?: string
}

export function listMyReviewRequests(
  request: StudentGradeReviewRequestListQuery = {},
): Promise<PageResult<StudentGradeReviewRequestItemResponse>> {
  return http.post<PageResult<StudentGradeReviewRequestItemResponse>>(
    '/api/exam/grade-review/request/student-list',
    request,
  )
}

/**
 * 统计当前学生待处理复核申请数量（PENDING + IN_REVIEW + APPROVED）
 * POST /api/exam/grade-review/request/student-pending-count
 */
export function countMyPendingReviewRequests(): Promise<number> {
  return http.post<number>('/api/exam/grade-review/request/student-pending-count', {})
}

export function getReviewSummary(examId: string): Promise<GradeReviewSummaryResponse> {
  return http.post<GradeReviewSummaryResponse>('/api/exam/grade-review/summary', { examId })
}

/**
 * 领取复核申请
 * POST /api/exam/grade-review/request/claim
 */
export interface GradeReviewClaimRequest {
  reviewRequestId: string
}

export function claimReviewRequest(request: GradeReviewClaimRequest): Promise<void> {
  return http.post<void>('/api/exam/grade-review/request/claim', request)
}

/**
 * 处理复核申请
 * POST /api/exam/grade-review/request/handle
 */
export function handleReviewRequest(request: GradeReviewHandleRequest): Promise<void> {
  return http.post<void>('/api/exam/grade-review/request/handle', request)
}

// ─── 成绩更正 ─────────────────────────────────
/** 成绩更正请求 - 对应 GradeCorrectionRequest */
export interface GradeCorrectionRequest {
  examId: string
  layoutQuestionId?: string
  /** 更正后分数 - 后端 BigDecimal，前端用 number 传输 */
  afterScore: number
  reason: string
  reviewRequestId: string
}

/** 成绩更正记录 - 对应 ExamGradeCorrectionRecordResponse */
export interface ExamGradeCorrectionRecordResponse {
  id: string
  tenantId: string
  examId: string
  studentUserId: string
  studentNo: string
  studentName: string
  paperInstanceId: string
  layoutQuestionId?: string
  questionNo: string
  questionType?: QuestionTypeCode
  fullScore?: number
  correctionType: GradeCorrectionTypeCode
  beforeScore: number
  afterScore: number
  reason: string
  reviewRequestId?: string
  batchPlanId?: string
  approvedUserId?: string
  effectiveTime?: string
  correctionStatus: GradeCorrectionStatusCode
  createTime: string
  updateTime?: string
  /** 更正前成绩已发布时须重新发布 */
  requiresRepublish?: boolean
  /** 更正后复核申请状态；多题申请可在全部题目更正前保持 APPROVED */
  reviewRequestStatusAfterCorrection?: GradeReviewRequestStatusCode
  /** 按题复核申请中尚未完成单题更正的题目数 */
  remainingUncorrectedQuestionCount?: number
  /** 更正后最终成绩状态 */
  finalScoreStatusAfterCorrection?: FinalScoreStatusCode
}

/**
 * 创建成绩更正
 * POST /api/exam/grade-review/correction/create
 */
export function createCorrection(
  request: GradeCorrectionRequest,
): Promise<ExamGradeCorrectionRecordResponse> {
  return http.post<ExamGradeCorrectionRecordResponse>(
    '/api/exam/grade-review/correction/create',
    request,
  )
}

/**
 * 查询成绩更正记录
 * POST /api/exam/grade-review/correction/list
 */
export interface GradeCorrectionListQuery extends QueryDto {
  examId: string
  studentUserId?: string
  keyword?: string
}

export function listCorrections(
  request: GradeCorrectionListQuery,
): Promise<PageResult<ExamGradeCorrectionRecordResponse>> {
  return http.post<PageResult<ExamGradeCorrectionRecordResponse>>(
    '/api/exam/grade-review/correction/list',
    request,
  )
}

// ─── 批量更正计划 ─────────────────────────────────

/** 批量更正审批状态徽标颜色（统一 BadgeTone） */
export const BATCH_CORRECTION_STATUS_TONE: Record<BatchCorrectionApprovalStatusCode, BadgeTone> = {
  [BatchCorrectionApprovalStatusCode.DRAFT]: 'gray',
  [BatchCorrectionApprovalStatusCode.PENDING_APPROVAL]: 'orange',
  [BatchCorrectionApprovalStatusCode.APPROVED]: 'blue',
  [BatchCorrectionApprovalStatusCode.EXECUTING]: 'blue',
  [BatchCorrectionApprovalStatusCode.COMPLETED]: 'green',
  [BatchCorrectionApprovalStatusCode.REJECTED]: 'red',
}

/** 批量更正审批状态下拉选项 */
export const BATCH_CORRECTION_STATUS_OPTIONS: Array<{
  label: string
  value: BatchCorrectionApprovalStatusCode
}> = ALL_BATCH_CORRECTION_APPROVAL_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(BatchCorrectionApprovalStatusDescription, value, '批量更正审批状态'),
}))

/** 批量更正主流程状态链（不含 REJECTED 分支），供列表页流程 hint 展示 */
export const BATCH_CORRECTION_MAIN_FLOW_STATUSES: BatchCorrectionApprovalStatusCode[] = [
  BatchCorrectionApprovalStatusCode.DRAFT,
  BatchCorrectionApprovalStatusCode.PENDING_APPROVAL,
  BatchCorrectionApprovalStatusCode.APPROVED,
  BatchCorrectionApprovalStatusCode.EXECUTING,
  BatchCorrectionApprovalStatusCode.COMPLETED,
]

/** 批量更正主流程 hint */
export const BATCH_CORRECTION_FLOW_HINT = BATCH_CORRECTION_MAIN_FLOW_STATUSES.map((status) =>
  strictEnumLabel(BatchCorrectionApprovalStatusDescription, status, '批量更正审批状态'),
).join(' → ')

/** 批量成绩更正计划 - 对应 ExamBatchGradeCorrectionPlan */
export interface ExamBatchGradeCorrectionPlan {
  id: string
  tenantId?: string
  examId: string
  planName: string
  correctionType: GradeCorrectionTypeCode
  affectedQuestionRefs: GradeReviewQuestionRefVO[]
  affectedStudentCount: number
  /** 创建时填写的更正原因 */
  reason?: string
  /** 审批备注或驳回原因 */
  decisionReason?: string
  /** 执行说明 */
  executeReason?: string
  /** 执行失败原因 */
  failureReason?: string
  approvalStatus: BatchCorrectionApprovalStatusCode
  approvedUserId?: string
  approvedTime?: string
  executedTime?: string
  executedCount: number
  /** 创建人；草稿归属 */
  createUser?: string
  /** 最近更新人；PENDING 态为提交审批人（MVR-195） */
  updateUser?: string
  createTime: string
  updateTime?: string
}

export interface BatchCorrectionPlanItemRequest {
  reviewRequestId: string
  afterScore: number
}

export interface BatchCorrectionPlanCreateRequest {
  examId: string
  planName: string
  correctionType: Exclude<GradeCorrectionTypeCode, GradeCorrectionTypeCode.SYSTEM_REJUDGE>
  layoutQuestionId?: string
  items: BatchCorrectionPlanItemRequest[]
  reason: string
}

export interface BatchCorrectionPlanSubmitRequest {
  planId: string
}

export interface BatchCorrectionPlanDecisionRequest {
  planId: string
  approved: boolean
  reason?: string
}

export interface BatchCorrectionPlanExecuteRequest {
  planId: string
  executeReason?: string
}

/** 批量更正计划列表查询 - 对应 BatchCorrectionPlanListQuery */
export interface BatchCorrectionPlanListQuery extends QueryDto {
  examId: string
  approvalStatus?: BatchCorrectionApprovalStatusCode
  keyword?: string
}

/**
 * 分页查询批量更正计划
 * POST /api/exam/grade-review/batch-correction/list
 */
export function listBatchCorrectionPlans(
  request: BatchCorrectionPlanListQuery,
): Promise<PageResult<ExamBatchGradeCorrectionPlan>> {
  return http.post<PageResult<ExamBatchGradeCorrectionPlan>>(
    '/api/exam/grade-review/batch-correction/list',
    request,
  )
}

export function createBatchCorrectionPlan(
  request: BatchCorrectionPlanCreateRequest,
): Promise<ExamBatchGradeCorrectionPlan> {
  return http.post<ExamBatchGradeCorrectionPlan>(
    '/api/exam/grade-review/batch-correction/create',
    request,
  )
}

export function submitBatchCorrectionPlan(
  request: BatchCorrectionPlanSubmitRequest,
): Promise<void> {
  return http.post<void>('/api/exam/grade-review/batch-correction/submit', request)
}

export function approveBatchCorrectionPlan(
  request: BatchCorrectionPlanDecisionRequest,
): Promise<void> {
  return http.post<void>('/api/exam/grade-review/batch-correction/approve', request)
}

export function executeBatchCorrectionPlan(
  request: BatchCorrectionPlanExecuteRequest,
): Promise<void> {
  return http.post<void>('/api/exam/grade-review/batch-correction/execute', request)
}

/**
 * 单题更正合成总成绩预检：当前考试分 − 当前题分 + 更正后题分 + 平时分。
 * 缺少成绩快照时返回 null，由后端硬校验兜底。
 */
export function computeSingleQuestionCorrectionCompositeTotal(
  request: GradeReviewRequestItemResponse,
  layoutQuestionId: string,
  afterScore: number,
): number | null {
  if (request.currentExamScore == null) {
    return null
  }
  const questionRef = request.questionRefs.find(
    (question) => question.layoutQuestionId === layoutQuestionId,
  )
  if (!questionRef || questionRef.currentTeacherReviewScore == null) {
    return null
  }
  const dailyScore = request.currentDailyScore ?? 0
  const correctedExamScore
    = request.currentExamScore - questionRef.currentTeacherReviewScore + afterScore
  return correctedExamScore + dailyScore
}

/** 补考 cap60 下单题更正合成总分是否超限 */
export function isMakeupCap60SingleQuestionCorrectionExceeded(
  request: GradeReviewRequestItemResponse,
  layoutQuestionId: string,
  afterScore: number,
): boolean {
  const projected = computeSingleQuestionCorrectionCompositeTotal(
    request,
    layoutQuestionId,
    afterScore,
  )
  return projected != null && projected > 60
}
