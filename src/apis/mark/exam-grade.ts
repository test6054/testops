import type { FinalScoreStatusCode } from './final-score-status'
import type { GradeStatusCode } from './grade-status'
import type { ObjectiveResultCode } from './objective-result'
import type { QuestionTypeCode } from './question-type'
import type { MarkAiReferenceExperienceAuditResponse } from '@/apis/mark/grading-experience-assist'
/**
 * 阅卷考试题目评分确认与 AI 复评 API - 对接 /api/mark/exams/question-grades/*。
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { AiProviderTypeCode } from '@/types/enums/ai-provider-type-enum'
import http from '@/config/axios'
import { AiAbilityCode, ALL_AI_ABILITY_CODES } from '@/types/enums/ai-ability-enum'
import { AiExecutionStatusCode, ALL_AI_EXECUTION_STATUS_CODES } from '@/types/enums/ai-execution-status-enum'
import { ALL_AI_PROVIDER_TYPE_CODES } from '@/types/enums/ai-provider-type-enum'

/** 题目成绩确认请求 - 对应 ExamGradeConfirmRequest */
export interface ExamGradeConfirmRequest {
  examId: string
  /** 题目批改结果ID */
  gradeResultId: string
  /** 教师复核评分（必填） */
  teacherReviewScore: number
  commentText?: string
  annotationText?: string
  /** 主考接管他人 IN_PROGRESS 复核任务时的强制审计原因 */
  ownerOverrideReason?: string
  /** 卷级成绩撤回后重新确认已确认题分时必填的改分原因 */
  rescoreReason?: string
}

/** 试卷题目得分明细 - 对应 ExamQuestionScoreDto */
export interface ExamQuestionScoreResponse {
  /** 题目批改结果ID；无活跃题分时为空 */
  gradeResultId?: string
  layoutQuestionId: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
  teacherReviewScore?: number
  gradeStatus?: GradeStatusCode
  objectiveResult?: ObjectiveResultCode
  improvementSuggestion?: string
  mistakeClusterLabel?: string
}

/** 试卷成绩明细响应 - 对应 ExamPaperScoreResponse */
export interface ExamPaperScoreResponse {
  examId: string
  paperInstanceId: string
  candidateRosterId: string
  studentUserId: string
  studentNo: string
  studentName: string
  /** 正式卷面分；CALCULATED 不返回 */
  examScore?: number
  dailyScore?: number
  /** 正式总分；CALCULATED 不返回 */
  totalScore?: number
  /** AI 预估卷面分（非正式） */
  estimatedExamScore?: number
  /** AI 预估总分（非正式） */
  estimatedTotalScore?: number
  finalScoreStatus: FinalScoreStatusCode
  /** 题目教师复核评分之和；总分更正后可能与 examScore 不同 */
  questionScoreSum?: number
  /** 题分之和是否等于正式考试分 */
  questionScoreSumMatchesExamScore?: boolean
  /** 最近一次已执行更正是否为总分更正；true 时官方卷面分以 examScore/totalScore 为准 */
  latestTotalScoreCorrectionApplied?: boolean
  questions?: ExamQuestionScoreResponse[]
}

/** 题目成绩驳回请求 - 对应 ExamGradeRejectRequest */
export interface ExamGradeRejectRequest {
  examId: string
  gradeResultId: string
  rejectReason: string
  /** 主考代办审计原因；接管他人 IN_PROGRESS 时必填 */
  ownerOverrideReason?: string
}

/** 题目成绩批量确认条目 - 对应 ExamGradeBatchConfirmRequest.Item */
export interface ExamGradeBatchConfirmItem {
  /** 题目批改结果ID */
  gradeResultId: string
  /** 教师复核评分（必填） */
  teacherReviewScore: number
  /** 评语，可空 */
  commentText?: string
  /** 批注内容，可空 */
  annotationText?: string
  /** 卷级成绩撤回后重新确认已确认题分时必填的改分原因 */
  rescoreReason?: string
}

/** 题目成绩批量确认请求 - 对应 ExamGradeBatchConfirmRequest */
export interface ExamGradeBatchConfirmRequest {
  examId: string
  items: ExamGradeBatchConfirmItem[]
}

/** 题目成绩批量确认失败明细 - 对应 ExamGradeBatchConfirmResponse.FailureItem */
export interface ExamGradeBatchConfirmFailureItem {
  gradeResultId: string
  /** 失败业务码（来自 ResultCodeEnum） */
  code: number
  /** 失败业务消息 */
  message: string
}

/** 题目成绩批量确认响应 - 对应 ExamGradeBatchConfirmResponse */
export interface ExamGradeBatchConfirmResponse {
  totalCount: number
  successCount: number
  failureCount: number
  successGradeResultIds: string[]
  failures: ExamGradeBatchConfirmFailureItem[]
}

