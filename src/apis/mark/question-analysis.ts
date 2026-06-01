import type { QuestionTypeCode } from './grading-experience'
/**
 * 题目质量分析与重判 API - 对接 edu-mark 模块 QuestionAnalysisController
 *
 * 后端规则：
 * - 路径前缀 /api/exam/question-analysis
 * - 部分查询接口为 GET（@RequestParam），写操作为 POST
 * - 后端 Long ID 统一用 string 表达到前端
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'

// ─── 题目质量分析 ─────────────────────────────────

/** 题目质量分析记录 - 对应 ExamQuestionAnalysisRecordResponse */
export interface ExamQuestionAnalysisRecordVO {
  id: string
  tenantId?: string
  examId: string
  questionTemplateId: string
  questionNo: string
  questionType: QuestionTypeCode
  questionStem?: string
  totalCount: number
  correctCount: number
  wrongCount: number
  needReviewCount: number
  avgScore?: number
  maxScore?: number
  minScore?: number
  scoreStddev?: number
  difficultyIndex?: number
  discriminationIndex?: number
  fullScore: number
  zeroScoreCount: number
  fullScoreCount: number
  snapshotTime: string
  createTime?: string
  updateTime?: string
}

/**
 * 生成单题质量分析
 * POST /api/exam/question-analysis/generate?examId=&questionTemplateId=
 */
export function generateQuestionAnalysis(params: {
  examId: string
  questionTemplateId: string
}): Promise<ExamQuestionAnalysisRecordVO> {
  const search = new URLSearchParams({
    examId: params.examId,
    questionTemplateId: params.questionTemplateId,
  }).toString()
  return http.post<ExamQuestionAnalysisRecordVO>(`/api/exam/question-analysis/generate?${search}`)
}

/**
 * 批量生成所有题目质量分析
 * POST /api/exam/question-analysis/generate-all?examId=
 */
export function generateAllQuestionAnalysis(
  examId: string,
): Promise<ExamQuestionAnalysisRecordVO[]> {
  return http.post<ExamQuestionAnalysisRecordVO[]>(
    `/api/exam/question-analysis/generate-all?examId=${encodeURIComponent(examId)}`,
  )
}

/**
 * 查询题目质量分析列表
 * GET /api/exam/question-analysis/list
 */
export function listQuestionAnalysis(params: {
  examId: string
  questionTemplateId?: string
}): Promise<ExamQuestionAnalysisRecordVO[]> {
  return http.get<ExamQuestionAnalysisRecordVO[]>('/api/exam/question-analysis/list', { params })
}

// ─── 学生错题本 ─────────────────────────────────
// ─── 答案确认生效 ─────────────────────────────────
// ─── 重判计划 ─────────────────────────────────

/** 重判计划状态 */
export type RejudgePlanStatusCode
  = | 'DRAFT'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'EXECUTING'
    | 'COMPLETED'
    | 'REJECTED'

/** 重判触发类型 */
export type RejudgeTriggerTypeCode = 'ANSWER_CHANGE' | 'POLICY_CHANGE' | 'SYSTEM_ERROR'

/** 重判计划状态文案映射 */
export const REJUDGE_PLAN_STATUS_LABEL: Record<RejudgePlanStatusCode, string> = {
  DRAFT: '草稿',
  PENDING_APPROVAL: '待审批',
  APPROVED: '已审批',
  EXECUTING: '执行中',
  COMPLETED: '已完成',
  REJECTED: '已驳回',
}

/** 重判计划状态徽标颜色（统一 BadgeTone） */
export const REJUDGE_PLAN_STATUS_COLOR: Record<RejudgePlanStatusCode, BadgeTone> = {
  DRAFT: 'gray',
  PENDING_APPROVAL: 'orange',
  APPROVED: 'blue',
  EXECUTING: 'blue',
  COMPLETED: 'green',
  REJECTED: 'red',
}

/** 重判计划状态下拉选项，值必须与后端 RejudgePlanStatus 完全一致 */
export const REJUDGE_PLAN_STATUS_OPTIONS: Array<{
  label: string
  value: RejudgePlanStatusCode
}> = [
  { value: 'DRAFT', label: REJUDGE_PLAN_STATUS_LABEL.DRAFT },
  { value: 'PENDING_APPROVAL', label: REJUDGE_PLAN_STATUS_LABEL.PENDING_APPROVAL },
  { value: 'APPROVED', label: REJUDGE_PLAN_STATUS_LABEL.APPROVED },
  { value: 'EXECUTING', label: REJUDGE_PLAN_STATUS_LABEL.EXECUTING },
  { value: 'COMPLETED', label: REJUDGE_PLAN_STATUS_LABEL.COMPLETED },
  { value: 'REJECTED', label: REJUDGE_PLAN_STATUS_LABEL.REJECTED },
]

/** 重判触发类型文案映射 */
export const REJUDGE_TRIGGER_TYPE_LABEL: Record<RejudgeTriggerTypeCode, string> = {
  ANSWER_CHANGE: '答案变更',
  POLICY_CHANGE: '策略变更',
  SYSTEM_ERROR: '系统错误',
}

/** 重判计划题目业务引用 */
export interface RejudgePlanQuestionRefVO {
  /** 题目模板 ID 仅作为提交值使用，普通 UI 不直接展示 */
  questionTemplateId: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
}

/** 重判计划 - 对应 ExamRejudgePlan */
export interface ExamRejudgePlanVO {
  id: string
  tenantId?: string
  examId: string
  triggerType: RejudgeTriggerTypeCode
  affectedQuestionRefs?: RejudgePlanQuestionRefVO[]
  affectedStudentCount?: number
  planStatus: RejudgePlanStatusCode
  approvedBy?: string
  approvedTime?: string
  executedTime?: string
  executedCount?: number
  createTime?: string
  updateTime?: string
}

/** 重判计划审批请求 - 对应 RejudgePlanDecisionRequest */
export interface RejudgePlanDecisionRequest {
  planId: string
  approved: boolean
  reason?: string
}

/** 重判计划执行请求 - 对应 RejudgePlanExecuteRequest */
export interface RejudgePlanExecuteRequest {
  planId: string
  executeReason?: string
}

/**
 * 查询重判计划列表
 * GET /api/exam/question-analysis/rejudge-plan/list
 */
export function listRejudgePlans(params: {
  examId: string
  planStatus?: RejudgePlanStatusCode
}): Promise<ExamRejudgePlanVO[]> {
  return http.get<ExamRejudgePlanVO[]>('/api/exam/question-analysis/rejudge-plan/list', { params })
}

/**
 * 审批重判计划
 * POST /api/exam/question-analysis/rejudge-plan/approve
 */
export function approveRejudgePlan(request: RejudgePlanDecisionRequest): Promise<void> {
  return http.post<void>('/api/exam/question-analysis/rejudge-plan/approve', request)
}

/**
 * 执行重判计划
 * POST /api/exam/question-analysis/rejudge-plan/execute
 */
export function executeRejudgePlan(request: RejudgePlanExecuteRequest): Promise<void> {
  return http.post<void>('/api/exam/question-analysis/rejudge-plan/execute', request)
}
