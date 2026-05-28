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
import type { PageResult, QueryDto } from '@/types'
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
  /** 允许的申请原因类型 */
  allowedReasonTypes?: GradeReviewReasonTypeCode[]
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
  allowedReasonTypes?: GradeReviewReasonTypeCode[]
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

/** 复核原因类型编码 - 与后端 GradeReviewReasonType 完全一致 */
export type GradeReviewReasonTypeCode = 'SCORE_ERROR' | 'RUBRIC' | 'OBJECTIVE' | 'OTHER'

/** 复核原因类型文案映射 */
export const GRADE_REVIEW_REASON_TYPE_LABEL: Record<GradeReviewReasonTypeCode, string> = {
  SCORE_ERROR: '分数计算错误',
  RUBRIC: '评分标准争议',
  OBJECTIVE: '客观题判定争议',
  OTHER: '其他',
}

/** 复核申请提交请求 - 对应 GradeReviewSubmitRequest */
export interface GradeReviewSubmitPayload {
  examId: string
  paperInstanceId: string
  /** 申请复核的题目ID列表；空数组表示总分复核 */
  questionIds: string[]
  requestReason: string
  reasonType: GradeReviewReasonTypeCode
  /** 佐证材料文件ID列表 */
  evidenceFileIds?: string[]
}

/** 复核申请 - 对应 ExamGradeReviewRequest */
export interface ExamGradeReviewRequestVO {
  id: string
  tenantId?: string
  examId: string
  studentUserId: string
  paperInstanceId: string
  questionIds: string[]
  requestReason: string
  reasonType: GradeReviewReasonTypeCode
  evidenceFileIds?: string[]
  requestStatus: GradeReviewRequestStatusCode
  reviewerUserId?: string
  reviewNote?: string
  reviewTime?: string
  createTime: string
  updateTime?: string
}

/** 复核处理汇总 - 对应 GradeReviewSummaryResponse */
export interface GradeReviewSummaryVO {
  pendingRequestCount: number
  inReviewRequestCount: number
  approvedRequestCount: number
  rejectedRequestCount: number
  correctedRequestCount: number
  correctionRecordCount: number
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
  return http.post<unknown>('/api/exam/grade-review/request/submit', payload)
    .then(validateExamGradeReviewRequest)
}

/**
 * 复核申请列表查询请求 - 对应 GradeReviewRequestListQuery
 */
export interface GradeReviewRequestListQueryPayload extends QueryDto {
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
): Promise<PageResult<ExamGradeReviewRequestVO>> {
  return http.post<unknown>('/api/exam/grade-review/request/list', payload)
    .then((value) => validatePageResult(value, validateExamGradeReviewRequest, '复核申请分页'))
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
  reasonType: GradeReviewReasonTypeCode
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
  return http.get<unknown>(
    '/api/exam/grade-review/request/student-list',
    { params },
  ).then(validateStudentGradeReviewRequestList)
}

/**
 * 查询复核处理汇总
 * GET /api/exam/grade-review/summary?examId=
 */
export function getReviewSummary(examId: string): Promise<GradeReviewSummaryVO> {
  return http.get<unknown>('/api/exam/grade-review/summary', {
    params: { examId },
  }).then(validateGradeReviewSummary)
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

function requireFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requirePageNumber(value: unknown, fieldName: string): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return value
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value)
    if (Number.isSafeInteger(parsed)) {
      return parsed
    }
  }
  throw new TypeError(`${fieldName} 接口返回格式错误`)
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

function requireStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value.map((item, index) => requireString(item, `${fieldName}[${index}]`))
}

function optionalStringArray(value: unknown, fieldName: string): string[] | undefined {
  if (value === undefined || value === null) return undefined
  return requireStringArray(value, fieldName)
}

function requireObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value as Record<string, unknown>
}