/** 单题 AI 复评请求 - 对应 ExamQuestionAiRescoreRequest */
export interface ExamQuestionAiRescoreRequest {
  examId: string
  gradeResultId: string
}

import type { SubjectiveAiRiskCode } from '@/types/enums/subjective-ai-risk-code-enum'

export interface SubjectiveAiRiskFlag {
  code?: SubjectiveAiRiskCode
  message?: string
}

export {
  AiAbilityCode,
  AiAbilityDescription,
  ALL_AI_ABILITY_CODES,
} from '@/types/enums/ai-ability-enum'

export {
  AiExecutionStatusCode,
  AiExecutionStatusDescription,
  ALL_AI_EXECUTION_STATUS_CODES,
} from '@/types/enums/ai-execution-status-enum'

export {
  AiProviderTypeCode,
  AiProviderTypeDescription,
  ALL_AI_PROVIDER_TYPE_CODES,
} from '@/types/enums/ai-provider-type-enum'

/** AI 能力编码 -> 来源徽标色调 */
export const AI_ABILITY_TONE: Record<AiAbilityCode, BadgeTone> = {
  [AiAbilityCode.SUBJECTIVE_GRADE_SUGGESTION]: 'purple',
  [AiAbilityCode.PAPER_GRADE_SUGGESTION]: 'blue',
  [AiAbilityCode.TEACHING_IMPROVEMENT]: 'green',
  [AiAbilityCode.CLASS_WEAKNESS_ANALYSIS]: 'orange',
  [AiAbilityCode.ERROR_CAUSE_CLUSTER]: 'red',
  [AiAbilityCode.EXPERIENCE_EXTRACTION]: 'blue',
  [AiAbilityCode.ANSWER_CLUSTER]: 'purple',
  [AiAbilityCode.CROSS_EXAM_TREND]: 'blue',
  [AiAbilityCode.ABILITY_GROWTH]: 'green',
  [AiAbilityCode.COURSE_ACHIEVEMENT]: 'green',
  [AiAbilityCode.SCHOOL_QUALITY]: 'blue',
  [AiAbilityCode.EXPERIENCE_EFFECTIVENESS]: 'orange',
  [AiAbilityCode.STUDENT_LEARNING_PROFILE]: 'purple',
  [AiAbilityCode.DIRECT_SCAN_LAYOUT_VISION]: 'orange',
}

/** AI 执行状态徽标色调 */
export const AI_EXECUTION_STATUS_TONE: Record<AiExecutionStatusCode, BadgeTone> = {
  [AiExecutionStatusCode.SUCCESS]: 'green',
  [AiExecutionStatusCode.BLOCKED]: 'orange',
  [AiExecutionStatusCode.FAILED]: 'red',
}

/** 单题 AI 复评结果 - 对应后端 SubjectiveGradeSuggestionResult 合同 */
export interface SubjectiveGradeSuggestionResult {
  scored?: boolean
  aiScore?: number
  modelProfileId?: string
  providerType?: AiProviderTypeCode
  modelName?: string
  diagnostic?: string
  evidenceSummary?: string
  traceId?: string
  limited?: boolean
  riskFlags?: SubjectiveAiRiskFlag[]
  referenceExperienceCaseId?: string
  referenceExperienceEvalId?: string
  referenceBindingId?: string
  referenceExperienceAudit?: MarkAiReferenceExperienceAuditResponse
}

/** 单题历次 AI 执行查询请求 - 对应 ExamQuestionAiExecutionsRequest */
export interface ExamQuestionAiExecutionsRequest {
  examId: string
  gradeResultId: string
}

export interface ExamQuestionAiExecutionItemResponse {
  traceId: string
  abilityCode: AiAbilityCode
  status: AiExecutionStatusCode
  providerType?: AiProviderTypeCode
  modelName?: string
  requestSummary?: string
  responseSummary?: string
  diagnostic?: string
  latencyMs: number
  createTime: string
  createUser: string
  referenceExperienceAudit?: MarkAiReferenceExperienceAuditResponse
}

/** 教师确认题目得分。 */
export async function confirmQuestionGrade(request: ExamGradeConfirmRequest): Promise<boolean> {
  const response = await http.post<boolean>('/api/mark/exams/question-grades/confirm', request)
  if (response !== true) {
    throw new TypeError('题目成绩确认回执异常：服务端未确认写入成功')
  }
  return response
}

/** 教师驳回题目复核。 */
export async function rejectQuestionGrade(request: ExamGradeRejectRequest): Promise<boolean> {
  const response = await http.post<boolean>('/api/mark/exams/question-grades/reject', request)
  if (response !== true) {
    throw new TypeError('题目成绩驳回回执异常：服务端未确认写入成功')
  }
  return response
}

