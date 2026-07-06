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
import { AiAbilityCode } from '@/types/enums/ai-ability-enum'
import { AiExecutionStatusCode } from '@/types/enums/ai-execution-status-enum'

/** 题目成绩确认请求 - 对应 ExamGradeConfirmRequest */
export interface ExamGradeConfirmRequest {
  examId: string
  /** 题目批改结果ID */
  gradeResultId: string
  /** 教师复核评分（必填） */
  teacherReviewScore: number
  commentText?: string
  annotationText?: string
}

/** 试卷题目得分明细 - 对应 ExamQuestionScoreDto */
export interface ExamQuestionScoreResponse {
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
  examScore?: number
  dailyScore?: number
  totalScore?: number
  finalScoreStatus: FinalScoreStatusCode
  questions?: ExamQuestionScoreResponse[]
}

/** 题目成绩驳回请求 - 对应 ExamGradeRejectRequest */
export interface ExamGradeRejectRequest {
  examId: string
  gradeResultId: string
  rejectReason: string
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

/** AI 风险标记 - 对应 SubjectiveAiRiskFlag */
export interface SubjectiveAiRiskFlag {
  code?: string
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
  [AiAbilityCode.PAPER_GRADE_SUGGESTION]: 'blue',
  [AiAbilityCode.SUBJECTIVE_GRADE_SUGGESTION]: 'purple',
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
export function confirmQuestionGrade(request: ExamGradeConfirmRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/question-grades/confirm', request)
}

/** 教师驳回题目复核。 */
export function rejectQuestionGrade(request: ExamGradeRejectRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/question-grades/reject', request)
}

/** 教师批量确认题目得分，单题失败不阻塞其余条目。 */
export function batchConfirmQuestionGrades(
  request: ExamGradeBatchConfirmRequest,
): Promise<ExamGradeBatchConfirmResponse> {
  return http.post<ExamGradeBatchConfirmResponse>(
    '/api/mark/exams/question-grades/batch-confirm',
    request,
  )
}

/** 教师异议场景单题 AI 复评，最终成绩仍由 confirmQuestionGrade 写入。 */
export function rescoreQuestionByAi(
  request: ExamQuestionAiRescoreRequest,
): Promise<SubjectiveGradeSuggestionResult> {
  return http.post<SubjectiveGradeSuggestionResult>(
    '/api/mark/exams/question-grades/ai-rescore',
    request,
  )
}

/** 查询单题历次 AI 执行记录，仅暴露审计真源，不引入版本化读取。 */
export function listAiExecutionsForQuestion(
  request: ExamQuestionAiExecutionsRequest,
): Promise<ExamQuestionAiExecutionItemResponse[]> {
  return http.post<ExamQuestionAiExecutionItemResponse[]>(
    '/api/mark/exams/question-grades/ai-executions',
    request,
  )
}

export interface ExamPaperScoreQueryRequest {
  examId: string
  paperInstanceId: string
}

/** 查询试卷当前成绩明细。 */
export function getPaperScore(request: ExamPaperScoreQueryRequest): Promise<ExamPaperScoreResponse> {
  return http.post<ExamPaperScoreResponse>('/api/mark/exams/paper-score', request)
}