function requireGradeReviewRequestStatus(
  value: unknown,
  fieldName: string,
): GradeReviewRequestStatusCode {
  if (
    value !== 'PENDING'
    && value !== 'IN_REVIEW'
    && value !== 'APPROVED'
    && value !== 'REJECTED'
    && value !== 'CORRECTED'
  ) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireGradeReviewReasonType(
  value: unknown,
  fieldName: string,
): GradeReviewReasonTypeCode {
  if (
    value !== 'SCORE_ERROR'
    && value !== 'RUBRIC'
    && value !== 'OBJECTIVE'
    && value !== 'OTHER'
  ) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function validateGradeReviewSummary(value: unknown): GradeReviewSummaryVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('复核处理汇总接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    pendingRequestCount: requireFiniteNumber(result.pendingRequestCount, '待处理复核申请数量'),
    inReviewRequestCount: requireFiniteNumber(result.inReviewRequestCount, '处理中复核申请数量'),
    approvedRequestCount: requireFiniteNumber(result.approvedRequestCount, '已通过复核申请数量'),
    rejectedRequestCount: requireFiniteNumber(result.rejectedRequestCount, '已驳回复核申请数量'),
    correctedRequestCount: requireFiniteNumber(result.correctedRequestCount, '已更正复核申请数量'),
    correctionRecordCount: requireFiniteNumber(result.correctionRecordCount, '成绩更正记录数量'),
  }
}

function validatePageResult<T>(
  value: unknown,
  itemValidator: (item: unknown) => T,
  fieldName: string,
): PageResult<T> {
  const result = requireObject(value, fieldName)
  if (!Array.isArray(result.list)) {
    throw new TypeError(`${fieldName} 列表接口返回格式错误`)
  }
  return {
    list: result.list.map(itemValidator),
    total: requirePageNumber(result.total, `${fieldName} 总数`),
    pageNum: requirePageNumber(result.pageNum, `${fieldName} 页码`),
    pageSize: requirePageNumber(result.pageSize, `${fieldName} 每页数量`),
    pages: requirePageNumber(result.pages, `${fieldName} 总页数`),
  }
}

function validateExamGradeReviewRequest(value: unknown): ExamGradeReviewRequestVO {
  const result = requireObject(value, '复核申请')
  return {
    id: requireString(result.id, '复核申请 ID'),
    tenantId: optionalString(result.tenantId, '租户 ID'),
    examId: requireString(result.examId, '考试 ID'),
    studentUserId: requireString(result.studentUserId, '学生用户 ID'),
    paperInstanceId: requireString(result.paperInstanceId, '试卷实例 ID'),
    questionIds: requireStringArray(result.questionIds, '申请复核题目 ID 列表'),
    requestReason: requireString(result.requestReason, '申请原因'),
    reasonType: requireGradeReviewReasonType(result.reasonType, '复核原因类型'),
    evidenceFileIds: optionalStringArray(result.evidenceFileIds, '佐证材料文件 ID 列表'),
    requestStatus: requireGradeReviewRequestStatus(result.requestStatus, '复核申请状态'),
    reviewerUserId: optionalString(result.reviewerUserId, '复核教师用户 ID'),
    reviewNote: optionalString(result.reviewNote, '复核备注'),
    reviewTime: optionalString(result.reviewTime, '复核时间'),
    createTime: requireString(result.createTime, '申请创建时间'),
    updateTime: optionalString(result.updateTime, '申请更新时间'),
  }
}

function validateStudentGradeReviewRequestItem(value: unknown): StudentGradeReviewRequestItemVO {
  const result = requireObject(value, '学生复核申请列表项')
  return {
    id: requireString(result.id, '复核申请 ID'),
    tenantId: optionalString(result.tenantId, '租户 ID'),
    examId: requireString(result.examId, '考试 ID'),
    examName: requireString(result.examName, '考试名称'),
    examNo: requireString(result.examNo, '考试编号'),
    paperInstanceId: optionalString(result.paperInstanceId, '试卷实例 ID'),
    questionIds: requireStringArray(result.questionIds, '申请复核题目 ID 列表'),
    requestReason: requireString(result.requestReason, '申请原因'),
    reasonType: requireGradeReviewReasonType(result.reasonType, '复核原因类型'),
    evidenceFileIds: optionalStringArray(result.evidenceFileIds, '佐证材料文件 ID 列表'),
    requestStatus: requireGradeReviewRequestStatus(result.requestStatus, '复核申请状态'),
    reviewerUserId: optionalString(result.reviewerUserId, '复核教师用户 ID'),
    reviewNote: optionalString(result.reviewNote, '复核备注'),
    reviewTime: optionalString(result.reviewTime, '复核时间'),
    createTime: requireString(result.createTime, '申请创建时间'),
    updateTime: optionalString(result.updateTime, '申请更新时间'),
  }
}

function validateStudentGradeReviewRequestList(value: unknown): StudentGradeReviewRequestItemVO[] {
  if (!Array.isArray(value)) {
    throw new TypeError('学生复核申请列表接口返回格式错误')
  }
  return value.map(validateStudentGradeReviewRequestItem)
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