/** 批量确认题目得分，并校验成功/失败回执与请求条目严格一一对应。 */
export async function batchConfirmQuestionGrades(
  request: ExamGradeBatchConfirmRequest,
): Promise<ExamGradeBatchConfirmResponse> {
  const requestIds = request.items.map((item) => item.gradeResultId)
  if (
    requestIds.length === 0
    || new Set(requestIds).size !== requestIds.length
    || request.items.some((item) =>
      !item.gradeResultId || !Number.isFinite(item.teacherReviewScore) || item.teacherReviewScore < 0)
  ) {
    throw new TypeError('题目成绩批量确认请求异常：条目为空、重复或得分不可用')
  }
  const response = await http.post<ExamGradeBatchConfirmResponse>(
    '/api/mark/exams/question-grades/batch-confirm',
    request,
  )
  if (!Array.isArray(response.successGradeResultIds) || !Array.isArray(response.failures)) {
    throw new TypeError('题目成绩批量确认回执异常：成功或失败条目缺失')
  }
  const successIds = response.successGradeResultIds
  const failures = response.failures
  const failureIds = failures.map((item) => item.gradeResultId)
  const settledIds = [...successIds, ...failureIds]
  if (
    !Number.isInteger(response.totalCount)
    || response.totalCount !== requestIds.length
    || !Number.isInteger(response.successCount)
    || response.successCount !== successIds.length
    || !Number.isInteger(response.failureCount)
    || response.failureCount !== failures.length
    || response.successCount + response.failureCount !== response.totalCount
    || new Set(settledIds).size !== settledIds.length
    || settledIds.length !== requestIds.length
    || settledIds.some((id) => !requestIds.includes(id))
    || requestIds.some((id) => !settledIds.includes(id))
    || failures.some((item) =>
      !item.gradeResultId
      || !Number.isInteger(item.code)
      || !item.message?.trim())
  ) {
    throw new TypeError('题目成绩批量确认回执异常：请求与成功/失败条目无法对应')
  }
  return response
}

/** 教师异议场景单题 AI 复评，最终成绩仍由 confirmQuestionGrade 写入。 */
export async function rescoreQuestionByAi(
  request: ExamQuestionAiRescoreRequest,
): Promise<SubjectiveGradeSuggestionResult> {
  const response = await http.post<SubjectiveGradeSuggestionResult>(
    '/api/mark/exams/question-grades/ai-rescore',
    request,
  )
  if (
    typeof response.scored !== 'boolean'
    || typeof response.limited !== 'boolean'
    || (response.providerType != null && !ALL_AI_PROVIDER_TYPE_CODES.includes(response.providerType))
    || (response.scored
      ? typeof response.aiScore !== 'number'
      || !Number.isFinite(response.aiScore)
      || response.aiScore < 0
      || !response.traceId?.trim()
      : !response.diagnostic?.trim())
  ) {
    throw new TypeError('单题智能复评合同异常：评分状态、追踪标识或诊断不可用')
  }
  return response
}

/** 查询单题历次 AI 执行记录，仅暴露审计真源，不引入版本化读取。 */
export async function listAiExecutionsForQuestion(
  request: ExamQuestionAiExecutionsRequest,
): Promise<ExamQuestionAiExecutionItemResponse[]> {
  const response = await http.post<ExamQuestionAiExecutionItemResponse[]>(
    '/api/mark/exams/question-grades/ai-executions',
    request,
  )
  if (!Array.isArray(response)) {
    throw new TypeError('单题智能执行历史合同异常：历史集合缺失')
  }
  const traceIds = new Set<string>()
  for (const item of response) {
    if (
      !item.traceId?.trim()
      || traceIds.has(item.traceId)
      || !ALL_AI_ABILITY_CODES.includes(item.abilityCode)
      || !ALL_AI_EXECUTION_STATUS_CODES.includes(item.status)
      || (item.providerType != null && !ALL_AI_PROVIDER_TYPE_CODES.includes(item.providerType))
      || !Number.isFinite(item.latencyMs)
      || item.latencyMs < 0
      || !item.createTime?.trim()
      || !item.createUser
    ) {
      throw new TypeError('单题智能执行历史合同异常：执行身份、状态或审计字段不可用')
    }
    traceIds.add(item.traceId)
  }
  return response
}

export interface ExamPaperScoreQueryRequest {
  examId: string
  paperInstanceId: string
}

/** 查询试卷当前成绩明细。 */
export function getPaperScore(request: ExamPaperScoreQueryRequest): Promise<ExamPaperScoreResponse> {
  return http.post<ExamPaperScoreResponse>('/api/mark/exams/paper-score', request)
}
