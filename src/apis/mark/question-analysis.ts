/**
 * 题目质量分析与重判 API - 对接 edu-mark 模块 QuestionAnalysisController
 *
 * 后端规则：
 * - 路径前缀 /api/exam/question-analysis
 * - 部分查询接口为 GET（@RequestParam），写操作为 POST（多数 @RequestParam，无 body）
 * - 后端 Long ID 统一用 string 表达到前端
 */
import http from '@/config/axios'

// ─── 题目质量分析 ─────────────────────────────────

/** 题目质量分析记录 - 对应 ExamQuestionAnalysisRecord */
export interface ExamQuestionAnalysisRecordVO {
  id: string
  tenantId?: string
  examId: string
  questionTemplateId?: string
  totalCount?: number
  correctCount?: number
  wrongCount?: number
  needReviewCount?: number
  avgScore?: number
  maxScore?: number
  minScore?: number
  scoreStddev?: number
  difficultyIndex?: number
  discriminationIndex?: number
  fullScore?: number
  zeroScoreCount?: number
  fullScoreCount?: number
  snapshotTime?: string
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

/** 客观题判定结果 */
export type ObjectiveResultCode = 'CORRECT' | 'WRONG' | 'PARTIAL' | 'NEED_REVIEW' | 'NOT_APPLICABLE'

/** 批改状态 */
export type GradeStatusCode = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'NEED_REVIEW' | 'BLOCKED'

/** 学生错题本条目 - 对应 StudentWrongBookItemResponse */
export interface StudentWrongBookItemVO {
  gradeResultId?: string
  examId: string
  paperInstanceId?: string
  questionTemplateId?: string
  fullScore?: number
  finalScore?: number
  objectiveResult?: ObjectiveResultCode
  gradeStatus?: GradeStatusCode
  commentText?: string
  isWrong?: boolean
}

/**
 * 查询学生错题本
 * GET /api/exam/question-analysis/wrong-book
 */
export function getStudentWrongBook(params: {
  examId: string
  questionTemplateId?: string
  wrongOnly?: boolean
}): Promise<StudentWrongBookItemVO[]> {
  return http.get<StudentWrongBookItemVO[]>('/api/exam/question-analysis/wrong-book', { params })
}

// ─── 答案确认生效 ─────────────────────────────────

/** 客观题比对策略 */
export type ObjectiveComparePolicyCode = 'EXACT' | 'TRIM_EQUAL' | 'NUMERIC_TOLERANCE' | 'REGEX'

/** 生效状态 */
export type EffectiveStatusCode = 'DRAFT' | 'ACTIVE'

/** 生效状态文案映射 */
export const EFFECTIVE_STATUS_LABEL: Record<EffectiveStatusCode, string> = {
  DRAFT: '草稿',
  ACTIVE: '已生效',
}

/** 生效状态徽标颜色 */
export const EFFECTIVE_STATUS_COLOR: Record<EffectiveStatusCode, string> = {
  DRAFT: 'default',
  ACTIVE: 'green',
}

/** 答案确认生效请求 - 对应 AnswerEffectiveConfirmRequest */
export interface AnswerEffectiveConfirmPayload {
  examId: string
  questionTemplateId: string
  standardAnswerId?: string
  comparePolicy?: string
  aiReviewHintId?: string
  knowledgePointIds?: string
}

/** 答案确认生效配置 - 对应 ExamAnswerEffectiveConfig */
export interface ExamAnswerEffectiveConfigVO {
  id: string
  tenantId?: string
  examId: string
  questionTemplateId?: string
  standardAnswerId?: string
  comparePolicy?: ObjectiveComparePolicyCode
  aiReviewHintId?: string
  knowledgePointIds?: string
  effectiveStatus?: EffectiveStatusCode
  confirmedBy?: string
  confirmedTime?: string
  createTime?: string
  updateTime?: string
}

/**
 * 确认答案生效（已有结果时自动创建重判计划）
 * POST /api/exam/question-analysis/answer-effective/confirm
 */
export function confirmAnswerEffective(
  payload: AnswerEffectiveConfirmPayload,
): Promise<ExamAnswerEffectiveConfigVO> {
  return http.post<ExamAnswerEffectiveConfigVO>(
    '/api/exam/question-analysis/answer-effective/confirm',
    payload,
  )
}

/**
 * 查询当前生效配置
 * GET /api/exam/question-analysis/answer-effective/get
 */
export function getEffectiveConfig(params: {
  examId: string
  questionTemplateId: string
}): Promise<ExamAnswerEffectiveConfigVO | null> {
  return http.get<ExamAnswerEffectiveConfigVO | null>(
    '/api/exam/question-analysis/answer-effective/get',
    { params },
  )
}

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

/** 重判计划状态徽标颜色 */
export const REJUDGE_PLAN_STATUS_COLOR: Record<RejudgePlanStatusCode, string> = {
  DRAFT: 'default',
  PENDING_APPROVAL: 'orange',
  APPROVED: 'cyan',
  EXECUTING: 'blue',
  COMPLETED: 'green',
  REJECTED: 'red',
}

/** 重判触发类型文案映射 */
export const REJUDGE_TRIGGER_TYPE_LABEL: Record<RejudgeTriggerTypeCode, string> = {
  ANSWER_CHANGE: '答案变更',
  POLICY_CHANGE: '策略变更',
  SYSTEM_ERROR: '系统错误',
}

/** 重判计划 - 对应 ExamRejudgePlan */
export interface ExamRejudgePlanVO {
  id: string
  tenantId?: string
  examId: string
  triggerType?: RejudgeTriggerTypeCode
  triggerSourceId?: string
  affectedQuestionIds?: string
  affectedStudentCount?: number
  planStatus?: RejudgePlanStatusCode
  beforeAfterDiff?: string
  approvedBy?: string
  approvedTime?: string
  executedTime?: string
  executedCount?: number
  createTime?: string
  updateTime?: string
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
 * POST /api/exam/question-analysis/rejudge-plan/approve?planId=
 */
export function approveRejudgePlan(planId: string): Promise<void> {
  return http.post<void>(
    `/api/exam/question-analysis/rejudge-plan/approve?planId=${encodeURIComponent(planId)}`,
  )
}
