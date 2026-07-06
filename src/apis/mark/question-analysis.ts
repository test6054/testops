import type { AnalysisScopeTypeCode } from './analysis-scope-type'
import type { EffectiveStatusCode } from './effective-status'
import type { ObjectiveComparePolicyCode } from './exam-standard-answer'
import type { GradeStatusCode } from './grade-status'
import type { ObjectiveResultCode } from './objective-result'
import type { QuestionTypeCode } from './question-type'
/**
 * 题目质量分析与重判 API - 对接 edu-mark 模块 QuestionAnalysisController
 *
 * 后端规则：
 * - 路径前缀 /api/exam/question-analysis
 * - 列表查询 POST + QuestionAnalysisListQueryRequest（含 pageNum/pageSize）
 * - 生成类接口 POST + 请求体 DTO
 * - 后端 Long ID 统一用 string 表达到前端
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type { RejudgeTriggerTypeCode } from '@/types/enums/rejudge-trigger-type-enum'
import http from '@/config/axios'
import {
  ALL_REJUDGE_PLAN_STATUS_CODES,
  RejudgePlanStatusCode,
  RejudgePlanStatusDescription,
} from '@/types/enums/rejudge-plan-status-enum'
import { readAllPages } from '@/utils/page-result'

// ─── 题目质量分析 ─────────────────────────────────

/** 题目质量分析记录 - 对应 ExamQuestionAnalysisRecordResponse */
export interface ExamQuestionAnalysisRecordResponse {
  id: string
  tenantId?: string
  examId: string
  scopeType?: AnalysisScopeTypeCode
  scopeId?: string
  layoutQuestionId: string
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

export interface ExamQuestionAnalysisGenerateRequest {
  examId: string
  layoutQuestionId: string
  classId?: string
}

export interface ExamClassScopeQueryRequest {
  examId: string
  classId?: string
}

export function generateQuestionAnalysis(
  request: ExamQuestionAnalysisGenerateRequest,
): Promise<ExamQuestionAnalysisRecordResponse> {
  return http.post<ExamQuestionAnalysisRecordResponse>('/api/exam/question-analysis/generate', request)
}

export function generateAllQuestionAnalysis(
  request: ExamClassScopeQueryRequest,
): Promise<ExamQuestionAnalysisRecordResponse[]> {
  return http.post<ExamQuestionAnalysisRecordResponse[]>(
    '/api/exam/question-analysis/generate-all',
    request,
  )
}

/** 统计页自动翻页拉全量时的单页大小，与后端 PageHelper 默认上限对齐 */
export const QUESTION_ANALYSIS_LIST_PAGE_SIZE = 500

/**
 * 题目质量分析列表查询 - 对应 QuestionAnalysisListQueryRequest
 */
export interface QuestionAnalysisListQueryRequest extends QueryDto {
  examId: string
  layoutQuestionId?: string
  classId?: string
}

/** 题目质量分析全量读取请求 - 与 QuestionAnalysisListQueryRequest 查询字段一致，分页字段由读取器填入 */
export interface QuestionAnalysisFetchAllRequest {
  examId: string
  layoutQuestionId?: string
  classId?: string
}

/**
 * 分页查询题目质量分析列表
 * POST /api/exam/question-analysis/list
 */
export function pageQuestionAnalysis(
  request: QuestionAnalysisListQueryRequest,
): Promise<PageResult<ExamQuestionAnalysisRecordResponse>> {
  return http.post<PageResult<ExamQuestionAnalysisRecordResponse>>(
    '/api/exam/question-analysis/list',
    request,
  )
}

/**
 * 统计图表所需全量题目质量分析：按 PageResult 协议自动翻页直至 pages 耗尽。
 */
export function fetchAllQuestionAnalysisRows(
  request: QuestionAnalysisFetchAllRequest,
): Promise<ExamQuestionAnalysisRecordResponse[]> {
  return readAllPages(
    (pageNum) =>
      pageQuestionAnalysis({
        ...request,
        pageNum,
        pageSize: QUESTION_ANALYSIS_LIST_PAGE_SIZE,
      }),
    '题目质量分析加载失败',
  )
}

// ─── 学生错题本 ─────────────────────────────────

/** 学生错题本查询请求 - 对应 StudentWrongBookQueryRequest */
export interface StudentWrongBookQueryRequest extends QueryDto {
  examId: string
  layoutQuestionId?: string
  wrongOnly?: boolean
}

/** 学生错题本条目 - 对应 StudentWrongBookItemResponse */
export interface StudentWrongBookItemResponse {
  gradeResultId: string
  examId: string
  paperInstanceId: string
  layoutQuestionId: string
  fullScore: number
  teacherReviewScore?: number
  objectiveResult?: ObjectiveResultCode
  gradeStatus: GradeStatusCode
  commentText?: string
  isWrong: boolean
}

/**
 * 查询当前登录学生的错题本（分页）
 * POST /api/exam/question-analysis/wrong-book
 */
export function pageStudentWrongBook(
  request: StudentWrongBookQueryRequest,
): Promise<PageResult<StudentWrongBookItemResponse>> {
  return http.post<PageResult<StudentWrongBookItemResponse>>(
    '/api/exam/question-analysis/wrong-book',
    request,
  )
}

// ─── 答案确认生效 ─────────────────────────────────

/** 答案确认生效请求 - 对应 AnswerEffectiveConfirmRequest */
export interface AnswerEffectiveConfirmRequest {
  examId: string
  layoutQuestionId: string
  standardAnswerId?: string
  comparePolicy?: ObjectiveComparePolicyCode
  aiReviewHintId?: string
  knowledgePointIds?: string[]
}

/** 答案确认生效配置 - 对应 ExamAnswerEffectiveConfig */
export interface ExamAnswerEffectiveConfig {
  id?: string
  examId: string
  layoutQuestionId: string
  standardAnswerId?: string
  comparePolicy?: ObjectiveComparePolicyCode
  aiReviewHintId?: string
  knowledgePointIds?: string[]
  effectiveStatus?: EffectiveStatusCode
  confirmedUserId?: string
  confirmedTime?: string
}

/**
 * 确认标准答案生效；已有批改结果时自动创建重判计划
 * POST /api/exam/question-analysis/answer-effective/confirm
 */
export function confirmAnswerEffective(
  request: AnswerEffectiveConfirmRequest,
): Promise<ExamAnswerEffectiveConfig> {
  return http.post<ExamAnswerEffectiveConfig>(
    '/api/exam/question-analysis/answer-effective/confirm',
    request,
  )
}

export function getEffectiveAnswerConfig(params: {
  examId: string
  layoutQuestionId: string
}): Promise<ExamAnswerEffectiveConfig | null> {
  return http.post<ExamAnswerEffectiveConfig | null>(
    '/api/exam/question-analysis/answer-effective/get',
    params,
  )
}

// ─── 重判计划 ─────────────────────────────────

export {
  ALL_REJUDGE_PLAN_STATUS_CODES,
  RejudgePlanStatusCode,
  RejudgePlanStatusDescription,
} from '@/types/enums/rejudge-plan-status-enum'

export {
  ALL_REJUDGE_TRIGGER_TYPE_CODES,
  RejudgeTriggerTypeCode,
  RejudgeTriggerTypeDescription,
} from '@/types/enums/rejudge-trigger-type-enum'

/** 重判计划状态徽标颜色（统一 BadgeTone） */
export const REJUDGE_PLAN_STATUS_TONE: Record<RejudgePlanStatusCode, BadgeTone> = {
  [RejudgePlanStatusCode.DRAFT]: 'gray',
  [RejudgePlanStatusCode.PENDING_APPROVAL]: 'orange',
  [RejudgePlanStatusCode.APPROVED]: 'blue',
  [RejudgePlanStatusCode.EXECUTING]: 'blue',
  [RejudgePlanStatusCode.COMPLETED]: 'green',
  [RejudgePlanStatusCode.REJECTED]: 'red',
}

/** 重判计划状态下拉选项，值必须与后端 RejudgePlanStatus 完全一致 */
export const REJUDGE_PLAN_STATUS_OPTIONS: Array<{
  label: string
  value: RejudgePlanStatusCode
}> = ALL_REJUDGE_PLAN_STATUS_CODES.map((value) => ({
  value,
  label: RejudgePlanStatusDescription[value],
}))

/** 重判计划题目业务引用 */
export interface RejudgePlanQuestionRefVO {
  /** 制卷题目 ID 仅作为提交值使用，普通 UI 不直接展示 */
  layoutQuestionId: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
}

/** 重判计划 - 对应 ExamRejudgePlan */
export interface ExamRejudgePlan {
  id: string
  tenantId?: string
  examId: string
  triggerType: RejudgeTriggerTypeCode
  affectedQuestionRefs?: RejudgePlanQuestionRefVO[]
  affectedStudentCount?: number
  planStatus: RejudgePlanStatusCode
  approvedUserId?: string
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

/** 重判计划列表查询 - 对应 RejudgePlanListQuery */
export interface RejudgePlanListQueryRequest extends QueryDto {
  examId: string
  planStatus?: RejudgePlanStatusCode
}

/**
 * 分页查询重判计划列表
 * POST /api/exam/question-analysis/rejudge-plan/list
 */
export function listRejudgePlans(
  request: RejudgePlanListQueryRequest,
): Promise<PageResult<ExamRejudgePlan>> {
  return http.post<PageResult<ExamRejudgePlan>>(
    '/api/exam/question-analysis/rejudge-plan/list',
    request,
  )
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

// ─── 整卷测量学质量 ─────────────────────────────────

/** 整卷质量分析 - 对应 ExamPaperAnalysisResponse */
export interface ExamPaperAnalysisResponse {
  examId: string
  classId?: string
  paperDifficultyIndex?: number
  paperDiscriminationIndex?: number
  cronbachAlpha?: number | null
  reliabilitySampleCount?: number
  snapshotTime?: string
}

/** 考后统计页主链 hint：从成绩分布到教学改进的治理顺序 */
export const EXAM_STATISTICS_FLOW_HINT = '成绩分布 → 题目质量 → 重判计划 → 错因聚类 → 教学改进'

/** 查询整卷难度、区分度与 Cronbach α */
export function getExamPaperAnalysis(params: {
  examId: string
  classId?: string
}): Promise<ExamPaperAnalysisResponse> {
  return http.post<ExamPaperAnalysisResponse>('/api/exam/question-analysis/paper/get', params)
}
